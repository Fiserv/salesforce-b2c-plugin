'use strict';

var server = require('server');
var CustomerMgr = require('dw/customer/CustomerMgr');
var AccountModel = require('*/cartridge/models/account');
var fiservHelper = require('*/cartridge/scripts/utils/fiservHelper');
var commercehubConfig = require('*/cartridge/scripts/utils/commercehubConfig');

var renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');

server.extend(module.superModule);

server.append('SubmitPayment', function (req, res, next) {
    this.on('route:BeforeComplete', function (req, res) {

        // This is here to make sure that the listed payments being sent back to the frontend don't list the gift cards first
        // It is intended to be temporary code that is replaced with a better UI visualization for gift cards being applied to an order
        // If this is here a few months/years down the line from (Thursday, May 13th, 2025), then congratulations on graduating to legacy code
        if(commercehubConfig.getCommerceHubGiftEnabled() && !res.viewData.error)
        {
            let selectedPaymentInstruments = res.viewData.order.billing.payment.selectedPaymentInstruments;
            if(selectedPaymentInstruments.length > 1)
            {
                var giftInstruments = selectedPaymentInstruments.filter((pi) => pi.paymentMethod === "GIFT_CARD");
                selectedPaymentInstruments = selectedPaymentInstruments.filter((pi) => pi.paymentMethod !== "GIFT_CARD").concat(giftInstruments);
                res.viewData.order.billing.payment.selectedPaymentInstruments = selectedPaymentInstruments;
            }

            // Overwrite the grand total value returned to the frontend
            let appliedGiftCards = fiservHelper.retrieveAppliedGiftCards();
            if(appliedGiftCards.giftCardList.length)
            {
                res.viewData.order.totals.grandTotal = appliedGiftCards.giftCardList[0].currencySymbol + appliedGiftCards.amountRemaining;
            }
        }

        if(!fiservHelper.isFiserv())
        {
            return next();
        }
        if(req.currentCustomer.profile !== undefined && !res.viewData.error)
        {
            let profile = CustomerMgr.getCustomerByCustomerNumber(req.currentCustomer.profile.customerNo).getProfile();
            let paymentInstruments = null;
            if(typeof(profile.getWallet()) !== "undefined" &&
                typeof(paymentInstruments = profile.getWallet().getPaymentInstruments()) !== "undefined" &&
                paymentInstruments.length !== 0
            ) {
                let displayedPayments = new AccountModel(req.currentCustomer).customerPaymentInstruments;
                let UUIDRemoveList = null;
                if(!commercehubConfig.getCommerceHubTokenization())
                {
                    UUIDRemoveList = paymentInstruments.toArray().filter((pi) => pi.getPaymentMethod() === "CREDIT_CARD").map((pi) => pi.getUUID());
                }
                else
                {
                    UUIDRemoveList = paymentInstruments.toArray().filter((pi) => pi.custom.forcedTokenization).map((pi) => pi.getUUID());
                }
                displayedPayments = displayedPayments.filter((pi) => !UUIDRemoveList.includes(pi.UUID));
                res.viewData.customer.customerPaymentInstruments = displayedPayments.length;
                
                let context = {
                    customer: {
                        customerPaymentInstruments: displayedPayments
                    }
                };
                res.viewData.renderedPaymentInstruments = renderTemplateHelper.getRenderedHtml(context, 'checkout/billing/storedPaymentInstruments') || null;
            }
        }
    });

    return next();
});

module.exports = server.exports();
