'use strict';


function processForm(req, paymentForm, viewFormData) {
    let sessionId = paymentForm.fiservCommercehubPaymentFields.commercehubSessionId.value;
    if (!sessionId)
    {
        let errors = [];
        errors.push("There was an error validating your ACH execution");
        return { fieldErrors: [], serverErrors: errors, error: true };
    }

    let userConsent = paymentForm.fiservCommercehubPaymentFields.achConsentIndicator.value;
    if (!userConsent)
    {
        let errors = [];
        errors.push("Must agree to the terms in order to proceed");
        return { fieldErrors: [], serverErrors: errors, error: true };
    }

    return {
        error: false,
        viewData: {
            paymentMethod: {
                value: paymentForm.paymentMethod.value,
                htmlName: paymentForm.paymentMethod.value
            },
            address: viewFormData.address,
            phone: viewFormData.phone,
            paymentInformation: {
                isCreditCard: false,
                sessionId: sessionId
            }
        }
    };
}

exports.processForm = processForm;
