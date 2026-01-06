'use strict';

class CommercehubCheckoutForm
{
    constructor(initializationData) 
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize card form.");
        }
        this.formConfig = initializationData.config;
        this.configDataPaymentCard = initializationData.config.configData;
        this.credentialsUrl = initializationData.credentialsUrl;
        this.tokenizationUrl = initializationData.tokenizationUrl;
        this.isGuest = !initializationData.userLoggedIn;
        this.createAdapter();

        $('#sdc-mask-cardNumber, #sdc-mask-securityCode').on('click', (element) => {this.mask(element);});

        if(this.configDataPaymentCard.fastlaneEnabled && this.isGuest)
        {
            this.formAdapter.setFastlaneInitStatus(true);
            FiservFastlaneInitializer.initFastlane(this.credentialsUrl, this.formAdapter, this.formConfig);
        }

        this.watchSubmitResponse();
        this.watchPaymentMethods();
    }
    
    initialize = function()
    {
        try {
            if(this.formAdapter.getFastlaneInitStatus())
            {
                setTimeout(() => {
                    this.initialize();
                }, 1000);
                return;
            }
            if(!this.formAdapter.getFastlaneStatus() && !this.formAdapter.getFastlaneInitStatus())
            {
                $.spinner().start();
                this.initializeAdapter();
            }
            if($('.nav-link.credit-card-tab.active').length)
            {
                this.watchSubmitButtonForm();
            }
        } catch (_err) {
            this.sdkLoadFailure(_err);
        }
    }

    createAdapter = function()
    {
        let loadSuccessCallback = () => { console.log("CommerceHub SDK has loaded."); };
        let loadFailCallback = (error) => { this.sdkLoadFailure(error); };
        let formReadyCallback = () => { this.sdkInitialized() };
        let formValidCallback = () => { this.getSubmitButton().prop('disabled', false); this.validForm = true; };
        let formInvalidCallback = () => { this.getSubmitButton().prop('disabled', true); this.validForm = false; };
        let cardBrandHandler = (brand) => { this.cardBrandChangeHandler(brand) };
        let fieldValidityHandler = (data) => { this.fieldValidityHandler(data); };
        let fieldFocusHandler = (data) => { this.fieldFocusHandler(data) };
        let runSuccessCallback = (responseBody) => { this.cardCaptureSuccess(responseBody); };
        let runFailureCallback = (error) => { this.paymentProceedFailure(error); };

        this.formAdapter = new FiservSDKIframe(
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
        try
        {
            this.formAdapter.initSdk(this.formConfig);
        } 
        catch(err)
        {
            console.log(err);
            throw new Error(err);
        };
    }

    clearValidation = function()
    {
        if($('.tab-pane.active').find('input[name=dwfrm_billing_paymentMethod]').val() === 'CREDIT_CARD')
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
    }
    
    deactivateCommercehubForm = function()
    {
        this.formAdapter.deactivateIframe();
        this.unwatchSubmitButton();
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
        if(responseBody.source)
        {
            let cardDetails = responseBody.source.card;
            $('#cardNumber').val(cardDetails.last4.padStart(16, '*'));
            $("#expirationMonthValue").attr("value", cardDetails.expirationMonth);
            $("#expirationMonth").val(cardDetails.expirationMonth);
            $("#expirationYearValue").attr("value", cardDetails.expirationYear);
            $("#expirationYear").val(cardDetails.expirationYear);
        }
        else
        {
            FiservFastlaneInitializer.setCardInfoFromFastlane(this.formAdapter.getFastlaneAuthResponse());
        }

        let earlyFlowExecuted = false;
        if(this.configDataPaymentCard.tokenizeEarly && 
            (($('input#saveCreditCard').length && $('input#saveCreditCard')[0].checked) ||
            (this.configDataPaymentCard.tokenizeEarlyGuest && this.isGuest)))
        {
            try {
                await new Promise((resolve, reject) => {
                    FiservSDKHelper.backendCall(this.tokenizationUrl, resolve, reject, { sessionId : $('input#commercehubSessionIdInput')[0].value, cardType: $('#cardType')[0].value })
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
                    this.setSessionIdInput(null);

                    earlyFlowExecuted = true;
                }).catch((err) => 
                {
                    console.log(err);
                    throw new Error(err);
                });
            } catch (e) {
                this.paymentProceedFailure(e.message);
                return;
            }
        }
        
        if(this.configDataPaymentCard.use3DS)
        {
            if(earlyFlowExecuted)
            {
                this.perform3DSToken();
                return;
            }

            if(!(await this.execute3DS()))
                return;
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

    paymentProceedFailure = function(msg, isToken)
    {
        if(!isToken && !this.formAdapter.getFastlaneStatus() && !this.formAdapter.getFastlaneInitStatus())
        {
            this.formAdapter.destroyIframe('card');
            this.initializeAdapter();
        }
        this.watchSubmitButton();
        this.showError(msg ? msg : this.configDataPaymentCard.captureFailureMessage);
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
            if(!this.validForm && !$('.credit-card-form.checkout-hidden').length)
            {
                this.disableSubmitButton();
            }
        }
    }

    watchPaymentMethods = function()
    {
        $('ul.payment-options li.nav-item').on('click', this.paymentMethodHandler);
    }

    submitHandlerForm = (_e) => 
    {
        if($('.tab-pane.active').find('input[name=dwfrm_billing_paymentMethod]').val() === 'CREDIT_CARD')
        {
            _e.preventDefault();
            $.spinner().start();
            this.unwatchSubmitButton();
            this.formAdapter.submitForm(this.credentialsUrl, this.setSessionIdInput, this.configDataPaymentCard.use3DS ? "3DS" : null);
            return false;
        }
    }

    submitHandlerToken = (_e) =>
    {
        this.setSessionIdInput(null);

        if(!this.configDataPaymentCard.use3DS)
            return;

        _e.preventDefault();

        $.spinner().start();
        this.unwatchSubmitButtonToken();
        this.perform3DSToken();
        return false;
    }

    perform3DSToken = function()
    {
        new Promise((resolve, reject) => {
            FiservSDKHelper.backendCall(this.credentialsUrl, resolve, reject, { requestPurpose: "3DS", threeDSToken: $('.saved-payment-instrument.selected-payment').data('uuid') });
        })
        .then(async (credentialsResponse) =>
        {
            try {
                await window.fiserv.init(FiservSDKHelper.buildInitConfig(credentialsResponse));
                window.fiservPluginSDKInitRan = true;

                if(await this.execute3DS(true))
                {
                    $.spinner().stop();
                    this.getSubmitButton().trigger('click');
                    return;
                }
                
                $.spinner().stop();
                return false;
            }
            catch(e) {
                console.log(e);
                this.paymentProceedFailure(this.configDataPaymentCard.threeDSFailureMessage, true);
                return false;
            }
        })
        .catch((error) =>
        {
            console.log(error);
            this.showError(this.configDataPaymentCard.credentialsFailureMessage);
            this.watchSubmitButton();
            $.spinner().stop()
        });
    }

    watchSubmitResponse = function()
    {
        $(document).on("ajaxSuccess", $.proxy(this.onSubmitResponse, this));
    }

    onSubmitResponse = function(ev, xhr)
    {
        if (typeof(xhr.responseJSON) !== 'undefined' &&
            typeof(xhr.responseJSON.action) !== 'undefined' &&
            xhr.responseJSON.action === "CheckoutServices-SubmitPayment" &&
            $(".payment-information").data("payment-method-id") === "CREDIT_CARD" &&
            xhr.responseJSON.error
        ) {
            this.setSessionIdInput('');
            this.watchSubmitButton();
        }
    }

    watchSubmitButton = function()
    {
        if($('.credit-card-form.checkout-hidden').length)
        {
            this.unwatchSubmitButtonForm();
            this.watchSubmitButtonToken();
        }
        else
        {
            this.unwatchSubmitButtonToken();
            this.watchSubmitButtonForm();
        }
    }

    unwatchSubmitButton = function()
    {
        this.unwatchSubmitButtonForm();
        this.unwatchSubmitButtonToken();
    }

    watchSubmitButtonToken = function()
    {
        this.unwatchSubmitButtonForm();
        this.getSubmitButton().one('click', this.submitHandlerToken);
    }
    
    unwatchSubmitButtonToken = function()
    {
        this.getSubmitButton().off('click', this.submitHandlerToken);
    }

    watchSubmitButtonForm = function()
    {
        this.unwatchSubmitButtonToken();
        this.getSubmitButton().one('click', this.submitHandlerForm);
    }
    
    unwatchSubmitButtonForm = function()
    {
        this.getSubmitButton().off('click', this.submitHandlerForm);
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
        if(!this.formAdapter.getFastlaneStatus() && !this.formAdapter.getFastlaneInitStatus())
            this.formAdapter.destroyIframe('card');
        this.getFatalNotice().hide();
    }

    execute3DS = async function(isToken = false)
    {
        try {
            const { transactionState, authenticationTransactionId } = await window.fiserv.components.threeDSecure();
            if(transactionState === 'DECLINED') {
                this.paymentProceedFailure(this.configDataPaymentCard.threeDSFailureMessage, isToken);
                return false;
            }

            $('input#authenticationId3DSInput').val(authenticationTransactionId);
            return true;
        }
        catch(e) {
            this.paymentProceedFailure(this.configDataPaymentCard.threeDSFailureMessage, isToken);
            return false;
        }
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