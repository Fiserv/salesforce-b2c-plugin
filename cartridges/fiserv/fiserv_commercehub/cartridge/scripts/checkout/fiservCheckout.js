const Resource = require('dw/web/Resource');
const Order = require('dw/order/Order');
const OrderMgr = require('dw/order/OrderMgr');
const FiservLogs = require("*/cartridge/scripts/utils/commercehubLogs");
let constants = require('*/cartridge/fiservConstants/constants');
let requestBuilder = require('*/cartridge/scripts/requests/request_builder');
let FiservServices = require('*/cartridge/scripts/utils/commercehubServices');
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
            let _errMsg = "Unable to retrieve order object for number: ".concat(orderNo);
            FiservLogs.fatal_log(_errMsg);
            throw new Error(_errMsg);
        }

        // enhance with 3ds
        // 3ds here

        // enhance with L2/L3
        // L2/L3 here

        // process transaction
        let chargesResult = sendChargesRequest(order, transactionPayload);

        // Handle Saved Payment Instrument
        if (!chargesResult.error)
        {
            savePayment.savePaymentInstrument(order.getCustomerNo(), paymentInstrument, chargesResult);
        }

        // Handle Capture
        if (chargesResult.gatewayResponse.transactionState === constants.TXN_STATES.CAPTURED.toString())
        {
            order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
            FiservLogs.error_log("invoice length: ".concat(order.invoices.length.toString()));
            FiservLogs.error_log("payment transaction type: ".concat(paymentInstrument.paymentTransaction.type));
            //order.invoices[0].addCaptureTransaction(paymentInstrument, paymentInstrument.paymentTransaction.amount);
        }


        return chargesResult;

    } catch (e) {
        FiservLogs.error_log(
          'Error processing payment. Error message: '.concat(e.message).concat(' more details: ').concat(e.toString())
        );
        return { error: true };
      }
}

function sendChargesRequest(order, chargesRequest)
{
    try {
        let chargesService = FiservServices.getService('CommercehubCharges');
        let response = FiservServices.callService(chargesService, chargesRequest);
        let parsedResponse = JSON.parse(response);
        FiservLogs.error_log(response);

        let okStates = [
            constants.TXN_STATES.AUTHORIZED,
            constants.TXN_STATES.CAPTURED
        ];

        order.setPaymentStatus(Order.PAYMENT_STATUS_NOTPAID);

        // transaction OK
        if (typeof(parsedResponse.gatewayResponse) !== "undefined" &&
            okStates.indexOf(parsedResponse.gatewayResponse.transactionState) !== -1)
        {
            order.setExportStatus(Order.EXPORT_STATUS_READY);
            FiservLogs.info_log('CommerceHub result: '.concat(parsedResponse.gatewayResponse.transactionState));               
        }
        // transaction failed
        else
        {
            order.setExportStatus(Order.EXPORT_STATUS_NOTEXPORTED);
            FiservLogs.error_log('Transaction failed: '.concat(parsedResponse.gatewayResponse.transactionState));
            parsedResponse.error = parsedResponse.error ? parsedResponse.error : { message : "failed with state: ".concat(parsedResponse.gatewayResponse.transactionState)};
        }
        return parsedResponse;
    } catch (_e) {
        FiservLogs.fatal_log(
            'Fiserv: '.concat(_e.toString()).concat(' in ').concat(_e.fileName).concat(':').concat(_e.lineNumber)
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