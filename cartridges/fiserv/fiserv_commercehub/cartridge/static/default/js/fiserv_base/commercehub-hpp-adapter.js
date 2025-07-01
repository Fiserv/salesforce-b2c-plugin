"use strict"

class FiservIframe
{
    // load success callback fires on successful load of the CommerceHub SDK
    // load fail callback fires on failure to load the CommerceHub SDK
    // form ready callback fires when form is successfully loaded
    // form valid callback fires when form is marked valid
    // form invalid callback fires when form is marked invalid
    // run success callback fires when card is successfully tokenized
    // run failure callback fires when card fails to tokenize
    constructor(
        loadSuccessCallback, 
        loadFailCallback,
        formReadyCallback, 
        formValidCallback, 
        formInvalidCallback,
        cardBrandHandler,
        fieldValidityHandler,
        fieldFocusHandler,
        runSuccessCallback,
        runFailureCallback) 
    {
        // CommerceHub SDK loaded separately by B2C SFRA assets.js
        if (typeof(window.fiserv) === "undefined")
        {
            throw new Error("CommerceHub SDK not found. Unable to create CommerceHub Hosted Payment Page.")
        }

        this.loadSuccessCallback = loadSuccessCallback;
        this.loadFailCallback = loadFailCallback;
        this.formReadyCb = formReadyCallback;
        this.formValidCb = formValidCallback;
        this.formInvalidCb = formInvalidCallback
        this.cardBrandHandler = cardBrandHandler;
        this.fieldValidityHandler = fieldValidityHandler;
        this.fieldFocusHandler = fieldFocusHandler;
        this.runSuccessCallback = runSuccessCallback;
        this.runFailureCallback = runFailureCallback;
    }

    initSdk = function(formConfig, formType)
    {
        window.fiserv.components.paymentFields(this.buildFormConfig(formConfig, formType))
            .then((next) => {
                this.form = next;
                this.loadSuccessCallback();
                this.iframeActive = true;
                this.formReadyCb();
            })
            .catch((error) => {
                this.loadFailCallback(error);
            });
    }

    buildFormConfig = function(formConfigInput, formType)
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

        return formConfig;
    }

    backendCall = function(backendUrl, successCb, failureCb, data = null)
    {
        $.ajax({
            url: backendUrl,
            cache: false,
            dataType: 'json',
            type: "POST",
            data: data,
            success: function(response) {
                successCb(response);
            },
            error: function(err) {
                failureCb(err)
            }
        });
    }

    submitForm = function(credentialsUrl, storeSessionCallback)
    {
        if (this.form !== "undefined" && this.iframeActive === true)
        {
            let promise = new Promise((resolve, reject) => {
                this.backendCall(credentialsUrl, resolve, reject);	
            });

            promise.then((credentialsResponse) => {
                storeSessionCallback(credentialsResponse['sessionId']);
                this.form.submit(credentialsResponse['submitConfig'])
                    .then((response) => {
                        this.runSuccessCallback(response);
                    })
                    .catch((error) => {
                        this.runFailureCallback(error);
                    })
            })
            .catch((error) => {
                this.runFailureCallback(error);
            });
        }
    }

    destroyIframe = function(formId)
    {
        $("#fiserv-commercehub-" + formId + "-form-container").find("iframe").remove();
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

    unmask = function(field)
    {
        this.form.mask(field, false);
    }

    mask = function(field)
    {
        this.form.mask(field, true);
    }
}
