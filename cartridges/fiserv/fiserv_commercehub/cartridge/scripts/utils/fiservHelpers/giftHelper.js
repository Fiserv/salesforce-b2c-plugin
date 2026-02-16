'use strict';

const fiservConstants = require('*/cartridge/fiservConstants/constants');


function retrieveAppliedGiftCards()
{
    const BasketMgr = require('dw/order/BasketMgr');

    let basket = BasketMgr.getCurrentBasket();
    if(!basket)
    {
        throw new Error('Basket unavailable');
    }

    let giftCardList = [];
    let leftoverTotal = basket.totalGrossPrice.value;
    let paymentInstruments = basket.paymentInstruments;
    paymentInstruments.toArray().forEach((pi) => {
        if(pi.paymentMethod === fiservConstants.PAYMENT_METHOD_LIST.COMMERCEHUB_GIFT_PAYMENT_METHOD)
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

function recalculateGiftCardAmounts(basket)
{
    let grossTotal = basket.totalGrossPrice;
    let updatedGiftCards = [];
    basket.paymentInstruments.toArray().forEach((pi) => {
        if(pi.paymentMethod === fiservConstants.PAYMENT_METHOD_LIST.COMMERCEHUB_GIFT_PAYMENT_METHOD)
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
                let paymentInstrument = basket.createPaymentInstrument(fiservConstants.PAYMENT_METHOD_LIST.COMMERCEHUB_GIFT_PAYMENT_METHOD, new dw.value.Money(paymentAmount, 'USD'));
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
    const fiservConfig = require('*/cartridge/scripts/utils/commercehubConfig');

    let paymentAmount = currentBasket.totalGrossPrice.value;
    if(fiservConfig.getCommerceHubGiftEnabled())
    {
        currentBasket.paymentInstruments.toArray().forEach((pi) => {
            if(pi.paymentMethod === fiservConstants.PAYMENT_METHOD_LIST.COMMERCEHUB_GIFT_PAYMENT_METHOD)
            {
                paymentAmount -= pi.paymentTransaction.amount.value;
            }
        });
    }

    return paymentAmount;
}

module.exports =
{
    retrieveAppliedGiftCards : retrieveAppliedGiftCards,
    recalculateGiftCardAmounts : recalculateGiftCardAmounts,
    retreiveNonGiftChargeAmount : retreiveNonGiftChargeAmount,
    correctGrandTotalResponseIncludingGiftCards : correctGrandTotalResponseIncludingGiftCards,
}