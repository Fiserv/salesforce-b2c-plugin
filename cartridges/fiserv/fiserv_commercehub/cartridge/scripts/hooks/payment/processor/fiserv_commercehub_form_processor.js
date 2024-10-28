'use strict';
let formHandler = require('*/cartridge/scripts/hooks/payment/processor/utils/commercehub_form_handler');

function processForm(req, paymentForm, viewFormData) {
    return formHandler.processForm(req, paymentForm, viewFormData);
}

/**
 * Payment instruments are saved after successful charges request
 * because payment token is only returned in CommerceHub charges response.
 * Saving payment instrument here and failling the tokenization would 
 * yield invalid saved instrument
 */
function savePaymentInformation(req, basket, billingData) {
    return;
}

exports.processForm = processForm;
exports.savePaymentInformation = savePaymentInformation;
