'use strict';

// This class is for sdk form constructions
class FiservSDKIframe
{
    // load success callback fires on successful load of the CommerceHub SDK
    // load fail callback fires on failure to load the CommerceHub SDK
    // sdk ready callback fires when form is successfully loaded
    // form valid callback fires when form is marked valid
    // form invalid callback fires when form is marked invalid
    // run success callback fires when card is successfully tokenized
    // run failure callback fires when card fails to tokenize
    // cardUUID: optional parameter for CVV-only mode (single field for stored cards)
    constructor(
        loadSuccessCallback,
        loadFailCallback,
        sdkReadyCallback,
        formValidCallback,
        formInvalidCallback,
        cardBrandHandler,
        fieldValidityHandler,
        fieldFocusHandler,
        runSuccessCallback,
        runFailureCallback,
        cardUUID = null
    ) {
        // CommerceHub SDK loaded separately by B2C SFRA assets.js
        if (typeof(window.fiserv) === "undefined")
        {
            throw new Error("CommerceHub SDK not found. Unable to create CommerceHub Hosted Payment Page.")
        }

        this.loadSuccessCallback = loadSuccessCallback;
        this.loadFailCallback = loadFailCallback;
        this.sdkReadyCallback = sdkReadyCallback;
        this.formValidCb = formValidCallback;
        this.formInvalidCb = formInvalidCallback
        this.cardBrandHandler = cardBrandHandler;
        this.fieldValidityHandler = fieldValidityHandler;
        this.fieldFocusHandler = fieldFocusHandler;
        this.runSuccessCallback = runSuccessCallback;
        this.runFailureCallback = runFailureCallback;

        this.fastlaneStatus = false;
        this.fastlaneInitStatus = false;
        this.fastlaneAuthResponse = null;

        // CVV-only mode properties
        this.cardUUID = cardUUID;
        this.isSingleFieldMode = cardUUID !== null;
    }

    initSdk = function(formConfig, formType, fastlaneObject)
    {
        window.fiserv.components.paymentFields(this.buildFormConfig(formConfig, formType, fastlaneObject))
            .then((next) => {
                this.fastlaneStatus = fastlaneObject !== undefined;
                this.fastlaneInitStatus = false;
                this.form = next;
                this.loadSuccessCallback();
                this.iframeActive = true;
                this.sdkReadyCallback();
            })
            .catch((error) => {
                this.loadFailCallback(error);
            });
    }

    buildFormConfig = function(formConfigInput, formType, fastlaneObject)
    {
        // In single field mode (CVV-only), modify the config for single field
        let formCustomization;
        if (this.isSingleFieldMode && formConfigInput['formCustomization']) {
            // Deep clone to avoid modifying original config
            formCustomization = JSON.parse(JSON.stringify(formConfigInput['formCustomization']));
            // Update parentElementId for CVV field with card UUID
            if (formCustomization.fields && formCustomization.fields.securityCode) {
                formCustomization.fields.securityCode.parentElementId = `fiserv_commercehub-cvv-security-code-${this.cardUUID}`;
            }
            // Keep only securityCode field
            if (formCustomization.fields) {
                formCustomization.fields = {
                    securityCode: formCustomization.fields.securityCode
                };
            }
        } else {
            formCustomization = formConfigInput['formCustomization'];
        }

        let formConfig = {
            "data" : formCustomization,
            "hooks" : {
                "onFormValid" : () => { this.formValidCb(); },
                "onFormNoLongerValid" : () => { this.formInvalidCb(); },
                "onCardBrandChange" : (data) => { this.cardBrandHandler(data); },
                "onFieldValidityChange" : (data) => { this.fieldValidityHandler(data); },
                "onFocus" : (data) => { this.fieldFocusHandler(data); },
                "onLostFocus" : (data) => { this.fieldFocusHandler(data); }
            }
        };

        // In single field mode, use default hooks without card brand handler
        if (this.isSingleFieldMode) {
            formConfig.hooks = {
                "onFormValid" : () => { this.formValidCb(); },
                "onFormNoLongerValid" : () => { this.formInvalidCb(); },
                "onFieldValidityChange" : (data) => { this.fieldValidityHandler(data, this.cardUUID); },
                "onFocus" : (data) => { this.fieldFocusHandler(data, this.cardUUID); },
                "onLostFocus" : (data) => { this.fieldFocusHandler(data, this.cardUUID); }
            };
        }

        formConfig["data"]["environment"] =  formConfigInput['environment'];

        // Useful for Valuelink form differential (not necessary rn)
        formConfig["data"]["paymentMethod"] = formType || "CREDIT_CARD";

        if(fastlaneObject)
        {
            formConfig["paypalFastlane"] = fastlaneObject;
        }

        return formConfig;
    }

    submitForm = function(credentialsUrl, storeSessionCallback, requestPurpose = null)
    {
        if (this.form !== "undefined" && this.iframeActive === true)
        {
            let promise = new Promise((resolve, reject) => {
                FiservSDKHelper.backendCall(credentialsUrl, resolve, reject, { requestPurpose: requestPurpose });
            });

            promise.then(async (credentialsResponse) => {
                storeSessionCallback(credentialsResponse['sessionId']);

                if(requestPurpose === "3DS") {
                    await window.fiserv.init(FiservSDKHelper.buildInitConfig(credentialsResponse));
                    window.fiservPluginSDKInitRan = true;
                }

                this.form.submit(credentialsResponse['submitConfig'])
                    .then((response) => {
                        this.runSuccessCallback(response);
                    })
                    .catch((error) => {
                        this.runFailureCallback();
                    })
            })
            .catch((error) => {
                this.runFailureCallback();
            });
        }
    }

    // Method for CVV-only submission (single field mode)
    submitSingleField = function(credentialsResponse, successCallback, failureCallback)
    {
        if (typeof this.form === "undefined" || !this.form)
        {
            failureCallback('Form not initialized');
            return;
        }

        this.form.submit(credentialsResponse['submitConfig'])
            .then((response) => {
                if (response && response.source)
                {
                    successCallback(response);
                }
            })
            .catch((error) => {
                console.log('Single field submission error:', error);
                failureCallback(error);
            });
    }

    destroyIframe = function(formId)
    {
        if (this.isSingleFieldMode && this.cardUUID) {
            // For CVV-only mode, target the specific card container
            $(`#fiserv_commercehub-cvv-security-code-${this.cardUUID}`).find("iframe").remove();
        } else {
            $("#fiserv-commercehub-" + formId + "-form-container").find("iframe").remove();
        }
    }

    reactivateIframe = function(formId)
    {
        this.iframeActive = true;
        $("#fiserv-commercehub-" + formId + "-form-container").find("iframe").show();
    }

    deactivateIframe = function()
    {
        if (typeof(this.form) !== "undefined")
        {
            $("#fiserv-commercehub-card-form-container").find("iframe").hide();
            this.iframeActive = false;
        }
    }

    resetForm = function()
    {
        this.form.reset();
    }

    unmask = function(field)
    {
        this.form.mask(field, false);
    }

    mask = function(field)
    {
        this.form.mask(field, true);
    }

    // CVV-only masking methods
    maskCVV = function()
    {
        if (this.form && this.isSingleFieldMode)
        {
            this.form.mask('securityCode', true);
        }
    }

    unmaskCVV = function()
    {
        if (this.form && this.isSingleFieldMode)
        {
            this.form.mask('securityCode', false);
        }
    }

    getFastlaneStatus = function()
    {
        return this.fastlaneStatus;
    }

    setFastlaneStatus = function(newStatus)
    {
        this.fastlaneStatus = newStatus;
    }

    getFastlaneInitStatus = function()
    {
        return this.fastlaneInitStatus;
    }

    setFastlaneInitStatus = function(newStatus)
    {
        this.fastlaneInitStatus = newStatus;
    }

    getFastlaneAuthResponse = function()
    {
        return this.fastlaneAuthResponse;
    }

    setFastlaneAuthResponse = function(newAuthResponse)
    {
        this.fastlaneAuthResponse = newAuthResponse;
    }
}
