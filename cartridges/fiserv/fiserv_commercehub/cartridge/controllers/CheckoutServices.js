'use strict';

var server = require('server');

server.extend(module.superModule);


server.append('SubmitPayment', function (req, res, next) {
    this.on('route:BeforeComplete', function (req, res) {
        if(res.viewData.error)
            return;

        const fiservConfig = require('*/cartridge/scripts/utils/commercehubConfig');
        const fiservConstants = require('*/cartridge/fiservConstants/constants');
        const fiservHelper = require('*/cartridge/scripts/utils/fiservHelpers/primaryHelper');
        const fiservGiftHelper = require('*/cartridge/scripts/utils/fiservHelpers/giftHelper');

        // This is here to make sure that the listed payments being sent back to the frontend don't list the gift cards first
        // It is intended to be temporary code that is replaced with a better UI visualization for gift cards being applied to an order
        // If this is here a few months/years down the line from (Thursday, May 13th, 2025), then congratulations on graduating to legacy code
        if(fiservConfig.getCommerceHubGiftEnabled())
        {
            let selectedPaymentInstruments = res.viewData.order.billing.payment.selectedPaymentInstruments;
            if(selectedPaymentInstruments.length > 1)
            {
                var giftInstruments = selectedPaymentInstruments.filter((pi) => pi.paymentMethod === "GIFT_CARD");
                selectedPaymentInstruments = selectedPaymentInstruments.filter((pi) => pi.paymentMethod !== "GIFT_CARD").concat(giftInstruments);
                res.viewData.order.billing.payment.selectedPaymentInstruments = selectedPaymentInstruments;
            }

            fiservGiftHelper.correctGrandTotalResponseIncludingGiftCards(res);
        }

        let paymentMethod = res.viewData.paymentMethod.value;
        if(paymentMethod === fiservConstants.PAYMENT_METHOD_LIST.COMMERCEHUB_APPLEPAY_PAYMENT_METHOD && fiservHelper.isApplePayFiserv())
        {
            // Fake an error to prevent a page load...
            res.viewData.error = true;
            res.viewData.fieldErrors = [];
            res.viewData.serverErrors = [];

            let URLUtils = require('dw/web/URLUtils');
            res.viewData['placeOrderURL'] = URLUtils.url('CheckoutServices-PlaceOrder').toString();
            res.viewData['isApplePaySuccess'] = true;
            return;
        }

        if(paymentMethod !== "CREDIT_CARD" || !fiservHelper.isCreditCardFiserv())
        {
            return;
        }
        if(req.currentCustomer.profile !== undefined)
        {
            const AccountModel = require('*/cartridge/models/account');
            const CustomerMgr = require('dw/customer/CustomerMgr');
            const RenderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');
            
            let profile = CustomerMgr.getCustomerByCustomerNumber(req.currentCustomer.profile.customerNo).getProfile();
            let paymentInstruments = null;
            if(typeof(profile.getWallet()) !== "undefined" &&
                typeof(paymentInstruments = profile.getWallet().getPaymentInstruments()) !== "undefined" &&
                paymentInstruments.length !== 0
            ) {
                let displayedPayments = new AccountModel(req.currentCustomer).customerPaymentInstruments;
                let UUIDRemoveList = null;
                if(!fiservConfig.getCommerceHubTokenization())
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
                res.viewData.renderedPaymentInstruments = RenderTemplateHelper.getRenderedHtml(context, 'checkout/billing/storedPaymentInstruments') || null;
            }
        }
    });

    return next();
});

module.exports = server.exports();
