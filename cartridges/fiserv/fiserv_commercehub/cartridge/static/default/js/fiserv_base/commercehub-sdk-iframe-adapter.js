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
        runFailureCallback
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

        this.validity = false;
        this.fastlaneStatus = false;
        this.fastlaneInitStatus = false;
        this.fastlaneAuthResponse = null;
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
        let formConfig = {
            "data" : formConfigInput['formCustomization'],
            "hooks" : {
                "onFormValid" : () => { this.formValidCb(); },
                "onFormNoLongerValid" : () => { this.formInvalidCb(); },
                "onCardBrandChange" : (data) => { this.cardBrandHandler(data); },
                "onFieldValidityChange" : (data) => { this.fieldValidityHandler(data); },
                "onFocus" : (data) => { this.fieldFocusHandler(data); },
                "onLostFocus" : (data) => { this.fieldFocusHandler(data); }
            }
        };

        formConfig["data"]["environment"] =  formConfigInput['environment'];

        // Useful for Valuelink form differential (not necessary rn)
        formConfig["data"]["paymentMethod"] = formType;

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

    destroyIframe = function(formId)
    {
        $("#fiserv-commercehub-" + formId + "-form-container").find("iframe").remove();
        this.validity = false;
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
        if(this.form)
        {
            this.form.reset();
            this.validity = false;
        }
    }

    unmask = function(field)
    {
        this.form.mask(field, false);
    }

    mask = function(field)
    {
        this.form.mask(field, true);
    }


    isValid = function()
    {
        return this.validity;
    }

    setValidity = function(val)
    {
        this.validity = val;
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
