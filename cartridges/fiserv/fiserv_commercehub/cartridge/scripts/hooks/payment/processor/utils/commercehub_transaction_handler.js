'use strict';

const fiservConstants = require('*/cartridge/fiservConstants/constants');
const fiservLogs = require("*/cartridge/scripts/utils/commercehubLogs");


function handleTransaction(orderNo, paymentInstrument, paymentProcessor, paymentMethodModel)
{
    const OrderMgr = require('dw/order/OrderMgr');
    const Transaction = require('dw/system/Transaction');

    const fiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");
    const fiservHelper = require('*/cartridge/scripts/utils/fiservHelpers/primaryHelper');

    let order = OrderMgr.getOrder(orderNo);
    let totalCovered = order.totalGrossPrice.value;
    order.paymentInstruments.toArray().forEach((pi) =>
    {
        totalCovered -= pi.paymentTransaction.amount.value;
    });

    // Need to change paymentCovered later to account for currency precision
    if (Number(Math.abs(totalCovered)).toFixed(2) !== Number(0).toFixed(2))
    {
        fiservLogs.logError(2, 'Detected a mismatch between the requested payment amount and cart total. Aborting transaction flow', orderNo);
        if(fiservConfig.getCommerceHubGiftEnabled())
        {
            rollbackGiftCards(order, orderNo);
        }
        return {
            authorized: false,
            fieldErrors: [],
            serverErrors: ["Mismatched payment amount and order total"],
            error: true
        };
    }

    Transaction.wrap(function ()
    {
        paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;

        let _type = paymentMethodModel.getCommercehubPaymentType();
        paymentInstrument.paymentTransaction.custom.paymentAction = _type;

        if (_type !== null)
        {
            const PaymentTransaction = require('dw/order/PaymentTransaction');
            let paymentType = _type.toString() === fiservConstants.COMMERCEHUB_AUTH_ACTION ? PaymentTransaction.TYPE_AUTH : PaymentTransaction.TYPE_CAPTURE;
            paymentInstrument.paymentTransaction.setType(paymentType);
        }
    });
    Transaction.begin();

    let res = paymentMethodModel.executeCommercehubTransaction(orderNo, paymentInstrument);

    if (res.error)
    {
        Transaction.rollback();
        if(fiservConfig.getCommerceHubGiftEnabled())
        {
            rollbackGiftCards(order, orderNo);
        }
        return {
            authorized: false,
            fieldErrors: [],
            serverErrors: [res.error.message],
            error: true
        };
    }

    let transactionId = fiservHelper.secureTraversal(res, fiservConstants.RESPONSE_PATHS.TRANSACTION_ID);
    if (transactionId)
    {
        paymentInstrument.paymentTransaction.transactionID = transactionId;
    }

    paymentMethodModel.associateDataPostTransaction(res, paymentInstrument);


    Transaction.commit();
    let transactionState = fiservHelper.secureTraversal(res, fiservConstants.RESPONSE_PATHS.TRANSACTION_STATE)
    let processorString = paymentMethodModel.getProcessorString(paymentInstrument);
    if(transactionState === fiservConstants.TXN_STATES.AUTHORIZED)
    {
        fiservLogs.logInfo(1, processorString + ' Auth Transaction Successful', orderNo);
    }
    else if(transactionState === fiservConstants.TXN_STATES.CAPTURED)
    {
        fiservLogs.logInfo(1, processorString + ' Sale Transaction Successful', orderNo);
    }
    fiservLogs.logInfo(1, 'Transaction ID: ' + transactionId, orderNo);
    return { authorized: true, error: false };
}

function rollbackGiftCards(order, orderNo)
{
    const fiservRequestBuilder = require('*/cartridge/scripts/requests/request_builder');
    const fiservServices = require('*/cartridge/scripts/utils/commercehubServices');

    fiservLogs.logError(2, 'An error occurred during payment processing. Checking for gift card transactions to reverse', orderNo);

    let giftFound = 0;
    let giftReversed = 0;
    order.paymentInstruments.toArray().forEach((pi) =>
    {
        if(pi.paymentMethod === fiservConstants.PAYMENT_METHOD_LIST.COMMERCEHUB_GIFT_PAYMENT_METHOD && pi.paymentTransaction.transactionID)
        {
            giftFound++;
            let transactionId = pi.paymentTransaction.transactionID;
            let cancelPayload = fiservRequestBuilder.buildCancelPayload(orderNo, transactionId);
            let cancelService = fiservServices.getService('CommercehubCancel', orderNo);
            try
            {
                fiservServices.callService(cancelService, cancelPayload, orderNo);
                giftReversed++;
            }
            catch(e)
            {
                fiservLogs.logError(2, 'Failed to reverse gift transaction with Transaction ID: ' + transactionId, orderNo);
            }
        }
    });

    if(giftFound !== 0)
    {
        if(giftReversed !== 0)
        {
            fiservLogs.logError(2, 'Successfully reversed ' + giftReversed + ' gift transaction(s)', orderNo);
        }
        if(giftReversed !== giftFound)
        {
            fiservLogs.logError(2, 'Failed to reverse ' + (giftFound - giftReversed) + ' gift transaction(s)', orderNo);
        }
    }
    else
    {
        fiservLogs.logError(2, 'No gift transactions applied. Continuing...', orderNo);
    }
}

module.exports = 
{
    handleTransaction : handleTransaction
};