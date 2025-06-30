'use strict';

var server = require('server');

server.extend(module.superModule);

server.append('Show', function (req, res, next) {
    let paymentInstruments = null;
    if(typeof(req.currentCustomer.wallet) !== "undefined" &&
        typeof(paymentInstruments = req.currentCustomer.wallet.paymentInstruments) !== "undefined" &&
        paymentInstruments.length !== 0
    ) {
        let payment = null;
        for(let i = 0; i < paymentInstruments.length; i++)
        {
            if(!paymentInstruments[i].raw.custom.forcedTokenization)
            {
                payment = {
                    maskedCreditCardNumber: paymentInstruments[i].maskedCreditCardNumber,
                    creditCardType: paymentInstruments[i].creditCardType,
                    creditCardExpirationMonth: paymentInstruments[i].creditCardExpirationMonth,
                    creditCardExpirationYear: paymentInstruments[i].creditCardExpirationYear
                }
            }
        }

        res.viewData.payment = payment;
    }

    next();
});

module.exports = server.exports();
