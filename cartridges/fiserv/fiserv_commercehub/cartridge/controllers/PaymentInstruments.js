"use strict";

let server = require('server');
server.extend(module.superModule);

let csrfProtection = require('*/cartridge/scripts/middleware/csrf');
let savePaymentMiddleware = require('*/cartridge/controllers/middleware/save_payment');

/*
* Prepends PaymentInstruments' 'SavePayment' function to handle saving a payment instrument
*  when the selected payment processor is Adyen.
*/
server.prepend('SavePayment', csrfProtection.validateAjaxRequest, savePaymentMiddleware.savePayment);

module.exports = server.exports();