let Resource = require('dw/web/Resource');
let FiservLogs = require("*/cartridge/scripts/utils/commercehubLogs");
let requestBuilder = require('*/cartridge/scripts/requests/request_builder');
let FiservServices = require('*/cartridge/scripts/utils/commercehubServices');
let FiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");
let constants = require('*/cartridge/fiservConstants/constants');
let FiservHelper = require('*/cartridge/scripts/utils/fiservHelper');
let BasketMgr = require('dw/order/BasketMgr');
let Transaction = require('dw/system/Transaction');

function executeBalanceInquiry(sessionId) 
{
    try
    {
        let balanceInquiryRequest = requestBuilder.buildBalanceInquiryRequest(sessionId);

        let balanceInquiryService = FiservServices.getService('CommercehubBalanceInquiry');
        let parsedResponse = FiservServices.callService(balanceInquiryService, balanceInquiryRequest);

        if(FiservHelper.secureTraversal(parsedResponse, constants.RESPONSE_PATHS.TRANSACTION_STATE) === 'CHECKED')
        {
            let balanceList = FiservHelper.secureTraversal(parsedResponse, constants.RESPONSE_PATHS.GIFT_BALANCES);
            FiservLogs.logInfo(1, 'Balance Inquiry Success');
            return balanceList[0];
        }
        else
        {
            throw new Error();
        }

    } catch (e) {
        FiservLogs.logError(2, 'Error executing balance inquiry');
        if(FiservConfig.getCommerceHubGiftSecurityEnabled())
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
    let balance = balanceObject.endingBalance;
    let amountRemaining;
    let paymentCovered = false;
    try {
        Transaction.wrap(function () {
            let chargeAmountResponse = FiservHelper.getGiftCardChargeAmount(basket, balance);
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

            let paymentInstrument = basket.createPaymentInstrument(constants.COMMERCEHUB_GIFT_PAYMENT_METHOD, new dw.value.Money(paymentAmount, 'USD'));
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
            if(pi.paymentMethod !== constants.COMMERCEHUB_GIFT_PAYMENT_METHOD)
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
                updatedGiftCards = FiservHelper.recalculateGiftCardAmounts(basket);
            });
            updatedGiftCards['successMessage'] = Resource.msg('message.success.gift.removed', 'success', null);
            return updatedGiftCards;
        }
    }

    return { error: Resource.msg('message.error.gift.notFound', 'error', null) };
}

module.exports = 
{
    executeBalanceInquiry: executeBalanceInquiry,
    applyGiftCard: applyGiftCard,
    removeGiftCard: removeGiftCard
};