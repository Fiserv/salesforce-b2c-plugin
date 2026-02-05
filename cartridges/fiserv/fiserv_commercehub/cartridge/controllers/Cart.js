'use strict';

const server = require('server');

const BasketMgr = require('dw/order/BasketMgr');
const Transaction = require('dw/system/Transaction');

const fiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");
const fiservGiftHelper = require('*/cartridge/scripts/utils/fiservHelpers/giftHelper');

server.extend(module.superModule);


// Update gift card values attached to basket if an item is added to the cart
server.append('AddProduct', function (req, res, next)
{
    if(fiservConfig.getCommerceHubGiftEnabled())
    {
        let basket = BasketMgr.getCurrentBasket()
        if(!basket)
        {
            return next();
        }

        Transaction.begin();
        fiservGiftHelper.recalculateGiftCardAmounts(basket);
        Transaction.commit();
    }

    return next();
});

// Remove all gift card payment instruments from basket if Item is removed from cart
// This is done to avoid situations where applied gift cards may be over-charged based on the initial predicted transaction amount
server.append('RemoveProductLineItem', function (req, res, next)
{
    if(fiservConfig.getCommerceHubGiftEnabled())
    {
        let basket = BasketMgr.getCurrentBasket()
        if(!basket)
        {
            return next();
        }

        Transaction.begin();
        fiservGiftHelper.recalculateGiftCardAmounts(basket);
        Transaction.commit();
    }

    return next();
});

server.append('UpdateQuantity', function (req, res, next)
{
    if(fiservConfig.getCommerceHubGiftEnabled())
    {
        let basket = BasketMgr.getCurrentBasket()
        if(!basket)
        {
            return next();
        }

        Transaction.begin();
        fiservGiftHelper.recalculateGiftCardAmounts(basket);
        Transaction.commit();
    }

    return next();
});

module.exports = server.exports();