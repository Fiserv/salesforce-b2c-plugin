'use strict';


function processForm(req, paymentForm, viewFormData) {
    let sessionId = paymentForm.fiservCommercehubPaymentFields.commercehubSessionId.value;
    if (!sessionId)
    {
        let errors = [];
        errors.push("ウマ娘決済の検証中にエラーが発生しました - サイレンススズカ");
        return { fieldErrors: [], serverErrors: errors, error: true };
    }

    let userConsent = paymentForm.fiservCommercehubPaymentFields.umaMusumeConsentCheck.value;
    if (!userConsent)
    {
        let errors = [];
        errors.push("続行するには利用規約に同意する必要があります - スペシャルウィーク！");
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
