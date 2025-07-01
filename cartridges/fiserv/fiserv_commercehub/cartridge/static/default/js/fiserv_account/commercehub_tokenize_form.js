"use strict"

class CommercehubTokenizationForm
{
    constructor(formConfigUrl, credentialsUrl) 
    {
        if (typeof(formConfigUrl) === "undefined" || typeof(credentialsUrl) === "undefined")
        {
            throw new Error("Credentials endpoint not found. Unable to create CommerceHub Hosted Payment Page.");
        }
        this.formConfigUrl = formConfigUrl;
        this.credsUrl = credentialsUrl;
    }
    
    initialize = function()
    {
        try {
            $.spinner().start();
            this.createAdapter();
            this.initializeAdapter();
            this.watchSubmitButton();
        } catch (_err) {
            this.sdkLoadFailure(_err);
        }
    }

    createAdapter = function()
    {
        let loadSuccessCallback = () => { console.log("CommerceHub SDK has loaded."); };
        let loadFailCallback = (error) => { this.sdkLoadFailure(error); };
        let formReadyCallback = () => { this.sdkInitialized() };
        let formValidCallback = () => { this.getSubmitButton().prop('disabled', false); };
        let formInvalidCallback = () => { this.getSubmitButton().prop('disabled', true); };
        let cardBrandHandler = (brand) => { this.cardBrandChangeHandler(brand) };
        let fieldValidityHandler = (data) => { this.fieldValidityHandler(data); };
        let fieldFocusHandler = (data) => { this.fieldFocusHandler(data) };
        let runSuccessCallback = (responseBody) => { this.cardCaptureSuccess(responseBody); };
        let runFailureCallback = (error) => { this.cardCaptureFailure(error); };

        this.formAdapter = new FiservIframe(
            loadSuccessCallback,
            loadFailCallback,
            formReadyCallback,
            formValidCallback,
            formInvalidCallback,
            cardBrandHandler,
            fieldValidityHandler,
            fieldFocusHandler,
            runSuccessCallback,
            runFailureCallback);
    }

    initializeAdapter = function()
    {
        this.clearValidation();

        let promise = new Promise((resolve, reject) => {
            this.formAdapter.backendCall(this.formConfigUrl, resolve, reject);	
        });

        promise.then((formConfig) => 
        {
            this.formConfig = formConfig;
            this.configDataTokenization = formConfig.configData;
            this.formAdapter.initSdk(formConfig);
            $('#sdc-mask-cardNumber, #sdc-mask-securityCode').on('click', (element) => {this.mask(element);});
        }).catch((err) => 
        {
            console.log(err);
            throw new Error(err);
        });
    }

    clearValidation = function()
    {
        this.getSubmitButton().prop('disabled', true);
        $('#sdc-card-brand-icon').removeClass().addClass('sdc-card-brand-icon');
        $('#sdc-card-number-frame, #sdc-card-name-frame, #sdc-security-code-frame, #sdc-exp-month-frame, #sdc-exp-year-frame')
            .removeClass('sdc-valid-field sdc-error-field sdc-focused-field');
        $('#sdc-card-number-invalid-message, #sdc-card-name-invalid-message, #sdc-security-code-invalid-message, #sdc-exp-month-invalid-message, #sdc-exp-year-invalid-message')
            .addClass('sdc-hidden');
    }

    setSessionIdInput = function(sessionId)
    {
        $('input#commercehubSessionIdInput').val(sessionId);
    }

    getSubmitButton = function() 
    {
        return $('button.btn.btn-primary.btn-block.btn-save');
    }

    getSccContainer = function()
    {
        return $('#fiserv-commercehub-card-form-container');
    }

    getFatalNotice = function()
    {
        return $('#fiserv-scc-fatal-notice');
    }

    sdkInitialized = function() 
    {
        $.spinner().stop();
    }

    sdkLoadFailure = function (err) 
    {
        console.log(err);
        this.disableSubmitButton();
        this.getFatalNotice().show();
        $.spinner().stop(); 
        throw new Error("Unable to load CommerceHub SDK.")
    }

    cardCaptureSuccess = function(responseBody)
    {
        // Need to figure out the card Details at some point...
        $.spinner().stop();
        
        this.getSubmitButton().trigger('click');
        // Re-watch submit button in case of error further down the line
        this.watchSubmitButton();
    }

    showError = function(message)
    {
        let form = $('.payment-form');
        $('.alert', form).remove();
        form.prepend('<div class="alert alert-danger" role="alert">' + message + '</div>');
    }

    cardCaptureFailure = function(error)
    {
        this.formAdapter.destroyIframe('card');
        this.initializeAdapter();
        this.watchSubmitButton();
        this.showError(this.configDataTokenization.captureFailureMessage);
    }

    submitHandler = (_e) => 
    {
        _e.preventDefault();
        $.spinner().start();
        this.unwatchSubmitButton();
        this.formAdapter.submitForm(this.credsUrl, this.setSessionIdInput);
        return false; 
    }

    watchSubmitButton = function() 
    {
        this.getSubmitButton().on('click', this.submitHandler);
    }
    
    unwatchSubmitButton = function()
    {
        this.getSubmitButton().off('click', this.submitHandler);
    }

    disableSubmitButton = function ()
    {
        this.getSubmitButton().prop('disabled', true);
    }

    enableSubmitButton = function ()
    {
        this.getSubmitButton().prop('disabled', false);
    }

    getSdcFieldFrame = function(name)
    {
        switch(name)
        {
            case "cardNumber":
                return $('#sdc-card-number-frame');
            case "nameOnCard":
                return $('#sdc-card-name-frame');
            case "securityCode":
                return $('#sdc-security-code-frame');
            case "expirationMonth":
                return $('#sdc-exp-month-frame');
            case "expirationYear":
                return $('#sdc-exp-year-frame');
        }

        return undefined;
    }

    getSdcFieldInvalidMessageContainer = function(name)
    {
        switch(name)
        {
            case "cardNumber":
                return $('#sdc-card-number-invalid-message');
            case "nameOnCard":
                return $('#sdc-card-name-invalid-message');
            case "securityCode":
                return $('#sdc-security-code-invalid-message');
            case "expirationMonth":
                return $('#sdc-exp-month-invalid-message');
            case "expirationYear":
                return $('#sdc-exp-year-invalid-message');
        }               

        return undefined;
    }

    getSdcInvalidFieldMessageText = function(name)
    {
        let invalidFields = this.formConfig['invalidFields'];

        switch(name)    
        {       
            case "cardNumber":
                return invalidFields["cardNumber"];
            case "nameOnCard":
                return invalidFields["nameOnCard"];
            case "securityCode":
                return invalidFields["securityCode"];
            case "expirationMonth":
                return invalidFields["expirationMonth"];
            case "expirationYear":
                return invalidFields["expirationYear"];
        }

        return "";
    }

    setCardBrandIconClass = function(cssClass) {
        let icon = $('#sdc-card-brand-icon');
        icon.removeClass();
        icon.addClass('sdc-card-brand-icon');
        if (typeof(cssClass) !== "undefined")
        {
            icon.addClass(cssClass);
        }
    }

    cardBrandChangeHandler = function(brand)
    {
        switch (brand) {
            case null:
                this.setCardBrandIconClass();
                break;
            case 'visa':
                this.setCardBrandIconClass('sdc-card-brand-icon-visa');
                break;
            case 'mastercard':
                this.setCardBrandIconClass('sdc-card-brand-icon-mastercard');
                break;
            case 'american-express':
                this.setCardBrandIconClass('sdc-card-brand-icon-amex');
                break;
            case 'diners-club':
                this.setCardBrandIconClass('sdc-card-brand-icon-diners');
                break;
            case 'discover':
                this.setCardBrandIconClass('sdc-card-brand-icon-discover');
                break;
            case 'jcb':
                this.setCardBrandIconClass('sdc-card-brand-icon-jcb');
                break;
            case 'unionpay':
                this.setCardBrandIconClass('sdc-card-brand-icon-union');
                break;
            case 'maeestro':
                this.setCardBrandIconClass('sdc-card-brand-icon-maeestro');
                break;
            case 'elo':
                this.setCardBrandIconClass('sdc-card-brand-icon-elo');
                break;
        }
    }

    fieldValidityHandler = function(data)
    {
        let frame = this.getSdcFieldFrame(data["field"]);
        let mess = this.getSdcFieldInvalidMessageContainer(data["field"]);

        if (typeof(frame) !== "undefined")
        {
            if (data["isValid"] === true)
            {
                frame.removeClass('sdc-error-field');
                frame.addClass('sdc-valid-field');
                mess.addClass('sdc-hidden');
            } else if (data["shouldShowError"] === true)
            {
                mess.text(this.getSdcInvalidFieldMessageText(data["field"]));
                frame.removeClass('sdc-valid-field');
                frame.addClass('sdc-error-field');
                mess.removeClass('sdc-hidden');
            } else
            {
                frame.removeClass('sdc-valid-field');
                frame.removeClass('sdc-error-field');
                mess.addClass('sdc-hidden');
            }
        }
    }

    fieldFocusHandler = function (data)
    {
        let frame = this.getSdcFieldFrame(data);
        
        if(typeof(frame) !== "undefined")
        {
            if(frame[0].contains(document.activeElement) === true)
            {
                frame.addClass('sdc-focused-field');
            }
            else
            {
                frame.removeClass('sdc-focused-field');
            }
        }
    }

    mask = function(element)
    {
        element.preventDefault();

        let field = element.target;
        let id = field.id.replace(/sdc-mask-/, "");
        let jQueryObject = $('#' + field.id);

        if(jQueryObject.hasClass('sdc-unmasking-icon'))
        {
            jQueryObject.removeClass('sdc-unmasking-icon');
            jQueryObject.addClass('sdc-masking-icon');
            this.formAdapter.unmask(id);
        }
        else
        {
            jQueryObject.removeClass('sdc-masking-icon');
            jQueryObject.addClass('sdc-unmasking-icon');
            this.formAdapter.mask(id);
        }
    }
}