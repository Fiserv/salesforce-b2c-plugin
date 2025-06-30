'use strict';

// Does nothing. Used to bypass payment method for a covered cart in checkout flow
function processForm(req, paymentForm, viewFormData) {
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
            }
        }
    }
}

exports.processForm = processForm;
