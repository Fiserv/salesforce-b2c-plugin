'use strict';

const fiservConstants = require("*/cartridge/fiservConstants/constants");

const METHOD_ID = "ACH";
const PROCESSOR_STRING = 'ACH';


function convertToB2cCardType(paymentInformation, paymentInstrument)
{
    paymentInstrument.paymentTransaction.custom.paymentAction = fiservConstants.COMMERCEHUB_SALE_ACTION;
    paymentInstrument.paymentTransaction.custom.commercehubSessionId = paymentInformation.sessionId;
}

function getCommercehubPaymentType()
{
    return fiservConstants.COMMERCEHUB_SALE_ACTION;
}

function executeCommercehubTransaction(orderNo, paymentInstrument)
{
    const fiservCheckout = require('*/cartridge/scripts/checkout/fiservCheckout');
    return fiservCheckout.executeCommercehubChargesTransaction(orderNo, paymentInstrument);
}

function postTransactionDataProcessing(res, paymentInstrument)
{
    const fiservConstants = require('*/cartridge/fiservConstants/constants');
    const fiservHelper = require('*/cartridge/scripts/utils/fiservHelpers/primaryHelper');

    let accountNumber = fiservHelper.secureTraversal(res, fiservConstants.RESPONSE_PATHS.ACH_ACCOUNT_NUMBER);
    if (accountNumber)
    {
        paymentInstrument.custom.maskedAccountNumber = accountNumber.replace(/^X+/, '****');
    }
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
