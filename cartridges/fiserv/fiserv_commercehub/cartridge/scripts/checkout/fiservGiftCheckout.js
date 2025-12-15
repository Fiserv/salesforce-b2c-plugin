'use strict';

const Resource = require('dw/web/Resource');

const fiservLogs = require("*/cartridge/scripts/utils/commercehubLogs");


function executeCommercehubGiftTransaction(orderNo, paymentInstrument) 
{
    try 
    {
        const OrderMgr = require('dw/order/OrderMgr');

        const fiservRequestBuilder = require('*/cartridge/scripts/requests/request_builder');

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


        return chargesResult;

    } catch (e) {
        fiservLogs.logError(2,
            'Error processing gift payment. Error message: '.concat(e.message).concat(' more details: ').concat(e.toString()),
            orderNo
        );
        return { error: true };
    }
}

function sendChargesRequest(order, chargesRequest, orderNo)
{
    try {
        const fiservConstants = require('*/cartridge/fiservConstants/constants');

        const fiservServices = require('*/cartridge/scripts/utils/commercehubServices');
        const fiservHelper = require('*/cartridge/scripts/utils/fiservHelpers/primaryHelper');

        let chargesService = fiservServices.getService('CommercehubCharges', orderNo);
        let parsedResponse = fiservServices.callService(chargesService, chargesRequest, orderNo);

        let okStates = [
            fiservConstants.TXN_STATES.AUTHORIZED,
            fiservConstants.TXN_STATES.CAPTURED
        ];

        // transaction failed
        if (okStates.indexOf(fiservHelper.secureTraversal(parsedResponse, fiservConstants.RESPONSE_PATHS.TRANSACTION_STATE)) === -1)
        {
            const Order = require('dw/order/Order');
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
        fiservLogs.logFatal(2, 
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
    executeCommercehubGiftTransaction: executeCommercehubGiftTransaction,
};