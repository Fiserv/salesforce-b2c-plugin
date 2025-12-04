'use strict';


function processForm(req, paymentForm, viewFormData) {
    let orderId = paymentForm.fiservCommercehubPaymentFields.commercehubOrderId.value;
    if(orderId === undefined)
    {
        var errors = [];
        errors.push("There was an error validating your PayPal execution");
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
                orderId: orderId
            }
        }
    }
}

exports.processForm = processForm;
