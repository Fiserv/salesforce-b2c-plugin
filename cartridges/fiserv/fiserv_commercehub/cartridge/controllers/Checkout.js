'use strict';

const server = require('server');

server.extend(module.superModule);


server.append('Begin', function (req, res, next) {
    const fiservHelper = require('*/cartridge/scripts/utils/fiservHelpers/primaryHelper');

    if(!fiservHelper.isCreditCardFiserv())
    {
        return next();
    }

    const BasketMgr = require('dw/order/BasketMgr');
    const CustomerMgr = require('dw/customer/CustomerMgr');
    const Transaction = require('dw/system/Transaction');
    
    const fiservConfig = require('*/cartridge/scripts/utils/commercehubConfig');
    const fiservConstants = require('*/cartridge/fiservConstants/constants');

    let basket = BasketMgr.getCurrentBasket()
    if(!fiservConfig.getCommerceHubGiftEnabled())
    {
        if(basket && basket.paymentInstruments.length)
        {
            Transaction.wrap(function () {
                basket.paymentInstruments.toArray().forEach((pi) => {
                    if(pi.paymentMethod === fiservConstants.PAYMENT_METHOD_LIST.COMMERCEHUB_GIFT_PAYMENT_METHOD)
                    {
                        basket.removePaymentInstrument(pi);
                    }
                });
            });
        }
    }

    if(req.currentCustomer.profile !== undefined)
    {
        let profile = CustomerMgr.getCustomerByCustomerNumber(req.currentCustomer.profile.customerNo).getProfile();
        let paymentInstruments = null;
        if(typeof(profile.getWallet()) !== "undefined" &&
            typeof(paymentInstruments = profile.getWallet().getPaymentInstruments()) !== "undefined" &&
            paymentInstruments.length !== 0
        ) {
            let displayedPayments = res.viewData.customer.customerPaymentInstruments;
            let UUIDRemoveList = null;
            if(!fiservConfig.getCommerceHubTokenization())
            {
                UUIDRemoveList = paymentInstruments.toArray().filter((pi) => pi.getPaymentMethod() === "CREDIT_CARD").map((pi) => pi.getUUID());
            }
            else
            {
                UUIDRemoveList = paymentInstruments.toArray().filter((pi) => pi.custom.forcedTokenization).map((pi) => pi.getUUID());
            }
            res.viewData.customer.customerPaymentInstruments = displayedPayments.filter((pi) => !UUIDRemoveList.includes(pi.UUID));
        }
    }
    if(fiservConfig.getCommerceHubTokenization() && fiservConfig.getEarlyTokenization() && fiservConfig.getBasketTokenization())
    {
        if(!req.currentCustomer.profile)
        {
            res.viewData.customer.customerPaymentInstruments = [];
        }

        if(basket && basket.custom.commercehubBasketToken)
        {
            res.viewData.customer.customerPaymentInstruments = [fiservHelper.buildRenderedBasketTokenField(basket)].concat(res.viewData.customer.customerPaymentInstruments);
        }
    }

    if(basket)
    {
        basket.custom.commercehubEarlyTokenUUID = null;
    }

    return next();
});

module.exports = server.exports();