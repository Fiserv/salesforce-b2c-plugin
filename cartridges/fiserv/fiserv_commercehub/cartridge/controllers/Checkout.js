'use strict';

var server = require('server');
var CustomerMgr = require('dw/customer/CustomerMgr');
var fiservHelper = require('*/cartridge/scripts/utils/fiservHelper');
let commercehubConfig = require('*/cartridge/scripts/utils/commercehubConfig');

server.extend(module.superModule);

server.append('Begin', function (req, res, next) {
    if(!fiservHelper.isFiserv())
    {
        return next();
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
            if(!commercehubConfig.getCommerceHubTokenization())
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

    return next();
});

module.exports = server.exports();