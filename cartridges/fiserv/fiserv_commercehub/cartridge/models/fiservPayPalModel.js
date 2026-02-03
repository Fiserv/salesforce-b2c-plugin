'use strict';

const fiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");

const METHOD_ID = "PAYPAL";
const PROCESSOR_STRING = 'PayPal';


function convertToB2cCardType(paymentInformation, paymentInstrument)
{
    paymentInstrument.paymentTransaction.custom.paymentAction = fiservConfig.getCommerceHubPayPalPaymentType();
    paymentInstrument.paymentTransaction.custom.commercehubOrderId = paymentInformation.orderId;
}

function getCommercehubPaymentType()
{
    return fiservConfig.getCommerceHubPayPalPaymentType();
}

function executeCommercehubTransaction(orderNo, paymentInstrument)
{
    const fiservCheckout = require('*/cartridge/scripts/checkout/fiservCheckout');
    return fiservCheckout.executeCommercehubOrderTransaction(orderNo, paymentInstrument);
}

function postTransactionDataProcessing()
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
    postTransactionDataProcessing : postTransactionDataProcessing,
    getProcessorString : getProcessorString,
};