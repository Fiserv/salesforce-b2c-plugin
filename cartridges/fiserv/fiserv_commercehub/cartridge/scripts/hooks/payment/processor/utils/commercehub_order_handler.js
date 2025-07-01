let Transaction = require('dw/system/Transaction');
let collections = require('*/cartridge/scripts/util/collections');
let constants = require('*/cartridge/fiservConstants/constants');
let PaymentInstrument = require('dw/order/PaymentInstrument');
let fiservHelper = require('*/cartridge/scripts/utils/fiservHelper');
let FiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");


function removeNonGiftPaymentInstruments(currentBasket) {
    collections.forEach(currentBasket.getPaymentInstruments(), function (item) {
        if(item.getPaymentMethod() !== constants.COMMERCEHUB_GIFT_PAYMENT_METHOD)
        {
            currentBasket.removePaymentInstrument(item);
        }
    });
}

function convertToB2cCardType(paymentInformation, paymentInstrument) {
    let b2cCardType = fiservHelper.getB2cCardType(paymentInformation.cardType);
    paymentInstrument.setCreditCardNumber(paymentInformation.cardNumber.value);
    paymentInstrument.setCreditCardType(b2cCardType);
    paymentInstrument.setCreditCardExpirationMonth(paymentInformation.expirationMonth.value);
    paymentInstrument.setCreditCardExpirationYear(paymentInformation.expirationYear.value);
    paymentInstrument.custom.maskedCardNumber = paymentInformation.maskedCardNumber;
    paymentInstrument.custom.expireMonth = paymentInformation.expirationMonth.value;
    paymentInstrument.custom.expireYear = paymentInformation.expirationYear.value;
    paymentInstrument.paymentTransaction.custom.paymentAction = FiservConfig.getCommerceHubCreditPaymentType();
    if (FiservConfig.getCommerceHubTokenization())
    {
        paymentInstrument.paymentTransaction.custom.tokenizeCard = paymentInformation.tokenizeCard ? paymentInformation.tokenizeCard : false;
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

function handleOrder(basket, paymentInformation) {
    let currentBasket = basket;
    let cardErrors = {};
    let serverErrors = [];
    Transaction.wrap(function () {
        removeNonGiftPaymentInstruments(currentBasket);

        let paymentAmount = currentBasket.totalGrossPrice.value;
        if(FiservConfig.getCommerceHubGiftEnabled())
        {
            currentBasket.paymentInstruments.toArray().forEach((pi) => {
                if(pi.paymentMethod === constants.COMMERCEHUB_GIFT_PAYMENT_METHOD)
                {
                    paymentAmount -= pi.paymentTransaction.amount.value;
                }
            });
        }

        let paymentInstrument = currentBasket.createPaymentInstrument(PaymentInstrument.METHOD_CREDIT_CARD, new dw.value.Money(paymentAmount, 'USD'));
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