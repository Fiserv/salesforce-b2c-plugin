'use strict';

const fiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");

const METHOD_ID = "SAMSUNGPAY";
const PROCESSOR_STRING = 'Samsung Pay';


function convertToB2cCardType(paymentInformation, paymentInstrument)
{
    paymentInstrument.paymentTransaction.custom.paymentAction = fiservConfig.getCommerceHubSamsungPayPaymentType();
    paymentInstrument.paymentTransaction.custom.commercehubSessionId = paymentInformation.sessionId;
}

function getCommercehubPaymentType()
{
    return fiservConfig.getCommerceHubSamsungPayPaymentType();
}

function executeCommercehubTransaction(orderNo, paymentInstrument)
{
    const fiservCheckout = require('*/cartridge/scripts/checkout/fiservCheckout');
    return fiservCheckout.executeCommercehubChargesTransaction(orderNo, paymentInstrument);
}

function associateDataPostTransaction(res, paymentInstrument)
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
    associateDataPostTransaction : associateDataPostTransaction,
    getProcessorString : getProcessorString,
};