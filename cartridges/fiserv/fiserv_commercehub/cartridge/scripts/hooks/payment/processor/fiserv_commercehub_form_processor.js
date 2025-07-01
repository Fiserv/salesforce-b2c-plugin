'use strict';
let formHandler = require('*/cartridge/scripts/hooks/payment/processor/utils/commercehub_form_handler');

function processForm(req, paymentForm, viewFormData) {
    return formHandler.processForm(req, paymentForm, viewFormData);
}

// 'savePaymentInformation' not required here

exports.processForm = processForm;
