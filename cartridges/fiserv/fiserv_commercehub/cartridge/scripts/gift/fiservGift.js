'use strict';

const BasketMgr = require('dw/order/BasketMgr');
const Resource = require('dw/web/Resource');
const Transaction = require('dw/system/Transaction');

const fiservConstants = require('*/cartridge/fiservConstants/constants');
const fiservGiftHelper = require('*/cartridge/scripts/utils/fiservHelpers/giftHelper');
const fiservLogs = require("*/cartridge/scripts/utils/commercehubLogs");


function executeBalanceInquiry(sessionId) 
{
    try
    {
        const fiservHelper = require('*/cartridge/scripts/utils/fiservHelpers/primaryHelper');
        const fiservRequestBuilder = require('*/cartridge/scripts/requests/request_builder');
        const fiservServices = require('*/cartridge/scripts/utils/commercehubServices');

        let basket = BasketMgr.getCurrentBasket();
        if(!basket)
        {
            return { error: Resource.msg('message.error.gift.genericBalance', 'error', null) };
        }

        let currencyCode = basket.getCurrencyCode();
        let balanceInquiryRequest = fiservRequestBuilder.buildBalanceInquiryRequest(sessionId, currencyCode);

        let balanceInquiryService = fiservServices.getService('CommercehubBalanceInquiry');
        let parsedResponse = fiservServices.callService(balanceInquiryService, balanceInquiryRequest);

        if(fiservHelper.secureTraversal(parsedResponse, fiservConstants.RESPONSE_PATHS.TRANSACTION_STATE) === 'CHECKED')
        {
            var balanceList = fiservHelper.secureTraversal(parsedResponse, fiservConstants.RESPONSE_PATHS.GIFT_BALANCES);
            fiservLogs.logInfo(1, 'Balance Inquiry Success');
            for(let i = 0; i < balanceList.length; i++)
            {
                if(balanceList[i].currency == currencyCode)
                {
                    var balanceObject = balanceList[i];
                    // Need to account for currency precision
                    balanceObject['remainingBalance'] = Number((balanceObject.beginningBalance - balanceObject.lockAmount).toFixed(2));
                    return balanceObject;
                }
            }
            return { error: Resource.msg('message.error.gift.currencyError', 'error', null) };
        }
        else
        {
            throw new Error();
        }

    } catch (e) {
        fiservLogs.logError(2, 'Error executing balance inquiry');

        const fiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");
        if(fiservConfig.getCommerceHubGiftSecurityEnabled())
            return { error: Resource.msg('message.error.gift.invalidCredentialsAll', 'error', null) };
        else
            return { error: Resource.msg('message.error.gift.invalidCredentialsCard', 'error', null) };
    }
}

function applyGiftCard(balanceObject, sessionId)
{
    let basket = BasketMgr.getCurrentBasket();
    if(!basket)
    {
        return { error: Resource.msg('message.error.gift.genericApply', 'error', null) };
    }

    let UUID;
    let paymentAmount;
    let balance = balanceObject.remainingBalance;
    let amountRemaining;
    let paymentCovered = false;
    try {
        Transaction.wrap(function () {
            let chargeAmountResponse = getGiftCardChargeAmount(basket, balance);
            paymentAmount = chargeAmountResponse.paymentAmount;
            amountRemaining = chargeAmountResponse.amountRemaining;

            if(paymentAmount === 0)
            {
                throw new Error(Resource.msg('message.error.gift.priceCovered', 'error', null));
            }
            else if(paymentAmount !== balance)
            {
                paymentCovered = true;
            }

            let paymentInstrument = basket.createPaymentInstrument(fiservConstants.PAYMENT_METHOD_LIST.COMMERCEHUB_GIFT_PAYMENT_METHOD, new dw.value.Money(paymentAmount, 'USD'));
            paymentInstrument.custom.balance = balance;
            paymentInstrument.paymentTransaction.custom.commercehubSessionId = sessionId;
            UUID = paymentInstrument.UUID;
        });
    } catch (e) {
        return { error: e.message };
    }

    // If payment has been covered by gift cards, remove all payment methods except gift cards
    Transaction.wrap(function () {
        let paymentInstruments = basket.paymentInstruments;
        paymentInstruments.toArray().forEach((pi) => {
            if(pi.paymentMethod !== fiservConstants.PAYMENT_METHOD_LIST.COMMERCEHUB_GIFT_PAYMENT_METHOD)
            {
                basket.removePaymentInstrument(pi);
            }
        });
    });

    // Need to account for currency precision and symbol
    return {
        balance: Number(balance).toFixed(2),
        paymentAmount: Number(paymentAmount).toFixed(2),
        currencySymbol: '$',
        amountRemaining: amountRemaining,
        uuid: UUID,
        paymentCovered: paymentCovered,
        successMessage: Resource.msg('message.success.gift.applied', 'success', null)
    };
}

function removeGiftCard(uuid)
{
    let basket = BasketMgr.getCurrentBasket();
    if(!basket)
    {
        return { error: Resource.msg('message.error.gift.genericRemove', 'error', null) };
    }

    let paymentInstruments = basket.paymentInstruments;
    for(let i = 0; i < paymentInstruments.length; i++)
    {
        if(paymentInstruments[i].UUID === uuid)
        {
            let updatedGiftCards;
            Transaction.wrap(function () {
                basket.removePaymentInstrument(paymentInstruments[i]);
                updatedGiftCards = fiservGiftHelper.recalculateGiftCardAmounts(basket);
            });
            updatedGiftCards['successMessage'] = Resource.msg('message.success.gift.removed', 'success', null);
            return updatedGiftCards;
        }
    }

    return { error: Resource.msg('message.error.gift.notFound', 'error', null) };
}

function recalculateGiftCards()
{
    let basket = BasketMgr.getCurrentBasket();
    if(!basket)
    {
        return { error: Resource.msg('message.error.gift.genericUpdate', 'error', null) };
    }

    let updatedGiftCards;
    Transaction.wrap(function () {
        updatedGiftCards = fiservGiftHelper.recalculateGiftCardAmounts(basket);
    });
    return updatedGiftCards;
}

function getGiftCardChargeAmount(basket, balance)
{
    let grossTotal = basket.totalGrossPrice;
    let amountConvered = 0;
    basket.paymentInstruments.toArray().forEach((pi) => {
        if(pi.paymentMethod === fiservConstants.PAYMENT_METHOD_LIST.COMMERCEHUB_GIFT_PAYMENT_METHOD)
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

module.exports = 
{
    executeBalanceInquiry: executeBalanceInquiry,
    applyGiftCard: applyGiftCard,
    removeGiftCard: removeGiftCard,
    recalculateGiftCards: recalculateGiftCards
};