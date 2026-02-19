'use strict';

const Order = require('dw/order/Order');
const OrderMgr = require('dw/order/OrderMgr');
const Resource = require('dw/web/Resource');

const fiservConstants = require('*/cartridge/fiservConstants/constants');
const fiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");
const fiservHelper = require('*/cartridge/scripts/utils/fiservHelpers/primaryHelper');
const fiservLogs = require("*/cartridge/scripts/utils/commercehubLogs");
const fiservRequestBuilder = require('*/cartridge/scripts/requests/request_builder');
const fiservServices = require('*/cartridge/scripts/utils/commercehubServices');

const okStates = [
    fiservConstants.TXN_STATES.AUTHORIZED,
    fiservConstants.TXN_STATES.CAPTURED,
    fiservConstants.TXN_STATES.PROCESSING
];


function executeCommercehubChargesTransaction(orderNo, paymentInstrument) 
{
    const fiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");

    try 
    {
        // build request obj    
        let transactionPayload = fiservRequestBuilder.buildChargesRequest(orderNo, paymentInstrument);

        let order = OrderMgr.getOrder(orderNo);
        if (order === null)
        {
            fiservLogs.logFatal(2, "Unable to retrieve order object for number: ".concat(orderNo), orderNo);
            throw new Error(Resource.msg('message.error.order.retrieval', 'error', null).concat(orderNo));
        }

        // process transaction
        let chargesResult = sendChargesRequest(order, transactionPayload, orderNo);

        //Check PIN_ONLY status
        if(fiservHelper.secureTraversal(chargesResult, fiservConstants.RESPONSE_PATHS.CARD_TYPE) === 'PIN_ONLY')
        {
            let transactionId = chargesResult.gatewayResponse.transactionProcessingDetails.transactionId;
            let cancelPayload = fiservRequestBuilder.buildCancelPayload(orderNo, transactionId);
            let cancelService = fiservServices.getService('CommercehubCancel', orderNo);
            fiservServices.callService(cancelService, cancelPayload, orderNo);
            throw new Error(Resource.msg('message.error.payment.pinonly', 'error', null));
        }

        // Handle Saved Payment Instrument
        if (!chargesResult.error && (!paymentInstrument.creditCardToken || fiservConfig.getCommerceHubTokenizationStrategy()))
        {
            const fiservSavePaymentInstrument = require('*/cartridge/scripts/account/fiservAccount/save_payment_instrument');
            fiservSavePaymentInstrument.savePaymentInstrument(order.getCustomerNo(), paymentInstrument, chargesResult, orderNo);
        }

        // Handle Capture (Need to consider potential previous order payment status due to GCs transacting first)
        if (fiservHelper.secureTraversal(chargesResult, fiservConstants.RESPONSE_PATHS.TRANSACTION_STATE) === fiservConstants.TXN_STATES.CAPTURED.toString())
        {
            if(order.getPaymentInstruments().length > 1 && fiservConfig.getCommerceHubGiftPaymentType() === "AUTH")
                order.setPaymentStatus(Order.PAYMENT_STATUS_PARTPAID);
            else
                order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
        }
        else if(order.getPaymentInstruments().length > 1 && fiservConfig.getCommerceHubGiftPaymentType() === "SALE")
        {
            order.setPaymentStatus(Order.PAYMENT_STATUS_PARTPAID);
        }

        return chargesResult;

    } catch (e) {
        fiservLogs.logError(2,
          'Error processing payment. Error message: '.concat(e.message).concat(' more details: ').concat(e.toString()),
          orderNo
        );
        return { error: true };
    }
}

function sendChargesRequest(order, chargesRequest, orderNo)
{
    try {
        let chargesService = fiservServices.getService('CommercehubCharges', orderNo);
        let parsedResponse = fiservServices.callService(chargesService, chargesRequest, orderNo);

        order.setPaymentStatus(Order.PAYMENT_STATUS_NOTPAID);

        // transaction OK
        if (okStates.indexOf(fiservHelper.secureTraversal(parsedResponse, fiservConstants.RESPONSE_PATHS.TRANSACTION_STATE)) !== -1)
        {
            order.setExportStatus(Order.EXPORT_STATUS_READY);
        }
        // transaction failed
        else
        {
            order.setExportStatus(Order.EXPORT_STATUS_NOTEXPORTED);
            fiservLogs.logInfo(1, 'Response returned with unsuccessful state', orderNo);
            fiservLogs.logError(1, 'Transaction state failure: ' + fiservHelper.secureTraversal(parsedResponse, fiservConstants.RESPONSE_PATHS.TRANSACTION_STATE), orderNo);
            fiservLogs.logError(2, 'Response message: ' + fiservHelper.secureTraversal(parsedResponse, fiservConstants.RESPONSE_PATHS.RESPONSE_MESSAGE), orderNo);
            fiservLogs.logError(2, 'Payment Source Type: ' + fiservHelper.secureTraversal(parsedResponse, fiservConstants.RESPONSE_PATHS.SOURCE_TYPE), orderNo);
            fiservLogs.logError(2, 'Transaction ID: ' + fiservHelper.secureTraversal(parsedResponse, fiservConstants.RESPONSE_PATHS.TRANSACTION_ID), orderNo);
            parsedResponse.error = parsedResponse.error ? parsedResponse.error : { message : "failed with state: ".concat(parsedResponse.gatewayResponse.transactionState)};
        }
        return parsedResponse;
    } catch (_e) {
        fiservLogs.logError(2,
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

function executeCommercehubOrderTransaction(orderNo, paymentInstrument)
{
    try 
    {
        // build request obj    
        let transactionPayload = fiservRequestBuilder.buildOrderRequest(orderNo, paymentInstrument);

        let order = OrderMgr.getOrder(orderNo);
        if (order === null)
        {
            fiservLogs.logFatal(2, "Unable to retrieve order object for number: ".concat(orderNo), orderNo);
            throw new Error(Resource.msg('message.error.order.retrieval', 'error', null).concat(orderNo));
        }

        // process transaction
        let chargesResult = sendOrdersRequest(order, transactionPayload, orderNo);

        // Handle Capture (Need to consider potential previous order payment status due to GCs transacting first)
        if (fiservHelper.secureTraversal(chargesResult, fiservConstants.RESPONSE_PATHS.TRANSACTION_STATE) === fiservConstants.TXN_STATES.CAPTURED.toString())
        {
            if(order.getPaymentInstruments().length > 1 && fiservConfig.getCommerceHubGiftPaymentType() === "AUTH")
                order.setPaymentStatus(Order.PAYMENT_STATUS_PARTPAID);
            else
                order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
        }
        else if(order.getPaymentInstruments().length > 1 && fiservConfig.getCommerceHubGiftPaymentType() === "SALE")
        {
            order.setPaymentStatus(Order.PAYMENT_STATUS_PARTPAID);
        }

        let customerId = null;
        if(order.customer.profile && (customerId = fiservHelper.secureTraversal(chargesResult, fiservConstants.RESPONSE_PATHS.PAYPAL_CUSTOMER_ID)))
        {
            order.customer.profile.custom.commercehubCustomerId = customerId;
        }

        return chargesResult;

    } catch (e) {
        fiservLogs.logError(2,
          'Error processing payment. Error message: '.concat(e.message).concat(' more details: ').concat(e.toString()),
          orderNo
        );
        return { error: true };
    }
}

function sendOrdersRequest(order, ordersRequest, orderNo)
{
    try {
        let chargesService = fiservServices.getService('CommercehubOrders', orderNo);
        let parsedResponse = fiservServices.callService(chargesService, ordersRequest, orderNo);

        order.setPaymentStatus(Order.PAYMENT_STATUS_NOTPAID);

        // transaction OK
        if (okStates.indexOf(fiservHelper.secureTraversal(parsedResponse, fiservConstants.RESPONSE_PATHS.TRANSACTION_STATE)) !== -1)
        {
            order.setExportStatus(Order.EXPORT_STATUS_READY);
        }
        // transaction failed
        else
        {
            order.setExportStatus(Order.EXPORT_STATUS_NOTEXPORTED);
            fiservLogs.logInfo(1, 'Response returned with unsuccessful state', orderNo);
            fiservLogs.logError(1, 'Transaction state failure: ' + fiservHelper.secureTraversal(parsedResponse, fiservConstants.RESPONSE_PATHS.TRANSACTION_STATE), orderNo);
            // fiservLogs.logError(2, 'Response message: ' + fiservHelper.secureTraversal(parsedResponse, fiservConstants.RESPONSE_PATHS.RESPONSE_MESSAGE), orderNo); I don't know what the error message routing is, lol
            fiservLogs.logError(2, 'Transaction ID: ' + fiservHelper.secureTraversal(parsedResponse, fiservConstants.RESPONSE_PATHS.TRANSACTION_ID), orderNo);
            parsedResponse.error = parsedResponse.error ? parsedResponse.error : { message : "failed with state: ".concat(parsedResponse.gatewayResponse.transactionState)};
        }
        return parsedResponse;
    } catch (_e) {
        fiservLogs.logError(2,
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
    executeCommercehubChargesTransaction: executeCommercehubChargesTransaction,
    executeCommercehubOrderTransaction: executeCommercehubOrderTransaction
};