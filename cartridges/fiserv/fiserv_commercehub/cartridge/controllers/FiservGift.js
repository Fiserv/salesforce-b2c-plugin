'use strict';

const server = require('server');

const fiservGift = require('*/cartridge/scripts/gift/fiservGift.js');


server.post('BalanceInquiry', function(req, res, next) {
    let balanceResponse = fiservGift.executeBalanceInquiry(req.form.sessionId);
    if(balanceResponse.error)
    {
        res.setStatusCode(400);
        res.json(balanceResponse);
    }
    else
    {
        // Need to account for currency precision and symbol
        res.json({
            balance: Number(balanceResponse.remainingBalance).toFixed(2),
            currencySymbol: '$',
        });
    }
    return next();
});

server.post('ApplyGiftCard', function(req, res, next) {
    const Resource = require('dw/web/Resource');

    const fiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");
    const fiservGiftHelper = require('*/cartridge/scripts/utils/fiservHelpers/giftHelper');

    // Check to see if gift card count is set to max number...
    let appliedGiftCards;
    try
    {
        appliedGiftCards = fiservGiftHelper.retrieveAppliedGiftCards();
    } catch(e) {
        res.setStatusCode(400);
        res.json({ error: Resource.msg('message.error.gift.genericApply', 'error', null) });
        return next();
    }

    if(appliedGiftCards.giftCardList.length >= fiservConfig.getCommerceHubGiftMaxCards())
    {
        res.setStatusCode(400);
        res.json({ error: Resource.msg('message.error.gift.maxGiftCards', 'error', null) });
        return next();
    }

    let balanceResponse = fiservGift.executeBalanceInquiry(req.form.primarySessionId);
    if(balanceResponse.error)
    {
        res.setStatusCode(400);
        res.json(balanceResponse);
    }
    else
    {
        // Return if gift card has no balance
        if(balanceResponse.remainingBalance === 0)
        {
            res.setStatusCode(400);
            res.json({ error: Resource.msg('message.error.gift.noBalance', 'error', null) });
            return next();
        }

        let applyResponse = fiservGift.applyGiftCard(balanceResponse, req.form.secondarySessionId);
        if(applyResponse.error)
        {
            res.setStatusCode(400);
        }
        res.json(applyResponse);
    }
    return next();
});

server.post('RemoveGiftCard', function(req, res, next) {
    const URLUtils = require('dw/web/URLUtils');

    let removeResponse = fiservGift.removeGiftCard(req.form.uuid);
    if(removeResponse.error)
    {
        res.setStatusCode(400);
    }
    else
    {
        removeResponse.redirectUrl = URLUtils.url('Checkout-Begin', 'stage', 'payment').toString();
    }
    res.json(removeResponse);
    return next();
});

server.post('RecalculateGiftCardAmounts', function(req, res, next) {
    let recalculateResponse = fiservGift.recalculateGiftCards();
    if(recalculateResponse.error)
    {
        res.setStatusCode(400);
    }
    res.json(recalculateResponse);
    return next();
});

module.exports = server.exports();