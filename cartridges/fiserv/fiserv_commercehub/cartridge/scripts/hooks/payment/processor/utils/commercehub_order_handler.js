'use strict';

const fiservConstants = require('*/cartridge/fiservConstants/constants');
const fiservHelper = require('*/cartridge/scripts/utils/fiservHelper');
const fiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");


function removeNonGiftPaymentInstruments(currentBasket) {
    const collections = require('*/cartridge/scripts/util/collections');
    collections.forEach(currentBasket.getPaymentInstruments(), function (item) {
        if(item.getPaymentMethod() !== fiservConstants.COMMERCEHUB_GIFT_PAYMENT_METHOD)
        {
            currentBasket.removePaymentInstrument(item);
        }
    });
}

function convertToB2cCardTypeCredit(paymentInformation, paymentInstrument) {
    let b2cCardType = fiservHelper.getB2cCardType(paymentInformation.cardType);
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
    }
    else
    {
        paymentInstrument.paymentTransaction.custom.commercehubSessionId = paymentInformation.sessionId;
    }
}

function convertToB2cCardTypePayPal(paymentInformation, paymentInstrument) {
    paymentInstrument.paymentTransaction.custom.paymentAction = fiservConfig.getCommerceHubPayPalPaymentType();
    paymentInstrument.paymentTransaction.custom.commercehubOrderId = paymentInformation.orderId;
}

function convertToB2cCardTypeVenmo(paymentInformation, paymentInstrument) {
    paymentInstrument.paymentTransaction.custom.paymentAction = fiservConfig.getCommerceHubVenmoPaymentType();
    paymentInstrument.paymentTransaction.custom.commercehubOrderId = paymentInformation.orderId;
}

function convertToB2cCardTypeApplePay(paymentInformation, paymentInstrument) {
    paymentInstrument.paymentTransaction.custom.paymentAction = fiservConfig.getCommerceHubApplePayPaymentType();
    paymentInstrument.paymentTransaction.custom.commercehubSessionId = paymentInformation.sessionId;
}

function handleOrder(basket, paymentInformation, methodID) {
    const PaymentInstrument = require('dw/order/PaymentInstrument');
    const Transaction = require('dw/system/Transaction');

    let currentBasket = basket;
    let cardErrors = {};
    let serverErrors = [];
    Transaction.wrap(function () {
        removeNonGiftPaymentInstruments(currentBasket);

        let paymentAmount = fiservHelper.retreiveNonGiftChargeAmount(currentBasket);

        let paymentInstrument = currentBasket.createPaymentInstrument(methodID, new dw.value.Money(paymentAmount, 'USD'));

        switch(methodID)
        {
            case PaymentInstrument.METHOD_CREDIT_CARD:
                convertToB2cCardTypeCredit(paymentInformation, paymentInstrument);
                break;
            case fiservConstants.COMMERCEHUB_PAYPAL_PAYMENT_METHOD:
                convertToB2cCardTypePayPal(paymentInformation, paymentInstrument);
                break;
            case fiservConstants.COMMERCEHUB_VENMO_PAYMENT_METHOD:
                convertToB2cCardTypeVenmo(paymentInformation, paymentInstrument);
                break;
            case fiservConstants.COMMERCEHUB_APPLEPAY_PAYMENT_METHOD:
                convertToB2cCardTypeApplePay(paymentInformation, paymentInstrument);
                break;
            default:
                break;
        }
    });
    return {
        fieldErrors: cardErrors,
        serverErrors: serverErrors,
        error: false
    };
}

module.exports = 
{
    handleOrder : handleOrder
};