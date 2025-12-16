'use strict';

const fiservConstants = require('*/cartridge/fiservConstants/constants');


function removeNonGiftPaymentInstruments(currentBasket) {
    const collections = require('*/cartridge/scripts/util/collections');
    collections.forEach(currentBasket.getPaymentInstruments(), function (item) {
        if(item.getPaymentMethod() !== fiservConstants.PAYMENT_METHOD_LIST.COMMERCEHUB_GIFT_PAYMENT_METHOD)
        {
            currentBasket.removePaymentInstrument(item);
        }
    });
}

function handleOrder(basket, paymentInformation, paymentMethodModel) {
    const Transaction = require('dw/system/Transaction');

    const fiservGiftHelper = require('*/cartridge/scripts/utils/fiservHelpers/giftHelper');

    let currentBasket = basket;
    let cardErrors = {};
    let serverErrors = [];
    Transaction.wrap(function () {
        removeNonGiftPaymentInstruments(currentBasket);

        let paymentAmount = fiservGiftHelper.retreiveNonGiftChargeAmount(currentBasket);

        let paymentInstrument = currentBasket.createPaymentInstrument(paymentMethodModel.methodID, new dw.value.Money(paymentAmount, 'USD'));

        paymentMethodModel.convertToB2cCardType(paymentInformation, paymentInstrument);
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