'use strict';


function processForm(req, paymentForm, viewFormData) {
    let sessionId = paymentForm.fiservCommercehubPaymentFields.commercehubSessionId.value;
    if(sessionId === undefined)
    {
        var errors = [];
        errors.push("There was an error validating your Apple Pay execution");
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
    }
}

exports.processForm = processForm;
