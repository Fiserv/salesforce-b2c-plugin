'use strict';

const fiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");

const METHOD_ID = "APPLEPAY";
const PROCESSOR_STRING = 'Apple Pay';


function convertToB2cCardType(paymentInformation, paymentInstrument)
{
    paymentInstrument.paymentTransaction.custom.paymentAction = fiservConfig.getCommerceHubApplePayPaymentType();
    paymentInstrument.paymentTransaction.custom.commercehubSessionId = paymentInformation.sessionId;
}

function getCommercehubPaymentType()
{
    return fiservConfig.getCommerceHubApplePayPaymentType();
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

    paymentInstrument.custom.commercehubCardType = fiservHelper.secureTraversal(res, fiservConstants.RESPONSE_PATHS.CARD_TYPE);
    paymentInstrument.custom.commercehubCardIndicator = fiservHelper.secureTraversal(res, fiservConstants.RESPONSE_PATHS.CARD_INDICATOR);
    paymentInstrument.custom.maskedCardNumber = fiservHelper.secureTraversal(res, fiservConstants.RESPONSE_PATHS.LAST_FOUR).padStart(16, '*');
    paymentInstrument.custom.expireMonth = fiservHelper.secureTraversal(res, fiservConstants.RESPONSE_PATHS.EXP_MONTH);
    paymentInstrument.custom.expireYear = fiservHelper.secureTraversal(res, fiservConstants.RESPONSE_PATHS.EXP_YEAR);
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