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

function getCommercehubPazeButtonColor()
{
    return fiservConfig.getCommerceHubPazeButtonColor();
}

function getCommercehubPazeButtonShape()
{
    return fiservConfig.getCommerceHubPazeButtonShape();
}

function getCommercehubPazeButtonLabel()
{
    return fiservConfig.getCommerceHubPazeButtonLabel();
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
    getCommercehubPazeButtonColor : getCommercehubPazeButtonColor,
    getCommercehubPazeButtonShape : getCommercehubPazeButtonShape,
    getCommercehubPazeButtonLabel : getCommercehubPazeButtonLabel,
};