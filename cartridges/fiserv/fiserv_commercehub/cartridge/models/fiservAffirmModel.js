'use strict';

const fiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");

const METHOD_ID = "AFFIRM";
const PROCESSOR_STRING = 'Affirm';


function convertToB2cCardType(paymentInformation, paymentInstrument)
{
    paymentInstrument.paymentTransaction.custom.paymentAction = fiservConfig.getCommerceHubAffirmPaymentType();
    paymentInstrument.paymentTransaction.custom.commercehubOrderId = paymentInformation.orderId;
}

function getCommercehubPaymentType()
{
    return fiservConfig.getCommerceHubAffirmPaymentType();
}

function executeCommercehubTransaction(orderNo, paymentInstrument)
{
    const fiservCheckout = require('*/cartridge/scripts/checkout/fiservCheckout');
    return fiservCheckout.executeCommercehubOrderTransaction(orderNo, paymentInstrument);
}

function postTransactionDataProcessing(res, paymentInstrument)
{
    const fiservConstants = require('*/cartridge/fiservConstants/constants');
    const fiservHelper = require('*/cartridge/scripts/utils/fiservHelpers/primaryHelper');

    paymentInstrument.paymentTransaction.custom.inquiryRequired = 
        (fiservHelper.secureTraversal(res, fiservConstants.RESPONSE_PATHS.TRANSACTION_STATE) === fiservConstants.TXN_STATES.PROCESSING);
}

function getProcessorString()
{
    return PROCESSOR_STRING;
}

module.exports = 
{
    methodID : METHOD_ID,
    convertToB2cCardType : convertToB2cCardType,
    getCommercehubPaymentType : getCommercehubPaymentType,
    executeCommercehubTransaction : executeCommercehubTransaction,
    postTransactionDataProcessing : postTransactionDataProcessing,
    getProcessorString : getProcessorString,
};