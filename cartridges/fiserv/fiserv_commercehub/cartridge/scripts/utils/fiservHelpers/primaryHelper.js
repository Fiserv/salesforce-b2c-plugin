'use strict';

const PaymentMgr = require('dw/order/PaymentMgr');

const fiservConstants = require('*/cartridge/fiservConstants/constants');


function isCreditCardFiserv()
{
    let method = PaymentMgr.getPaymentMethod('CREDIT_CARD');
    
    if (method !== null && method.paymentProcessor !== null && method.paymentProcessor.ID == fiservConstants.PROCESSOR_ID_LIST.COMMERCEHUB_PROCESSOR)
    {
        return method.isActive();
    }

    return false;
}

function isApplePayFiserv()
{
    let method = PaymentMgr.getPaymentMethod('APPLEPAY');
    
    if (method !== null && method.paymentProcessor !== null && method.paymentProcessor.ID == fiservConstants.PROCESSOR_ID_LIST.COMMERCEHUB_APPLEPAY_PROCESSOR)
    {
        return method.isActive();
    }

    return false;
}

function secureTraversal(object, path)
{
    if(object == null)
        return null;
    for(let i in path)
    {
        object = object[path[i]];
        if(typeof(object) === "undefined")
            return null;
    }
    return object;
}

function buildRenderedBasketTokenField(basket)
{
    const URLUtils = require('dw/web/URLUtils');

    let paymentInstrument = JSON.parse(basket.custom.commercehubBasketToken);
    var renderedBasketPayment = {
        creditCardHolder: paymentInstrument.name,
        maskedCreditCardNumber: paymentInstrument.cardNumber,
        creditCardType: paymentInstrument.cardType,
        creditCardExpirationMonth: paymentInstrument.expirationMonth,
        creditCardExpirationYear: paymentInstrument.expirationYear,
        UUID: paymentInstrument.UUID
    };

    renderedBasketPayment.cardTypeImage = {
        src: URLUtils.staticURL('/images/'
            + paymentInstrument.cardType.toLowerCase().replace(/\s/g, '')
            + '-dark.svg'),
        alt: paymentInstrument.cardType
    };

    return renderedBasketPayment;
}

function getAvailableExpressMethods(basket, customer, countryCode)
{
    const fiservConfig = require('*/cartridge/scripts/utils/commercehubConfig');

    var paymentMethods = PaymentMgr.getApplicablePaymentMethods(
        customer,
        countryCode,
        basket.totalGrossPrice.value
    );

    return paymentMethods ? paymentMethods.toArray().filter(function (method) {
        if (fiservConstants.EXPRESS_PAYMENT_METHODS.indexOf(method.ID) === -1) {
            return false;
        }

        switch (method.ID) {
            case fiservConstants.PAYMENT_METHOD_LIST.COMMERCEHUB_APPLEPAY_PAYMENT_METHOD:
                return fiservConfig.getCommerceHubApplePayEnabled();
            default:
                return false;
        }
    }).map(function (method) {
        return { ID: method.ID, name: method.name };
    }) : null;
}

module.exports =
{
    isCreditCardFiserv : isCreditCardFiserv,
    isApplePayFiserv : isApplePayFiserv,
    secureTraversal : secureTraversal,
    buildRenderedBasketTokenField : buildRenderedBasketTokenField,
    getAvailableExpressMethods : getAvailableExpressMethods
}