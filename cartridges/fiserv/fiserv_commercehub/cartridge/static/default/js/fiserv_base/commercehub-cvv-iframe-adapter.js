'use strict';

/**
 * FiservCVVIframeAdapter - Adapter for CVV-only iFrame using Fiserv SDK
 * This adapter creates a secure iFrame for CVV input only (for stored payment instruments)
 * Now uses FiservSDKIframe with single field mode for code reuse
 */
class FiservCVVIframeAdapter extends FiservSDKIframe
{
    constructor(
        cardUUID,
        loadSuccessCallback,
        loadFailCallback,
        sdkReadyCallback,
        formValidCallback,
        formInvalidCallback,
        fieldValidityHandler,
        fieldFocusHandler
    ) {
        // Call parent constructor with null for callbacks we don't need in single field mode
        super(
            loadSuccessCallback,
            loadFailCallback,
            sdkReadyCallback,
            formValidCallback,
            formInvalidCallback,
            null, // cardBrandHandler - not needed for CVV-only
            fieldValidityHandler,
            fieldFocusHandler,
            null, // runSuccessCallback - not needed for CVV-only
            null, // runFailureCallback - not needed for CVV-only
            cardUUID
        );

        // CVV-specific form reference
        this.cvvForm = null;
    }

    initCVVField = function(formConfig)
    {
        // Use parent class buildFormConfig method with single field mode
        const cvvConfig = this.buildFormConfig(formConfig, "CREDIT_CARD", null);

        window.fiserv.components.paymentFields(cvvConfig)
            .then((form) => {
                this.form = form;
                this.cvvForm = form;
                this.loadSuccessCallback();
                this.sdkReadyCallback();
            })
            .catch((error) => {
                this.loadFailCallback(error);
            });
    }

    submitCVV = function(credentialsResponse, successCallback, failureCallback)
    {
        this.submitSingleField(credentialsResponse, successCallback, failureCallback);
    }

    destroyCVVIframe = function()
    {
        this.destroyIframe('cvv');
    }

    getCardUUID = function()
    {
        return this.cardUUID;
    }
}

