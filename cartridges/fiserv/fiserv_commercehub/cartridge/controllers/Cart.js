'use strict';

let server = require('server');
let BasketMgr = require('dw/order/BasketMgr');
let Transaction = require('dw/system/Transaction');
let FiservHelper = require('*/cartridge/scripts/utils/fiservHelper');
let FiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");
let constants = require('*/cartridge/fiservConstants/constants');

server.extend(module.superModule);

// Update gift card values attached to basket if an item is added to the cart
server.append('AddProduct', function (req, res, next) {
    if(FiservConfig.getCommerceHubGiftEnabled())
    {
        let basket = BasketMgr.getCurrentBasket()
        if(!basket)
        {
            return next();
        }

        Transaction.begin();
        FiservHelper.recalculateGiftCardAmounts(basket);
        Transaction.commit();
    }

    return next();
});

// Remove all gift card payment instruments from basket if Item is removed from cart
// This is done to avoid situations where applied gift cards may be over-charged based on the initial predicted transaction amount
server.append('RemoveProductLineItem', function (req, res, next) {
    if(FiservConfig.getCommerceHubGiftEnabled())
    {
        let basket = BasketMgr.getCurrentBasket()
        if(!basket)
        {
            return next();
        }

        Transaction.begin();
        basket.paymentInstruments.toArray().forEach((pi) => {
            if(pi.paymentMethod === constants.COMMERCEHUB_GIFT_PAYMENT_METHOD)
            {
                basket.removePaymentInstrument(pi);
            }
        });
        Transaction.commit();
    }

    return next();
});

module.exports = server.exports();