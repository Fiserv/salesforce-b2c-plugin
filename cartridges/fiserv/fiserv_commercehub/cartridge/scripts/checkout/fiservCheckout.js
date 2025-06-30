const Resource = require('dw/web/Resource');
const Order = require('dw/order/Order');
const OrderMgr = require('dw/order/OrderMgr');
const FiservLogs = require("*/cartridge/scripts/utils/commercehubLogs");
let constants = require('*/cartridge/fiservConstants/constants');
let requestBuilder = require('*/cartridge/scripts/requests/request_builder');
let FiservServices = require('*/cartridge/scripts/utils/commercehubServices');
var fiservHelper = require('*/cartridge/scripts/utils/fiservHelper');
let savePayment = require('*/cartridge/scripts/account/fiservAccount/save_payment_instrument');

function executeCommercehubTransaction(orderNo, paymentInstrument) 
{
    try 
    {
        // build request obj    
        let transactionPayload = requestBuilder.buildPrimaryRequest(orderNo, paymentInstrument);

        let order = OrderMgr.getOrder(orderNo);
        if (order === null)
        {
            FiservLogs.logFatal(2, "Unable to retrieve order object for number: ".concat(orderNo), orderNo);
            throw new Error(Resource.msg('message.error.order.retrieval', 'error', null).concat(orderNo));
        }

        // enhance with 3ds
        // 3ds here

        // enhance with L2/L3
        // L2/L3 here

        // process transaction
        let chargesResult = sendChargesRequest(order, transactionPayload, orderNo);

        //Check PIN_ONLY status
        if(fiservHelper.secureTraversal(chargesResult, constants.RESPONSE_PATHS.CARD_TYPE) === 'PIN_ONLY')
        {
            let transactionId = chargesResult.gatewayResponse.transactionProcessingDetails.transactionId;
            let cancelPayload = requestBuilder.buildCancelPayload(orderNo, transactionId);
            let cancelService = FiservServices.getService('CommercehubCancel', orderNo);
            FiservServices.callService(cancelService, cancelPayload, orderNo);
            throw new Error(Resource.msg('message.error.payment.pinonly', 'error', null));
        }

        // Handle Saved Payment Instrument
        if (!chargesResult.error && !paymentInstrument.creditCardToken)
        {
            savePayment.savePaymentInstrument(order.getCustomerNo(), paymentInstrument, chargesResult, orderNo);
        }

        // Handle Capture
        if (fiservHelper.secureTraversal(chargesResult, constants.RESPONSE_PATHS.TRANSACTION_STATE) === constants.TXN_STATES.CAPTURED.toString())
        {
            order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
            //order.invoices[0].addCaptureTransaction(paymentInstrument, paymentInstrument.paymentTransaction.amount);
        }


        return chargesResult;

    } catch (e) {
        FiservLogs.logError(2,
          'Error processing payment. Error message: '.concat(e.message).concat(' more details: ').concat(e.toString()),
          orderNo
        );
        return { error: true };
    }
}

function sendChargesRequest(order, chargesRequest, orderNo)
{
    try {
        let chargesService = FiservServices.getService('CommercehubCharges', orderNo);
        let parsedResponse = FiservServices.callService(chargesService, chargesRequest, orderNo);

        let okStates = [
            constants.TXN_STATES.AUTHORIZED,
            constants.TXN_STATES.CAPTURED
        ];

        order.setPaymentStatus(Order.PAYMENT_STATUS_NOTPAID);

        // transaction OK
        if (okStates.indexOf(fiservHelper.secureTraversal(parsedResponse, constants.RESPONSE_PATHS.TRANSACTION_STATE)) !== -1)
        {
            order.setExportStatus(Order.EXPORT_STATUS_READY);
        }
        // transaction failed
        else
        {
            order.setExportStatus(Order.EXPORT_STATUS_NOTEXPORTED);
            FiservLogs.logInfo(1, 'Response returned with unsuccessful state', orderNo);
            FiservLogs.logError(1, 'Transaction state failure: ' + fiservHelper.secureTraversal(parsedResponse, constants.RESPONSE_PATHS.TRANSACTION_STATE), orderNo);
            FiservLogs.logError(2, 'Response message: ' + fiservHelper.secureTraversal(parsedResponse, constants.RESPONSE_PATHS.RESPONSE_MESSAGE), orderNo);
            FiservLogs.logError(2, 'Payment Source Type: ' + fiservHelper.secureTraversal(parsedResponse, constants.RESPONSE_PATHS.SOURCE_TYPE), orderNo);
            FiservLogs.logError(2, 'Transaction ID: ' + fiservHelper.secureTraversal(parsedResponse, constants.RESPONSE_PATHS.TRANSACTION_ID), orderNo);
            parsedResponse.error = parsedResponse.error ? parsedResponse.error : { message : "failed with state: ".concat(parsedResponse.gatewayResponse.transactionState)};
        }
        return parsedResponse;
    } catch (_e) {
        FiservLogs.logError(2,
            'Fiserv: '.concat(_e.toString()).concat(' in ').concat(_e.fileName).concat(':').concat(_e.lineNumber),
            orderNo
        );
        return {
            error: true,
            args: {
                fiservErrorMessage: Resource.msg(
                    'confirm.error.declined',
                    'checkout',
                    null
                )
            }
        };
    }
}

module.exports = 
{
    executeCommercehubTransaction: executeCommercehubTransaction,
};