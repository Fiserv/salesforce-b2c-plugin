"use strict";

let server = require('server');
server.extend(module.superModule);

let csrfProtection = require('*/cartridge/scripts/middleware/csrf');
let savePaymentMiddleware = require('*/cartridge/controllers/middleware/save_payment');
let userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
let AccountModel = require('*/cartridge/models/account');
let CustomerMgr = require('dw/customer/CustomerMgr');
let Resource = require('dw/web/Resource');


server.prepend('SavePayment', userLoggedIn.validateLoggedIn, csrfProtection.validateAjaxRequest, savePaymentMiddleware.savePayment);

server.post('EarlyTokenization', userLoggedIn.validateLoggedIn, savePaymentMiddleware.savePaymentEarly);

server.append('List', function (req, res, next) {
    let paymentInstruments = req.currentCustomer.wallet.paymentInstruments;
    let UUIDRemoveList = paymentInstruments.filter((pi) => pi.raw.custom.forcedTokenization).map((pi) => pi.UUID);

    let displayedPayments = AccountModel.getCustomerPaymentInstruments(req.currentCustomer.wallet.paymentInstruments);
    displayedPayments = displayedPayments.filter((pi) => !UUIDRemoveList.includes(pi.UUID));

    res.viewData.paymentInstruments = displayedPayments;
    if(displayedPayments.length === 0)
    {
        res.viewData.noSavedPayments = true;
    }

    next();
});

server.append('DeletePayment', function (req, res, next) {
    this.on('route:BeforeComplete', function () {
        let customer = CustomerMgr.getCustomerByCustomerNumber(req.currentCustomer.profile.customerNo);
        let paymentInstruments = [];
        if(typeof(customer.getProfile().getWallet()) !== "undefined" &&
            typeof(paymentInstruments = customer.getProfile().getWallet().getPaymentInstruments()) !== "undefined" &&
            paymentInstruments.length !== 0
        ) {
            paymentInstruments = paymentInstruments.toArray().filter((pi) => !pi.custom.forcedTokenization);
        }

        if(paymentInstruments.length === 0)
        {
            res.viewData.message = Resource.msg('msg.no.saved.payments', 'payment', null)
        }
    });

    return next();
});

module.exports = server.exports();