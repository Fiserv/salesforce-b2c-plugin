'use strict';

var server = require('server');
var fsGift = require('*/cartridge/scripts/gift/fiservGift.js');
let Resource = require('dw/web/Resource');
var FiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");
var fiservHelper = require('*/cartridge/scripts/utils/fiservHelper');

server.post('BalanceInquiry', function(req, res, next) {
    let balanceResponse = fsGift.executeBalanceInquiry(req.form.sessionId);
    if(balanceResponse.error)
    {
        res.setStatusCode(400);
        res.json(balanceResponse);
    }
    else
    {
        // Need to account for currency precision and symbol
        res.json({
            balance: Number(balanceResponse.endingBalance).toFixed(2),
            currencySymbol: '$',
            currency: balanceResponse.currency
        });
    }
    return next();
});

server.post('ApplyGiftCard', function(req, res, next) {
    // Check to see if gift card count is set to max number...
    let appliedGiftCards;
    try
    {
        appliedGiftCards = fiservHelper.retrieveAppliedGiftCards();
    } catch(e) {
        res.setStatusCode(400);
        res.json({ error: Resource.msg('message.error.gift.genericApply', 'error', null) });
        return next();
    }

    if(appliedGiftCards.giftCardList.length >= FiservConfig.getCommerceHubGiftMaxCards())
    {
        res.setStatusCode(400);
        res.json({ error: Resource.msg('message.error.gift.maxGiftCards', 'error', null) });
        return next();
    }

    let balanceResponse = fsGift.executeBalanceInquiry(req.form.primarySessionId);
    if(balanceResponse.error)
    {
        res.setStatusCode(400);
        res.json(balanceResponse);
    }
    else
    {
        // Return if gift card has no balance
        if(balanceResponse.endingBalance === 0)
        {
            res.setStatusCode(400);
            res.json({ error: Resource.msg('message.error.gift.noBalance', 'error', null) });
            return next();
        }

        let applyResponse = fsGift.applyGiftCard(balanceResponse, req.form.secondarySessionId);
        if(applyResponse.error)
        {
            res.setStatusCode(400);
        }
        res.json(applyResponse);
    }
    return next();
});

server.post('RemoveGiftCard', function(req, res, next) {
    let removeResponse = fsGift.removeGiftCard(req.form.uuid);
    if(removeResponse.error)
    {
        res.setStatusCode(400);
    }
    res.json(removeResponse);
    return next();
});

module.exports = server.exports();