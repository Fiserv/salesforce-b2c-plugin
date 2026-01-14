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

        // CVV collector for stored payment instruments
        this.cvvAdapters = {};
        this.currentSelectedPaymentUUID = null;
        this.cvvEnabled = this.configDataPaymentCard.cvvEnabled;

        // Bind event handlers to maintain 'this' context when called as event handlers
        this.submitHandlerToken = this.submitHandlerToken.bind(this);
        this.submitHandlerForm = this.submitHandlerForm.bind(this);

        this.createAdapter();

        $('#sdc-mask-cardNumber, #sdc-mask-securityCode').on('click', (element) => {this.mask(element);});

        if(this.configDataPaymentCard.fastlaneEnabled && this.isGuest)
        {
            this.formAdapter.setFastlaneInitStatus(true);
            FiservFastlaneInitializer.initFastlane(this.credentialsUrl, this.formAdapter, this.formConfig);
        }

        this.watchSubmitResponse();
        this.watchPaymentMethods();
        this.watchCVVPaymentSelection();
        this.initializeMaskingIcons();
        this.initializeSelectedCardCVV();
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
            this.formAdapter.submitForm(this.credentialsUrl, this.setSessionIdInput, this.configDataPaymentCard.use3DS ? "3DS" : null);
            return false;
        }
    }

    submitHandlerToken = function(_e)
    {
        this.setSessionIdInput(null);

        // Check if CVV collector is active and validate CVV first
        if (this.cvvIframeActive)
        {
            _e.preventDefault();
            $.spinner().start();
            this.unwatchSubmitButtonToken();

            // Validate and capture CVV before proceeding
            this.submitCVVForValidation((error) => {
                if (error)
                {
                    this.showError(error);
                    this.watchSubmitButtonToken();
                    $.spinner().stop();
                    return;
                }

                // CVV validated, proceed with 3DS if enabled
                if (this.configDataPaymentCard.use3DS)
                {
                    this.perform3DSToken();
                }
                else
                {
                    $.spinner().stop();
                    this.getSubmitButton().trigger('click');
                }
            });
            return false;
        }

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
                this.formAdapter.setValidity(true);
            } else if (data["shouldShowError"] === true)
            {
                mess.text(this.getSdcInvalidFieldMessageText(data["field"]));
                frame.removeClass('sdc-valid-field');
                frame.addClass('sdc-error-field');
                mess.removeClass('sdc-hidden');
                this.formAdapter.setValidity(false);
            } else
            {       
                frame.removeClass('sdc-valid-field');
                frame.removeClass('sdc-error-field');
                mess.addClass('sdc-hidden');
                this.formAdapter.setValidity(false);
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

    // =====================================================
    // CVV Collector Methods for Stored Payment Instruments
    // =====================================================

    initializeSelectedCardCVV = function()
    {
        // Initialize CVV for the initially selected payment instrument (only if CVV is enabled)
        if (!this.cvvEnabled) return;

        const selectedPayment = $('.saved-payment-instrument.selected-payment');
        if (selectedPayment.length > 0)
        {
            const paymentUUID = selectedPayment.data('uuid');
            this.initializeCVVForCard(paymentUUID);
        }
    }

    initializeCVVForCard = function(cardUUID)
    {
        if (!cardUUID || !this.cvvEnabled) return;

        // Check if already initialized
        if (this.cvvAdapters[cardUUID])
        {
            this.currentSelectedPaymentUUID = cardUUID;
            console.log(`CVV adapter already exists for card ${cardUUID}`);
            return;
        }

        try
        {
            $.spinner().start();
            this.currentSelectedPaymentUUID = cardUUID;

            // Create callbacks specific to this card
            const loadSuccessCallback = () => {
                console.log(`CommerceHub CVV SDK loaded for card ${cardUUID}`);
            };
            const loadFailCallback = (error) => {
                this.cvvLoadFailure(error, cardUUID);
            };
            const formReadyCallback = () => {
                this.cvvInitialized(cardUUID);
            };
            const formValidCallback = () => {
                this.cvvValid(cardUUID);
            };
            const formInvalidCallback = () => {
                this.cvvInvalid(cardUUID);
            };
            const fieldValidityHandler = (data) => {
                this.cvvFieldValidityHandler(data, cardUUID);
            };
            const fieldFocusHandler = (data) => {
                this.cvvFieldFocusHandler(data, cardUUID);
            };

            // Create adapter for this specific card using FiservCVVIframeAdapter
            const adapter = new FiservCVVIframeAdapter(
                cardUUID,
                loadSuccessCallback,
                loadFailCallback,
                formReadyCallback,
                formValidCallback,
                formInvalidCallback,
                fieldValidityHandler,
                fieldFocusHandler
            );

            this.cvvAdapters[cardUUID] = adapter;
            adapter.initCVVField(this.formConfig);
        }
        catch(err)
        {
            console.log(err);
            this.cvvLoadFailure(err, cardUUID);
        }
    }

    destroyCVVForCard = function(cardUUID)
    {
        if (this.cvvAdapters[cardUUID])
        {
            this.cvvAdapters[cardUUID].destroyCVVIframe();
            delete this.cvvAdapters[cardUUID];
            this.clearCVVValidation(cardUUID);
        }
    }

    clearCVVValidation = function(cardUUID)
    {
        $(`#cvv-security-code-frame-${cardUUID}`)
            .removeClass('sdc-valid-field sdc-error-field sdc-focused-field');
        $(`#cvv-security-code-invalid-message-${cardUUID}`)
            .addClass('sdc-hidden');
    }

    cvvInitialized = function(cardUUID)
    {
        $.spinner().stop();
        this.getSubmitButton().prop('disabled', true); // Disable until CVV is valid
        console.log(`CVV field initialized for card ${cardUUID}`);
    }

    cvvLoadFailure = function (err, cardUUID)
    {
        console.log(err);
        this.getSubmitButton().prop('disabled', true);
        $(`#cvv-fatal-notice-${cardUUID}`).show();
        $.spinner().stop();
        throw new Error(`Unable to load CommerceHub CVV collector for card ${cardUUID}.`)
    }

    cvvValid = function(cardUUID)
    {
        console.log(`CVV valid for card ${cardUUID}`);

        // Only enable button if this is the currently selected card
        if (this.currentSelectedPaymentUUID === cardUUID) {
            this.getSubmitButton().prop('disabled', false);
            console.log(`Submit button enabled for card ${cardUUID}`);
        }
    }

    cvvInvalid = function(cardUUID)
    {
        console.log(`CVV invalid for card ${cardUUID}`);

        // Only disable button if this is the currently selected card
        if (this.currentSelectedPaymentUUID === cardUUID) {
            this.getSubmitButton().prop('disabled', true);
            console.log(`Submit button disabled for card ${cardUUID}`);
        }
    }

    cvvFieldValidityHandler = function(data, cardUUID)
    {
        let frame = $(`#cvv-security-code-frame-${cardUUID}`);
        let mess = $(`#cvv-security-code-invalid-message-${cardUUID}`);

        if (data["isValid"] === true)
        {
            frame.removeClass('sdc-error-field');
            frame.addClass('sdc-valid-field');
            mess.addClass('sdc-hidden');
        }
        else if (data["shouldShowError"] === true)
        {
            mess.text(this.formConfig['invalidFields']['securityCode'] || 'Invalid CVV');
            frame.removeClass('sdc-valid-field');
            frame.addClass('sdc-error-field');
            mess.removeClass('sdc-hidden');
        }
        else
        {
            frame.removeClass('sdc-valid-field');
            frame.removeClass('sdc-error-field');
            mess.addClass('sdc-hidden');
        }
    }

    cvvFieldFocusHandler = function (data, cardUUID)
    {
        let frame = $(`#cvv-security-code-frame-${cardUUID}`);

        if(frame[0] && frame[0].contains(document.activeElement) === true)
        {
            frame.addClass('sdc-focused-field');
        }
        else
        {
            frame.removeClass('sdc-focused-field');
        }
    }

    watchCVVPaymentSelection = function()
    {
        const self = this;

        // Watch for saved payment instrument selection
        $(document).on('click', '.saved-payment-instrument', function() {
            const clickedPayment = $(this);
            const paymentUUID = clickedPayment.data('uuid');

            // Don't reinitialize if clicking the same card
            if (self.currentSelectedPaymentUUID === paymentUUID) {
                return;
            }

            $('.saved-payment-instrument').removeClass('selected-payment');
            clickedPayment.addClass('selected-payment');

            // Update current selected payment BEFORE disabling button
            self.currentSelectedPaymentUUID = paymentUUID;

            // If card already has adapter (was previously selected), check if it's valid
            if (self.cvvAdapters[paymentUUID]) {
                console.log(`Reusing existing CVV adapter for card ${paymentUUID}`);

                // Check if the CVV field for this card has valid state
                const frame = $(`#cvv-security-code-frame-${paymentUUID}`);
                const hasValidClass = frame.hasClass('sdc-valid-field');

                if (hasValidClass) {
                    // CVV was previously entered and is still valid
                    console.log(`CVV already valid for card ${paymentUUID}, enabling button`);
                    self.getSubmitButton().prop('disabled', false);
                } else {
                    // CVV not valid yet, disable button
                    self.getSubmitButton().prop('disabled', true);
                }
            } else if (self.cvvEnabled) {
                // New adapter needed, disable button until CVV is entered
                self.getSubmitButton().prop('disabled', true);
                self.initializeCVVForCard(paymentUUID);
            }
        });

        // Watch for "Add Payment" button - hide all CVV collectors
        $(document).on('click', '.btn.add-payment', function() {
            $('.cvv-collector-container').hide();
            self.currentSelectedPaymentUUID = null;
            // Enable button for new card entry (no CVV needed)
            self.getSubmitButton().prop('disabled', false);
        });

        // Watch for "Cancel New Payment" button - show CVV collector for selected payment
        $(document).on('click', '.btn.cancel-new-payment', function() {
            const selectedPayment = $('.saved-payment-instrument.selected-payment');
            if (selectedPayment.length > 0)
            {
                const paymentUUID = selectedPayment.data('uuid');
                self.currentSelectedPaymentUUID = paymentUUID;
                $('.cvv-collector-container').show();

                // Check if CVV is already valid for this card
                if (self.cvvAdapters[paymentUUID]) {
                    const frame = $(`#cvv-security-code-frame-${paymentUUID}`);
                    const hasValidClass = frame.hasClass('sdc-valid-field');

                    if (hasValidClass) {
                        self.getSubmitButton().prop('disabled', false);
                    } else {
                        self.getSubmitButton().prop('disabled', true);
                    }
                } else if (self.cvvEnabled) {
                    // Disable button until CVV is validated
                    self.getSubmitButton().prop('disabled', true);
                    self.initializeCVVForCard(paymentUUID);
                }
            }
        });
    }

    submitCVVForValidation = function(callback)
    {
        const currentCardUUID = this.currentSelectedPaymentUUID;

        if (!currentCardUUID || !this.cvvAdapters[currentCardUUID])
        {
            // No CVV needed for new card entry
            callback(null);
            return;
        }

        $.spinner().start();

        new Promise((resolve, reject) => {
            FiservSDKHelper.backendCall(
                this.credentialsUrl,
                resolve,
                reject,
                {
                    requestPurpose: "CVV",
                    paymentUUID: currentCardUUID
                }
            );
        })
        .then((credentialsResponse) => {
            this.cvvAdapters[currentCardUUID].submitCVV(credentialsResponse, (encryptedCVV) => {
                this.setSessionIdInput(credentialsResponse['sessionId']);
                $.spinner().stop();
                callback(null);
            }, (error) => {
                $.spinner().stop();
                callback(error || 'CVV validation failed');
            });
        })
        .catch((error) => {
            console.log(error);
            $.spinner().stop();
            callback('Failed to get CVV credentials');
        });
    }

    get cvvIframeActive()
    {
        return this.currentSelectedPaymentUUID && this.cvvAdapters[this.currentSelectedPaymentUUID];
    }

    initializeMaskingIcons = function()
    {
        const self = this;
        // Use event delegation to handle dynamically created masking icons
        $(document).on('click', '[id^="cvv-mask-securityCode-"]', function(element) {
            self.maskCVV(element);
        });
    }

    maskCVV = function(element)
    {
        element.preventDefault();

        let field = element.target;
        let id = field.id.replace(/cvv-mask-securityCode-/, "");
        let jQueryObject = $('#' + field.id);

        // Get the adapter for this specific card
        const adapter = this.cvvAdapters[id];
        if (!adapter) {
            console.warn('No CVV adapter found for card:', id);
            return;
        }

        if(jQueryObject.hasClass('sdc-unmasking-icon'))
        {
            jQueryObject.removeClass('sdc-unmasking-icon');
            jQueryObject.addClass('sdc-masking-icon');
            adapter.unmaskCVV();
        }
        else
        {
            jQueryObject.removeClass('sdc-masking-icon');
            jQueryObject.addClass('sdc-unmasking-icon');
            adapter.maskCVV();
        }
    }
}
