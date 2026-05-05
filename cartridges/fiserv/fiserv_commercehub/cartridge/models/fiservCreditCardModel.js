'use strict';

const PaymentInstrument = require('dw/order/PaymentInstrument');

const fiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");

const METHOD_ID = PaymentInstrument.METHOD_CREDIT_CARD;


function convertToB2cCardType(paymentInformation, paymentInstrument)
{
    let b2cCardType = getB2cCardType(paymentInformation.cardType);
    paymentInstrument.setCreditCardNumber(paymentInformation.cardNumber.value);
    paymentInstrument.setCreditCardType(b2cCardType);
    paymentInstrument.setCreditCardExpirationMonth(paymentInformation.expirationMonth.value);
    paymentInstrument.setCreditCardExpirationYear(paymentInformation.expirationYear.value);
    paymentInstrument.custom.maskedCardNumber = paymentInformation.maskedCardNumber;
    paymentInstrument.custom.expireMonth = paymentInformation.expirationMonth.value;
    paymentInstrument.custom.expireYear = paymentInformation.expirationYear.value;
    paymentInstrument.paymentTransaction.custom.paymentAction = fiservConfig.getCommerceHubCreditPaymentType();
    if (fiservConfig.getCommerceHubTokenization())
    {
        paymentInstrument.paymentTransaction.custom.tokenizeCard = paymentInformation.tokenizeCard ? paymentInformation.tokenizeCard : false;
    }
    if(fiservConfig.get3DSEnabled())
    {
        paymentInstrument.paymentTransaction.custom.commercehub3DSAuthenitcationId = paymentInformation.authenitcationId3DS;
    }

    if (paymentInformation.creditCardToken)
    {      
        paymentInstrument.creditCardToken = paymentInformation.creditCardToken.value;
        paymentInstrument.custom.commercehubTokenSource = paymentInformation.tokenSource.value;
        paymentInstrument.custom.commercehubCardType = paymentInformation.commercehubCardType.value;
        paymentInstrument.custom.commercehubCardIndicator = paymentInformation.commercehubCardIndicator.value;
        if(fiservConfig.getTokenSecurityEnabled() && paymentInformation.sessionId){
           paymentInstrument.paymentTransaction.custom.commercehubSessionId = paymentInformation.sessionId;
        }
    }
    else
    {
        paymentInstrument.paymentTransaction.custom.commercehubSessionId = paymentInformation.sessionId;
    }
}

function getCommercehubPaymentType()
{
    return fiservConfig.getCommerceHubCreditPaymentType();
}

function executeCommercehubTransaction(orderNo, paymentInstrument)
{
    const fiservCheckout = require('*/cartridge/scripts/checkout/fiservCheckout');
    return fiservCheckout.executeCommercehubChargesTransaction(orderNo, paymentInstrument);
}

function postTransactionDataProcessing(res, paymentInstrument)
{
    if(paymentInstrument.creditCardToken)
        return;

    const fiservConstants = require('*/cartridge/fiservConstants/constants');
    const fiservHelper = require('*/cartridge/scripts/utils/fiservHelpers/primaryHelper');

    paymentInstrument.custom.commercehubCardType = fiservHelper.secureTraversal(res, fiservConstants.RESPONSE_PATHS.CARD_TYPE);
    paymentInstrument.custom.commercehubCardIndicator = fiservHelper.secureTraversal(res, fiservConstants.RESPONSE_PATHS.CARD_INDICATOR);
}

function getProcessorString(paymentInstrument)
{
    return 'Payment ' + (paymentInstrument.creditCardToken ? 'Token' : 'Card')
}

function getB2cCardType(cardType)
{
    switch (cardType.value.toLowerCase()) {
        case 'visa':
            return 'Visa';
        case 'mastercard':
        case 'master card':
            return 'Master Card';
        case 'amex':
            return 'Amex';
        case 'maestro':
        case 'maestrouk':
            return 'Maestro';
        case 'jcb':
            return 'JCB';
        case 'cup':
        case 'union':
        case 'unionpay':
            return 'UnionPay';
        case 'diners':
        case 'diners-club':
        case 'diners club':
            return 'Diners';
        case 'discover':
            return 'Discover';
    }

    throw new Error('Unable to determine Salesforce B2C card type for: '.concat(cardType));
}

module.exports = 
{
    methodID : METHOD_ID,
    convertToB2cCardType : convertToB2cCardType,
    getCommercehubPaymentType : getCommercehubPaymentType,
    executeCommercehubTransaction : executeCommercehubTransaction,
    postTransactionDataProcessing : postTransactionDataProcessing,
    getProcessorString : getProcessorString,
    getB2cCardType : getB2cCardType
};