'use strict';

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
                orderId: paymentForm.fiservCommercehubPaymentFields.commercehubOrderId.value
            }
        }
    }
}

exports.processForm = processForm;
