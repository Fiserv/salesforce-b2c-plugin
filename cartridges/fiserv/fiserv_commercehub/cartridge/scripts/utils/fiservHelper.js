"use strict"

let commercehubConfig = require('*/cartridge/scripts/utils/commercehubConfig');
let constants = require('*/cartridge/fiservConstants/constants');
let PaymentMgr = require('dw/order/PaymentMgr');
let BasketMgr = require('dw/order/BasketMgr');

function validSessionId(sessionId)
{
    let guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    return typeof(sessionId) !== "undefined" &&
        sessionId.match(guidRegex)
}

function getCommercehubSDK()
{
    return constants.COMMERCEHUB_SDK_URL;
}

function getB2cCardType(cardType) {
    switch (cardType.value.toLowerCase()) {
        case 'visa':
            return 'Visa';
        case 'mastercard':
        case 'master card':
            return 'Master Card';
        case 'amex':
            return 'Amex';
        case 'maestro':
        case 'maestrouk':
            return 'Maestro';
        case 'diners':
        case 'jcb':
        case 'union':
        case 'discover':
            return 'Discover';
    }

    throw new Error('Unable to determine Salesforce B2C card type for: '.concat(cardType));
}

function retrieveAppliedGiftCards()
{
    let basket = BasketMgr.getCurrentBasket();
    if(!basket)
    {
        throw new Error('Basket unavailable');
    }

    let giftCardList = [];
    var leftoverTotal = basket.totalGrossPrice.value;
    let paymentInstruments = basket.paymentInstruments;
    paymentInstruments.toArray().forEach((pi) => {
        if(pi.paymentMethod === constants.COMMERCEHUB_GIFT_PAYMENT_METHOD)
        {
            let paymentAmount = pi.paymentTransaction.amount.value;
            // Need to account for currency precision and symbol
            giftCardList.push({
                balance: Number(pi.custom.balance).toFixed(2),
                paymentAmount: Number(paymentAmount).toFixed(2),
                currencySymbol: '$',
                uuid: pi.UUID
            });
            leftoverTotal -= paymentAmount;
        }
    });

    // Need to change paymentCovered later to account for currency precision
    return {
        giftCardList: giftCardList,
        amountRemaining: Number(Math.abs(leftoverTotal)).toFixed(2),
        paymentCovered: Number(Math.abs(leftoverTotal)).toFixed(2) === Number(0).toFixed(2)
    };
}

function getGiftCardChargeAmount(basket, balance)
{
    let grossTotal = basket.totalGrossPrice;
    let amountConvered = 0;
    basket.paymentInstruments.toArray().forEach((pi) => {
        if(pi.paymentMethod === constants.COMMERCEHUB_GIFT_PAYMENT_METHOD)
        {
            let paymentAmount = pi.paymentTransaction.amount.value;
            grossTotal -= paymentAmount;
            amountConvered += paymentAmount;
        }
    })

    // Will need to update later to abide by currency precisions
    return {
        paymentAmount: Number(Math.max(0, Math.min(grossTotal, balance)).toFixed(2)),
        amountConvered: Number(amountConvered + Math.min(grossTotal, balance)).toFixed(2),
        amountRemaining: Number(grossTotal - Math.min(grossTotal, balance)).toFixed(2)
    };
}

function recalculateGiftCardAmounts(basket)
{
    let grossTotal = basket.totalGrossPrice;
    let updatedGiftCards = [];
    basket.paymentInstruments.toArray().forEach((pi) => {
        if(pi.paymentMethod === constants.COMMERCEHUB_GIFT_PAYMENT_METHOD)
        {
            if(grossTotal <= 0.00001)
            {
                basket.removePaymentInstrument(pi);
                updatedGiftCards.push({
                    oldUuid: pi.UUID
                })
            }
            else if(pi.paymentTransaction.amount.value < pi.custom.balance || pi.paymentTransaction.amount.value > grossTotal)
            {
                let balance = pi.custom.balance;
                let sessionId = pi.paymentTransaction.custom.commercehubSessionId;
                let oldUuid = pi.UUID;
                basket.removePaymentInstrument(pi);

                let paymentAmount = grossTotal > balance ? balance : Number(grossTotal).toFixed(2);
                let paymentInstrument = basket.createPaymentInstrument(constants.COMMERCEHUB_GIFT_PAYMENT_METHOD, new dw.value.Money(paymentAmount, 'USD'));
                paymentInstrument.custom.balance = balance;
                paymentInstrument.paymentTransaction.custom.commercehubSessionId = sessionId;

                grossTotal -= paymentAmount;
                // Need to account for currency precision and symbol
                updatedGiftCards.push({
                    balance: Number(balance).toFixed(2),
                    paymentAmount: Number(paymentAmount).toFixed(2),
                    currencySymbol: '$',
                    uuid: paymentInstrument.UUID,
                    oldUuid: oldUuid
                })
            }
            else
            {
                grossTotal -= pi.paymentTransaction.amount.value;
            }
        }
    });

    // Need to account for currency precision and symbol
    return {
        updatedGiftCards: updatedGiftCards,
        currencySymbol: '$',
        amountRemaining: Number(Math.abs(grossTotal)).toFixed(2),
        paymentCovered: Number(Math.abs(grossTotal)).toFixed(2) === Number(0).toFixed(2)
    };
}

function correctGrandTotalResponseIncludingGiftCards(res)
{
    // Overwrite the grand total value returned to the frontend
    let appliedGiftCards = retrieveAppliedGiftCards();
    if(appliedGiftCards.giftCardList.length)
    {
        res.viewData.order.totals.grandTotal = appliedGiftCards.giftCardList[0].currencySymbol + appliedGiftCards.amountRemaining;
    }
}

function retreiveNonGiftChargeAmount(currentBasket) {
    let paymentAmount = currentBasket.totalGrossPrice.value;
    if(commercehubConfig.getCommerceHubGiftEnabled())
    {
        currentBasket.paymentInstruments.toArray().forEach((pi) => {
            if(pi.paymentMethod === constants.COMMERCEHUB_GIFT_PAYMENT_METHOD)
            {
                paymentAmount -= pi.paymentTransaction.amount.value;
            }
        });
    }

    return paymentAmount;
}

function removeGiftCardsFromCart(currentBasket) {
    currentBasket.paymentInstruments.toArray().forEach((pi) => {
        if(pi.paymentMethod === constants.COMMERCEHUB_GIFT_PAYMENT_METHOD)
        {
            currentBasket.removePaymentInstrument(pi);
        }
    });
}

function isCreditCardFiserv()
{
    let method = PaymentMgr.getPaymentMethod('CREDIT_CARD');
    
    if (method !== null && method.paymentProcessor !== null && method.paymentProcessor.ID == constants.PROCESSOR_ID_LIST.COMMERCEHUB_PROCESSOR)
    {
        return method.isActive();
    }

    return false;
}

function isApplePayFiserv()
{
    let method = PaymentMgr.getPaymentMethod('APPLEPAY');
    
    if (method !== null && method.paymentProcessor !== null && method.paymentProcessor.ID == constants.PROCESSOR_ID_LIST.COMMERCEHUB_APPLEPAY_PROCESSOR)
    {
        return method.isActive();
    }

    return false;
}

function secureTraversal(object, path)
{
    if(object == null)
        return null;
    for(let i in path)
    {
        object = object[path[i]];
        if(typeof(object) === "undefined")
            return null;
    }
    return object;
}

module.exports =
{
    getCommercehubSDK : getCommercehubSDK,
    getB2cCardType : getB2cCardType,
    retrieveAppliedGiftCards : retrieveAppliedGiftCards,
    getGiftCardChargeAmount : getGiftCardChargeAmount,
    recalculateGiftCardAmounts : recalculateGiftCardAmounts,
    retreiveNonGiftChargeAmount : retreiveNonGiftChargeAmount,
    correctGrandTotalResponseIncludingGiftCards : correctGrandTotalResponseIncludingGiftCards,
    removeGiftCardsFromCart : removeGiftCardsFromCart,
    validSessionId : validSessionId,
    isCreditCardFiserv : isCreditCardFiserv,
    isApplePayFiserv : isApplePayFiserv,
    secureTraversal : secureTraversal
}