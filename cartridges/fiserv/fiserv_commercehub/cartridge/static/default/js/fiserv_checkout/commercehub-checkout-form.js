"use strict"

class CommercehubCheckoutForm
{
    constructor(formConfigUrl, credentialsUrl, tokenizationUrl) 
    {
        if (typeof(formConfigUrl) === "undefined" || typeof(credentialsUrl) === "undefined")
        {
            throw new Error("Credentials endpoint not found. Unable to create CommerceHub Hosted Payment Page.");
        }
        this.formConfigUrl = formConfigUrl;
        this.credsUrl = credentialsUrl;
        this.tokenizationUrl = tokenizationUrl;
    }
    
    initialize = function()
    {
        try {
            $.spinner().start();
            this.createAdapter();
            this.initializeAdapter();
            this.watchSubmitButton();
            this.watchPaymentMethods();               
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
            this.configDataPaymentCard = formConfig.configData;
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
        if($('input[name=dwfrm_billing_paymentMethod]').val() === 'CREDIT_CARD')
        {
            this.getSubmitButton().prop('disabled', true);
        }
        $('#sdc-card-brand-icon').removeClass().addClass('sdc-card-brand-icon');
        $('#sdc-card-number-frame, #sdc-card-name-frame, #sdc-security-code-frame, #sdc-exp-month-frame, #sdc-exp-year-frame')
            .removeClass('sdc-valid-field sdc-error-field sdc-focused-field');
        $('#sdc-card-number-invalid-message, #sdc-card-name-invalid-message, #sdc-security-code-invalid-message, #sdc-exp-month-invalid-message, #sdc-exp-year-invalid-message')
            .addClass('sdc-hidden');
    }

    activateCommercehubForm = function()
    {
        this.formAdapter.reactivateIframe('card');
        this.watchSubmitButton()
        this.getSubmitButton().prop('disabled', true);
    }
    
    deactivateCommercehubForm = function()
    {
        this.formAdapter.deactivateIframe();
        this.unwatchSubmitButton();
        this.getSubmitButton().prop('disabled', false);
    }

    setSessionIdInput = function(sessionId)
    {
        $('input#commercehubSessionIdInput').val(sessionId);
    }

    getSubmitButton = function() 
    {
        return $('button.btn.btn-primary.btn-block.submit-payment');
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

    cardCaptureSuccess = async function(responseBody)
    {
        let cardDetails = responseBody.source.card;
        $('#cardNumber').val(cardDetails.last4.padStart(16, '*'));
        $("#expirationMonthValue").attr("value", cardDetails.expirationMonth);
        $("#expirationMonth").val(cardDetails.expirationMonth);
        $("#expirationYearValue").attr("value", cardDetails.expirationYear);
        $("#expirationYear").val(cardDetails.expirationYear);

        if(this.configDataPaymentCard.tokenizeEarly && $('input#saveCreditCard').length && $('input#saveCreditCard')[0].checked)
        {
            try {
                await new Promise((resolve, reject) => {
                    this.formAdapter.backendCall(this.tokenizationUrl, resolve, reject, { sessionId : $('input#commercehubSessionIdInput')[0].value })
                }).then((response) => 
                {
                    if(response.error)
                    {
                        throw new Error(response.error[0]);
                    }
                    $('.payment-information').data('is-new-payment', false);
                    $('.selected-payment').removeClass('selected-payment');
                    $('#earlyTokenizeInjectedForm').data('uuid', response.uuid);
                    $('#earlyTokenizeInjectedForm').addClass('selected-payment');
                }).catch((err) => 
                {
                    console.log(err);
                    throw new Error(err);
                });
            } catch (e) {
                this.watchSubmitButton();
                this.showError(e.message);
                $.spinner().stop();
                return;
            }
        }

        $.spinner().stop();
        this.getSubmitButton().trigger('click');
    }

    showError = function(message)
    {
        let form = $('#dwfrm_billing');
        $('.alert', form).remove();
        form.prepend('<div class="alert alert-danger" role="alert">' + message + '</div>');
        $('.alert', form)[0].scrollIntoView({ block: 'center', behavior: 'smooth'});
    }

    cardCaptureFailure = function(error)
    {
        this.formAdapter.destroyIframe('card');
        this.initializeAdapter();
        this.watchSubmitButton();
        this.showError(this.configDataPaymentCard.captureFailureMessage);
        $.spinner().stop();
    }

    paymentMethodHandler = (_e) => { 
        if (
            $(_e.currentTarget).attr("data-method-id") !== 'CREDIT_CARD' && 
            $('a.credit-card-tab.active').length)
        {
            this.deactivateCommercehubForm();
        } 
        else if (
            $(_e.currentTarget).attr("data-method-id") === 'CREDIT_CARD' && 
            !$(_e.currentTarget).find("a.nav-link").hasClass('active'))
        {
            this.activateCommercehubForm();
        }
    }

    watchPaymentMethods = function()
    {
        $('ul.payment-options li.nav-item').on('click', this.paymentMethodHandler);
    }

    unwatchPaymentMethods = function()
    {
        $('ul.payment-options li.nav-item').off('click', this.paymentMethodHandler);
    }

    submitHandler = (_e) => 
    {
        if($('input[name=dwfrm_billing_paymentMethod]').val() === 'CREDIT_CARD')
        {
            _e.preventDefault();
            $.spinner().start();
            this.unwatchSubmitButton();
            this.formAdapter.submitForm(this.credsUrl, this.setSessionIdInput);
            return false;
        }
    }

    watchSubmitButton = function() 
    {
        this.getSubmitButton().one('click', this.submitHandler);
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

    resetForm = function()
    {
        this.formAdapter.destroyIframe('card');
        this.getFatalNotice().hide();
        this.getSccContainer().removeClass('initialized-scc-container');
        this.unwatchSubmitButton();
        this.unwatchPaymentMethods();
        this.enableSubmitButton();
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
            case 'visa':
                this.setCardBrandIconClass('sdc-card-brand-icon-visa');
                break;
            case 'mastercard':
                this.setCardBrandIconClass('sdc-card-brand-icon-mastercard');
                break;
            case 'american-express':
                brand = 'amex';
                this.setCardBrandIconClass('sdc-card-brand-icon-amex');
                break;
            case 'diners-club':
                brand = 'diners';
                this.setCardBrandIconClass('sdc-card-brand-icon-diners');
                break;
            case 'discover':
                this.setCardBrandIconClass('sdc-card-brand-icon-discover');
                break;
            case 'jcb':
                this.setCardBrandIconClass('sdc-card-brand-icon-jcb');
                break;
            case 'unionpay':
                brand = 'union';
                this.setCardBrandIconClass('sdc-card-brand-icon-union');
                break;
            case 'maeestro':
                this.setCardBrandIconClass('sdc-card-brand-icon-maeestro');
                break;
            case 'elo':
                this.setCardBrandIconClass('sdc-card-brand-icon-elo');
                break;
            default:
                brand = '';
                this.setCardBrandIconClass();
                break;
        }

        $('#cardType').val(brand);
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