'use strict';

/**
 * FiservCVVIframeAdapter - Adapter for CVV-only iFrame using Fiserv SDK
 * This adapter creates a secure iFrame for CVV input only (for stored payment instruments)
 * Follows the same pattern as the credit card form implementation
 */
class FiservCVVIframeAdapter
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
        // CommerceHub SDK loaded separately by B2C SFRA assets.js
        if (typeof(window.fiserv) === "undefined")
        {
            throw new Error("CommerceHub SDK not found. Unable to create CVV collector.")
        }

        this.cardUUID = cardUUID;
        this.loadSuccessCallback = loadSuccessCallback;
        this.loadFailCallback = loadFailCallback;
        this.sdkReadyCallback = sdkReadyCallback;
        this.formValidCb = formValidCallback;
        this.formInvalidCb = formInvalidCallback;
        this.fieldValidityHandler = fieldValidityHandler;
        this.fieldFocusHandler = fieldFocusHandler;
        this.cvvForm = null;
    }

    initCVVField = function(formConfig)
    {
        const cvvConfig = this.buildCVVConfig(formConfig);

        window.fiserv.components.paymentFields(cvvConfig)
            .then((form) => {
                this.cvvForm = form;
                this.loadSuccessCallback();
                this.sdkReadyCallback();
            })
            .catch((error) => {
                this.loadFailCallback(error);
            });
    }

    buildCVVConfig = function(formConfigInput)
    {
        // Build configuration following the exact credit card form pattern
        let formCustomization = JSON.parse(JSON.stringify(formConfigInput.formCustomization));

        // Update the security code field parentElementId to use dynamic UUID
        if (formCustomization.fields && formCustomization.fields.securityCode) {
            formCustomization.fields.securityCode.parentElementId = `fiserv_commercehub-cvv-security-code-${this.cardUUID}`;
        }

        // Remove all other fields, keep only securityCode
        if (formCustomization.fields) {
            formCustomization.fields = {
                securityCode: formCustomization.fields.securityCode
            };
        }

        let config = {
            "data": formCustomization,
            "hooks": {
                "onFormValid": () => { this.formValidCb(); },
                "onFormNoLongerValid": () => { this.formInvalidCb(); },
                "onFieldValidityChange": (data) => { this.fieldValidityHandler(data); },
                "onFocus": (data) => { this.fieldFocusHandler(data); },
                "onLostFocus": (data) => { this.fieldFocusHandler(data); }
            }
        };

        // Add environment and paymentMethod to data (matching credit card pattern)
        config["data"]["environment"] = formConfigInput.environment;
        config["data"]["paymentMethod"] = "CREDIT_CARD";

        return config;
    }

    submitCVV = function(credentialsResponse, successCallback, failureCallback)
    {
        if (typeof this.cvvForm === "undefined" || !this.cvvForm)
        {
            failureCallback('CVV form not initialized');
            return;
        }

        this.cvvForm.submit(credentialsResponse['submitConfig'])
            .then((response) => {
                if (response && response.source)
                {
                    successCallback(response);
                }
            })
            .catch((error) => {
                console.log('CVV submission error:', error);
                failureCallback(error);
            });
    }

    destroyCVVIframe = function()
    {
        if (this.cvvForm)
        {
            // Remove iframe from the specific card container
            $(`#fiserv_commercehub-cvv-security-code-${this.cardUUID}`).find("iframe").remove();
            this.cvvForm = null;
        }
    }

    getCardUUID = function()
    {
        return this.cardUUID;
    }

    maskCVV = function()
    {
        if (this.cvvForm)
        {
            this.cvvForm.mask('securityCode', true);
        }
    }

    unmaskCVV = function()
    {
        if (this.cvvForm)
        {
            this.cvvForm.mask('securityCode', false);
        }
    }
}

