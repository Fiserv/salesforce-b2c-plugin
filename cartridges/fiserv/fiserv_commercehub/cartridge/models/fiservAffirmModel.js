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

function associateDataPostTransaction()
{
    // Do Nothing
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
    associateDataPostTransaction : associateDataPostTransaction,
    getProcessorString : getProcessorString,
};