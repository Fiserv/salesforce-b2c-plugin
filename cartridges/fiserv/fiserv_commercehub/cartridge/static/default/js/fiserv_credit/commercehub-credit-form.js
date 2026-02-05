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
        this.cvvEnabled = this.configDataPaymentCard.cvvEnabled;
        
        this.createAdapter();
        
        $('#sdc-mask-cardNumber, #sdc-mask-securityCode').on('click', (element) => {this.mask(element, this.formAdapter);});
        
        if(this.configDataPaymentCard.fastlaneEnabled && this.isGuest)
        {
            this.formAdapter.setFastlaneInitStatus(true);
            FiservFastlaneInitializer.initFastlane(this.credentialsUrl, this.formAdapter, this.formConfig);
        }
        
        this.watchSubmitResponse();
        this.watchPaymentMethods();
        
        if (this.cvvEnabled) this.initializeTokenCVVForms();
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
            if(!this.formAdapter.getFastlaneStatus())
            {
                $.spinner().start();
                this.initializeAdapter();
            }
            else if(!this.formAdapter.isValid())
            {
                this.getSubmitButton().prop('disabled', true);
            }
            if($('.nav-link.credit-card-tab.active').length)
            {
                this.watchSubmitButtonForm();
            }
        } catch (_err) {
            this.sdkLoadFailure(_err, "#fiserv-scc-fatal-notice");
        }
    }

    createAdapter = function()
    {
        let loadSuccessCallback = () => { console.log("CommerceHub SDK has loaded."); };
        let loadFailCallback = (error) => { this.sdkLoadFailure(error, "#fiserv-scc-fatal-notice"); };
        let formReadyCallback = () => { this.sdkInitialized() };
        let formValidCallback = () => { this.getSubmitButton().prop('disabled', false); this.validForm = true; };
        let formInvalidCallback = () => { this.getSubmitButton().prop('disabled', true); this.validForm = false; };
        let cardBrandHandler = (brand) => { this.cardBrandChangeHandler(brand) };
        let fieldValidityHandler = (data) => { 
            let frame = this.getSdcFieldFrame(data["field"]);
            let mess = this.getSdcFieldInvalidMessageContainer(data["field"]);

            this.fieldValidityHandler(data, frame, mess); 
        };
        let fieldFocusHandler = (data) => { 
            let frame = this.getSdcFieldFrame(data);
            this.fieldFocusHandler(frame) 
        };
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

    setTokenUUIDInput = function(uuid)
    {
        $('input#commercehubTokenUUIDInput').val(uuid);
    }

    getSubmitButton = function() 
    {
        return $('button.btn.btn-primary.btn-block.submit-payment');
    }

    getSccContainer = function()
    {
        return $('#fiserv-commercehub-card-form-container');
    }

    sdkInitialized = function() 
    {
        $.spinner().stop();
    }

    sdkLoadFailure = function (err, noticeId) 
    {
        console.log(err);
        this.disableSubmitButton();
        $(noticeId).show();
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
            (($('input#saveCreditCard').length && 
                ($('input#saveCreditCard')[0].checked || this.configDataPaymentCard.basketTokenization)) ||
            (this.configDataPaymentCard.tokenizeEarlyGuest && this.isGuest)))
        {
            try {
                await new Promise((resolve, reject) => {
                    let tokenizationPayload = {
                        sessionId : $('input#commercehubSessionIdInput')[0].value,
                        cardType: $('#cardType')[0].value
                    };

                    let saveCardCheckbox = $('input#saveCreditCard');
                    if(saveCardCheckbox.length)
                    {
                        tokenizationPayload.customerTokenizeChoice = saveCardCheckbox[0].checked;
                    }

                    FiservSDKHelper.backendCall(this.tokenizationUrl, resolve, reject, tokenizationPayload);
                }).then((response) => 
                {
                    if(response.error)
                    {
                        throw new Error(response.error[0]);
                    }
                    $('.payment-information').data('is-new-payment', false);
                    $('.selected-payment').removeClass('selected-payment');
                    $('#earlyTokenizeInjectedForm').attr('data-uuid', response.uuid);
                    $('#earlyTokenizeInjectedForm').data('uuid', response.uuid);
                    $('#earlyTokenizeInjectedForm').addClass('selected-payment');
                    this.setSessionIdInput(null);
                    this.setTokenUUIDInput(response.uuid);

                    $('.cancel-new-payment').removeClass('checkout-hidden');
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
            this.setTokenUUIDInput(null);
            this.formAdapter.submitForm(this.credentialsUrl, this.setSessionIdInput, this.configDataPaymentCard.use3DS ? "3DS" : null);
            return false;
        }
    }

    submitHandlerToken = (_e) =>
    {
        this.setSessionIdInput(null);
        this.setTokenUUIDInput($('.saved-payment-instrument.selected-payment').data('uuid'));

        if (this.cvvEnabled)
        {
            _e.preventDefault();
            if (!this.cvvAdapters[this.currentSelectedPaymentUUID]?.isValid()) return false;

            $.spinner().start();
            this.unwatchSubmitButtonToken();
            this.submitCVVForValidation();
            return false;
        }

        if(!this.configDataPaymentCard.use3DS) return;

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

    shouldEnableSubmitButtonOnCancelNewPayment = function ()
    {
        if (!this.cvvEnabled) return true;

        const selectedPayment = $('.saved-payment-instrument.selected-payment');
        if (selectedPayment.length > 0) 
        {
            const tokenForm = this.cvvAdapters[this.currentSelectedPaymentUUID ];
            return typeof(tokenForm) === "undefined" ? false : tokenForm.isValid();
        }
    }
    
    enableSubmitButton = function ()
    {
        this.getSubmitButton().prop('disabled', false);
    }

    disableSubmitButton = function ()
    {
        this.getSubmitButton().prop('disabled', true);
    }

    resetForm = function()
    {
        if(!this.formAdapter.getFastlaneStatus() && !this.formAdapter.getFastlaneInitStatus())
            this.formAdapter.destroyIframe('card');
        $('#fiserv-scc-fatal-notice').hide();
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

    fieldValidityHandler = function(data, frame, mess)
    {
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

    fieldFocusHandler = function (frame)
    {
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

    // fieldParameter is optional for the primary this.formAdapter of this file...
    mask = function(element, adapter, fieldParameter)
    {
        element.preventDefault();

        let field = element.target;
        let jQueryObject = $('#' + field.id);

        let id;
        if(!fieldParameter)
        {
            id = field.id.replace(/sdc-mask-/, "");
        }
        else
        {
            id = fieldParameter;
        }

        if(jQueryObject.hasClass('sdc-unmasking-icon'))
        {
            jQueryObject.removeClass('sdc-unmasking-icon');
            jQueryObject.addClass('sdc-masking-icon');
            adapter.unmask(id);
        }
        else
        {
            jQueryObject.removeClass('sdc-masking-icon');
            jQueryObject.addClass('sdc-unmasking-icon');
            adapter.mask(id);
        }
    }

    initializeTokenCVVForms = function()
    {
        this.cvvAdapters = {};
        this.currentSelectedPaymentUUID = null;
        $('[id^="fiserv_commercehub-cvv-security-code-"]').each(function () {
            $(this).empty();
        });
        
        this.watchSavedCardSelection();
        this.initializeTokenCVVFields();
    }
    
    initializeTokenCVVFields = function()
    {
        const tokens = $('.saved-payment-instrument');
        if (tokens.filter('[data-uuid]:not([data-uuid=""])').length > 0)
        {
            $.spinner().start();
                        
            tokens.each((idx, storedPayment) => {
                const paymentUUID = $(storedPayment).data('uuid');
                if (paymentUUID)
                {
                    this.createCVVFieldAdapter(paymentUUID);
                    this.watchCVVMaskingField(paymentUUID);
                }
            });
            $(".cvv-collector-container").hide();
            
            const selectedPayment = $('.saved-payment-instrument.selected-payment');
            if (selectedPayment.length > 0)
            {
                this.currentSelectedPaymentUUID = selectedPayment.data('uuid');
                selectedPayment.find(".cvv-collector-container").show();
                this.handleTokenFormValidity(this.currentSelectedPaymentUUID, false);
            }
        }
    }

    createCVVFieldAdapter = function(cardUUID)
    {
        if (!this.cvvEnabled || !cardUUID || this.cvvAdapters[cardUUID]) return;

        try
        {
            const loadSuccessCallback = () => { console.log(`CommerceHub CVV SDK loaded for card ${cardUUID}`); };
            const loadFailCallback = (error) => { this.sdkLoadFailure(error, `#cvv-fatal-notice-${ cardUUID }`); };
            const formReadyCallback = () => { this.sdkInitialized(); };
            const formValidCallback = () => { this.handleTokenFormValidity(cardUUID, true); };
            const formInvalidCallback = () => { this.handleTokenFormValidity(cardUUID, false); };
            const fieldValidityHandler = (data) => {
                let frame = $(`#cvv-security-code-frame-${ cardUUID }`);
                let mess = $(`#cvv-security-code-invalid-message-${ cardUUID }`);

                this.fieldValidityHandler(data, frame, mess);
            };
            const fieldFocusHandler = () => {
                let frame = $(`#cvv-security-code-frame-${ cardUUID }`);
                this.fieldFocusHandler(frame);
            };
            const runSuccessCallback = (response) => { this.handleCVVTokenFormSubmit(null); };
            const runFailureCallback = (error) => { this.handleCVVTokenFormSubmit(error || 'CVV validation failed'); };

            const adapter = new FiservSDKIframe(
                loadSuccessCallback,
                loadFailCallback,
                formReadyCallback,
                formValidCallback,
                formInvalidCallback,
                null, // cardBrandHandler - not needed for Token Forms
                fieldValidityHandler,
                fieldFocusHandler,
                runSuccessCallback,
                runFailureCallback
            );

            const updatedFormConfig = structuredClone(this.formConfig);
            updatedFormConfig.formCustomization.fields.securityCode.parentElementId = `fiserv_commercehub-cvv-security-code-${ cardUUID }`;
            updatedFormConfig.formCustomization.fields = { securityCode: updatedFormConfig.formCustomization.fields.securityCode }

            this.cvvAdapters[cardUUID] = adapter;
            adapter.initSdk(updatedFormConfig, "CREDIT_CARD", null);
        }
        catch(err)
        {
            console.log(err);
            this.cvvLoadFailure(err, cardUUID);
        }
    }

    handleTokenFormValidity = function(cardUUID, valid)
    {
        this.cvvAdapters[cardUUID]?.setValidity(valid);
        this.getSubmitButton().prop('disabled', !valid);
    }

    savedCardSelectionClickHandler = (clickedPayment) => {
        const paymentUUID = $(clickedPayment.currentTarget).data('uuid');

        $(".cvv-collector-container").hide();
        $(clickedPayment.currentTarget).find(".cvv-collector-container").show();

        this.currentSelectedPaymentUUID = paymentUUID;
        this.getSubmitButton().prop('disabled', !this.cvvAdapters[this.currentSelectedPaymentUUID]?.isValid());
    }

    handleCVVTokenFormSubmit = function(error) 
    {
        if (!this.configDataPaymentCard.use3DS) $.spinner().stop();
        
        if (error)
        {
            this.showError(error);
            this.watchSubmitButtonToken();
            return;
        }

        if (this.configDataPaymentCard.use3DS) this.perform3DSToken();
        else this.getSubmitButton().trigger('click');
    }

    submitCVVForValidation = function()
    {
        $.spinner().start();

        this.cvvAdapters[this.currentSelectedPaymentUUID].submitForm(
            this.credentialsUrl,
            (sessionId) => { this.setSessionIdInput(sessionId);}, 
            "CVV"
        );
    }

    watchSavedCardSelection = function()
    {
        $('.saved-payment-instrument').off('click', this.savedCardSelectionClickHandler);
        $('.saved-payment-instrument').on('click', this.savedCardSelectionClickHandler);
    }

    watchCVVMaskingField = function(UUID)
    {
        $('.cvv-mask-button.' + UUID).off('click', this.mask);
        $('.cvv-mask-button.' + UUID).on('click', (element) => {this.mask(element, this.cvvAdapters[UUID], 'securityCode')});
    }
}
