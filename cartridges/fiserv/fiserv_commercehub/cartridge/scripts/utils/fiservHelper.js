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
            if(grossTotal > 0 && pi.paymentTransaction.amount.value < pi.custom.balance)
            {
                let balance = pi.custom.balance;
                let sessionId = pi.paymentTransaction.custom.commercehubSessionId;
                let oldUuid = pi.UUID;
                basket.removePaymentInstrument(pi);

                let chargeAmountResponse = getGiftCardChargeAmount(basket, balance);
                let paymentAmount = chargeAmountResponse.paymentAmount;
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
                grossTotal = pi.paymentTransaction.amount.value;
            }
        }
    });

    // Need to account for currency precision and symbol
    return {
        updatedGiftCards: updatedGiftCards,
        currencySymbol: '$',
        amountRemaining: Number(grossTotal).toFixed(2),
        paymentCovered: Number(Math.abs(grossTotal)).toFixed(2) === Number(0).toFixed(2)
    };
}

function isFiserv()
{
    let cc = PaymentMgr.getPaymentMethod('CREDIT_CARD');
    
    if (cc !== null && cc.paymentProcessor !== null && cc.paymentProcessor.ID == constants.COMMERCEHUB_PROCESSOR)
    {
        return cc.isActive();
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
    validSessionId : validSessionId,
    isFiserv : isFiserv,
    secureTraversal : secureTraversal
}