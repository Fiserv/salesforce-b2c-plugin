let Transaction = require('dw/system/Transaction');
let collections = require('*/cartridge/scripts/util/collections');
let PaymentInstrument = require('dw/order/PaymentInstrument');
let fiservHelper = require('*/cartridge/scripts/utils/fiservHelper');
let FiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");


function removeAllPaymentInstruments(currentBasket) {
    collections.forEach(currentBasket.getPaymentInstruments(), function (item) {
        currentBasket.removePaymentInstrument(item);
    });
}

function convertToB2cCardType(paymentInformation, paymentInstrument) {
    let b2cCardType = fiservHelper.getB2cCardType(paymentInformation.cardType);
    paymentInstrument.setCreditCardNumber(paymentInformation.cardNumber);
    paymentInstrument.setCreditCardType(b2cCardType);
    paymentInstrument.custom.maskedCardNumber = paymentInformation.maskedCardNumber;
    paymentInstrument.paymentTransaction.custom.paymentAction = FiservConfig.getCommerceHubPaymentType();
    if (FiservConfig.getCommerceHubTokenization())
    {
        paymentInstrument.paymentTransaction.custom.tokenizeCard = paymentInformation.tokenizeCard ? paymentInformation.tokenizeCard : false;
    }

    if (paymentInformation.creditCardToken)
    {
        // expr month and year are masked automatically, so using a custom field to get info to request payload
        paymentInstrument.custom.expireMonth = paymentInformation.expirationMonth.value;
        paymentInstrument.custom.expireYear = paymentInformation.expirationYear.value;        
        paymentInstrument.creditCardToken = paymentInformation.creditCardToken.value;
        paymentInstrument.custom.commercehubTokenSource = paymentInformation.tokenSource.value;        
    } else 
    {
        paymentInstrument.paymentTransaction.custom.commercehubSessionId = paymentInformation.sessionId;
    }
  }

function handleOrder(basket, paymentInformation) {
    let currentBasket = basket;
    let cardErrors = {};
    let serverErrors = [];
    Transaction.wrap(function () {
        removeAllPaymentInstruments(currentBasket);
        let paymentInstrument = currentBasket.createPaymentInstrument(PaymentInstrument.METHOD_CREDIT_CARD, currentBasket.totalGrossPrice);
        convertToB2cCardType(paymentInformation, paymentInstrument);
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