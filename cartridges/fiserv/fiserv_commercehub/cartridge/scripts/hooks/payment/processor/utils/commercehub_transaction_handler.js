
const PaymentTransaction = require('dw/order/PaymentTransaction');
let Transaction = require('dw/system/Transaction');
let OrderMgr = require('dw/order/OrderMgr');
let fiservCheckout = require('*/cartridge/scripts/checkout/fiservCheckout');
let fiservGiftCheckout = require('*/cartridge/scripts/checkout/fiservGiftCheckout');
let FiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");
let constants = require('*/cartridge/fiservConstants/constants');
const FiservLogs = require("*/cartridge/scripts/utils/commercehubLogs");
let fiservHelper = require('*/cartridge/scripts/utils/fiservHelper');
let requestBuilder = require('*/cartridge/scripts/requests/request_builder');
let FiservServices = require('*/cartridge/scripts/utils/commercehubServices');

function handleTransaction(orderNo, paymentInstrument, paymentProcessor)
{
    let order = OrderMgr.getOrder(orderNo);
    var totalCovered = order.totalGrossPrice.value;
    order.paymentInstruments.toArray().forEach((pi) => {
        totalCovered -= pi.paymentTransaction.amount.value;
    });

    // Need to change paymentCovered later to account for currency precision
    if (Number(Math.abs(totalCovered)).toFixed(2) !== Number(0).toFixed(2))
    {
        FiservLogs.logError(2, 'Detected a mismatch between the requested payment amount and cart total. Aborting transaction flow', orderNo);
        if(FiservConfig.getCommerceHubGiftEnabled())
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

    Transaction.wrap(function () {
        paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
        let _type = null;
        if(paymentProcessor.ID === constants.COMMERCEHUB_PROCESSOR)
        {
            _type = FiservConfig.getCommerceHubCreditPaymentType();
        }
        else if(paymentProcessor.ID === constants.COMMERCEHUB_GIFT_PROCESSOR)
        {
            _type = FiservConfig.getCommerceHubGiftPaymentType();
            paymentInstrument.paymentTransaction.custom.paymentAction = _type;
        }

        if (_type !== null)
        {
            let paymentType = _type.toString() === constants.COMMERCEHUB_AUTH_ACTION ? PaymentTransaction.TYPE_AUTH : PaymentTransaction.TYPE_CAPTURE;
            paymentInstrument.paymentTransaction.setType(paymentType);
        }
    });
    Transaction.begin();

    let res;
    if(paymentProcessor.ID === constants.COMMERCEHUB_PROCESSOR)
        res = fiservCheckout.executeCommercehubTransaction(orderNo, paymentInstrument);
    else
        res = fiservGiftCheckout.executeCommercehubGiftTransaction(orderNo, paymentInstrument);

    if (res.error)
    {
        Transaction.rollback();
        if(FiservConfig.getCommerceHubGiftEnabled())
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

    let transactionId = fiservHelper.secureTraversal(res, constants.RESPONSE_PATHS.TRANSACTION_ID);
    if (transactionId)
    {
        paymentInstrument.paymentTransaction.transactionID = transactionId;
    }

    if(paymentProcessor.ID !== constants.COMMERCEHUB_GIFT_PROCESSOR && !paymentInstrument.creditCardToken)
    {
        paymentInstrument.custom.commercehubCardType = fiservHelper.secureTraversal(res, constants.RESPONSE_PATHS.CARD_TYPE);
        paymentInstrument.custom.commercehubCardIndicator = fiservHelper.secureTraversal(res, constants.RESPONSE_PATHS.CARD_INDICATOR);
    }
    else if(paymentProcessor.ID === constants.COMMERCEHUB_GIFT_PROCESSOR)
    {
        paymentInstrument.custom.balance = null;
    }
    

    Transaction.commit();
    let transactionState = fiservHelper.secureTraversal(res, constants.RESPONSE_PATHS.TRANSACTION_STATE)
    let processorString;
    switch(paymentProcessor.ID) {
        case constants.COMMERCEHUB_PROCESSOR:
            processorString = 'Payment ' + (paymentInstrument.creditCardToken ? 'Token' : 'Card');
            break;
        case constants.COMMERCEHUB_GIFT_PROCESSOR:
            processorString = 'Gift Card';
            break;
    }
    if(transactionState === constants.TXN_STATES.AUTHORIZED)
    {
        FiservLogs.logInfo(1, processorString + ' Auth Transaction Successful', orderNo);
    }
    else if(transactionState === constants.TXN_STATES.CAPTURED)
    {
        FiservLogs.logInfo(1, processorString + ' Sale Transaction Successful', orderNo);
    }
    FiservLogs.logInfo(1, 'Transaction ID: ' + paymentInstrument.paymentTransaction.transactionID, orderNo);
    return { authorized: true, error: false };
}

function rollbackGiftCards(order, orderNo)
{
    FiservLogs.logError(2, 'An error occurred during payment processing. Checking for gift card transactions to reverse', orderNo);

    let giftFound = 0;
    let giftReversed = 0;
    order.paymentInstruments.toArray().forEach((pi) => {
        if(pi.paymentMethod === constants.COMMERCEHUB_GIFT_PAYMENT_METHOD && pi.paymentTransaction.transactionID)
        {
            giftFound++;
            let transactionId = pi.paymentTransaction.transactionID;
            let cancelPayload = requestBuilder.buildCancelPayload(orderNo, transactionId);
            let cancelService = FiservServices.getService('CommercehubCancel', orderNo);
            try {
                FiservServices.callService(cancelService, cancelPayload, orderNo);
                giftReversed++;
            }
            catch(e)
            {
                FiservLogs.logError(2, 'Failed to reverse gift transaction with Transaction ID: ' + transactionId, orderNo);
            }
        }
    });

    if(giftFound !== 0)
    {
        if(giftReversed !== 0)
        {
            FiservLogs.logError(2, 'Successfully reversed ' + giftReversed + ' gift transaction(s)', orderNo);
        }
        if(giftReversed !== giftFound)
        {
            FiservLogs.logError(2, 'Failed to reverse ' + (giftFound - giftReversed) + ' gift transaction(s)', orderNo);
        }
    }
    else
    {
        FiservLogs.logError(2, 'No gift transactions applied. Continuing...', orderNo);
    }
}

module.exports = 
{
    handleTransaction : handleTransaction
};