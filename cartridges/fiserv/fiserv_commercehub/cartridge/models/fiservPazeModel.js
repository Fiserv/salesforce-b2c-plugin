'use strict';

const fiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");

const METHOD_ID = "PAZE";
const PROCESSOR_STRING = 'Paze';


function convertToB2cCardType(paymentInformation, paymentInstrument)
{
    paymentInstrument.paymentTransaction.custom.paymentAction = fiservConfig.getCommerceHubPazePaymentType();
    paymentInstrument.paymentTransaction.custom.commercehubSessionId = paymentInformation.sessionId;
}

function getCommercehubPaymentType()
{
    return fiservConfig.getCommerceHubPazePaymentType();
}

function executeCommercehubTransaction(orderNo, paymentInstrument)
{
    const fiservCheckout = require('*/cartridge/scripts/checkout/fiservCheckout');
    return fiservCheckout.executeCommercehubChargesTransaction(orderNo, paymentInstrument);
}

function postTransactionDataProcessing()
{
    // Do Nothing - Paze does not have a Processing State
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
    getProcessorString : getProcessorString
};