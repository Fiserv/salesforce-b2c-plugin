'use strict';

class CommercehubACH
{
    constructor(initializationData)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize ACH form.");
        }
        this.formConfig = initializationData.config;
        this.configDataACH = initializationData.config.configData;
        this.credentialsUrl = initializationData.credentialsUrl;

        this.createAdapter();

        $('#sdc-mask-accountNumber, #sdc-mask-routingNumber').on('click', (element) => { this.mask(element, this.formAdapter); });
        $('#achLegalTextAccepted').on('change', () => { this.legalTextCheckboxHandler(); });
        $('#fiserv-ach-confirm-fields-btn').on('click', (e) => { e.preventDefault(); this.fetchAndDisplayLegalText(); });

        this.watchSubmitResponse();
        this.watchPaymentMethod();
        this.watchBillingAddressFields();
    }

    initialize = async function()
    {
        try {
            $.spinner().start();
            await this.initializeAdapter();

            if ($('.nav-link.ach-tab.active').length)
            {
                this.watchSubmitButton();
            }
        } catch (_err) {
            this.sdkLoadFailure(_err, "#fiserv-ach-fatal-notice");
        }
    }

    createAdapter = function()
    {
        let loadSuccessCallback = () => { console.log("CommerceHub ACH SDK has loaded."); };
        let loadFailCallback = (error) => { this.sdkLoadFailure(error, "#fiserv-ach-fatal-notice"); };
        let formReadyCallback = () => { this.sdkInitialized(); };
        let formValidCallback = () => { this.validForm = true; this.showConfirmFieldsButton(); };
        let formInvalidCallback = () => { this.validForm = false; this.getSubmitButton().prop('disabled', true); this.hideConfirmFieldsButton(); this.hideLegalTextContainer(); };
        let fieldValidityHandler = (data) => {
            let frame = this.getSdcFieldFrame(data["field"]);
            let mess = this.getSdcFieldInvalidMessageContainer(data["field"]);
            this.fieldValidityHandler(data, frame, mess);
        };
        let fieldFocusHandler = (data) => {
            let frame = this.getSdcFieldFrame(data);
            this.fieldFocusHandler(frame);
        };
        let runSuccessCallback = (responseBody) => { this.achCaptureSuccess(responseBody); };
        let runFailureCallback = (error) => { this.paymentProceedFailure(error); };

        this.formAdapter = new FiservSDKIframe(
            loadSuccessCallback,
            loadFailCallback,
            formReadyCallback,
            formValidCallback,
            formInvalidCallback,
            null,
            fieldValidityHandler,
            fieldFocusHandler,
            runSuccessCallback,
            runFailureCallback);
    }

    initializeAdapter = async function()
    {
        this.clearValidation();
        try
        {
            await this.formAdapter.rawInitCall(this.credentialsUrl);
            await FiservSDKHelper.retrieveAddress(this.configDataACH.billingAddressFormNames, 'billing');
            this.formAdapter.initSdk(this.formConfig, "BANK_ACCOUNT");
        }
        catch (err)
        {
            console.log(err);
            throw new Error(err);
        }
    }

    fetchAndDisplayLegalText = async function()
    {
        this.getSubmitButton().prop('disabled', true);
        $.spinner().start();

        let legalText = await this.formAdapter.form.getAchLegalText();
        if (legalText) {
            $('#fiserv-ach-legal-text').html(legalText.plainText);
            $('#achLegalTextAccepted').prop('checked', false);
            $('#fiserv-ach-legal-text-container').show().addClass('fiserv-ach-legal-populated');
            this.getSubmitButton().prop('disabled', true);
            this.hideConfirmFieldsButton();
        }
        
        $.spinner().stop();
    }

    hideLegalTextContainer = function()
    {
        $('#fiserv-ach-legal-text-container').hide().removeClass('fiserv-ach-legal-populated');
        $('#fiserv-ach-legal-text').html('');
        $('#achLegalTextAccepted').prop('checked', false);
    }

    watchBillingAddressFields = function()
    {
        const baseId = 'dwfrm_billing';
        const billingAddressFieldsSelector = Object.keys(this.configDataACH.billingAddressFormNames)
            .map((key) => '[name=' + baseId + this.configDataACH.billingAddressFormNames[key] + ']')
            .join(', ');

        $(billingAddressFieldsSelector).on('change', () => {
            if ($('#fiserv-ach-legal-text-container').hasClass('fiserv-ach-legal-populated'))
            {
                this.hideLegalTextContainer();
                if ($(".payment-information").data("payment-method-id") === "ACH")
                {
                    this.getSubmitButton().prop('disabled', true);
                }
                if (this.validForm)
                {
                    this.showConfirmFieldsButton();
                }
            }
        });
    }

    showConfirmFieldsButton = function()
    {
        $('#fiserv-ach-confirm-fields-container').show();
    }

    hideConfirmFieldsButton = function()
    {
        $('#fiserv-ach-confirm-fields-container').hide();
    }

    legalTextCheckboxHandler = function()
    {
        if (this.validForm) {
            this.getSubmitButton().prop('disabled', !$('#achLegalTextAccepted').prop('checked'));
        }
    }

    clearValidation = function()
    {
        if ($('.tab-pane.active').find('input[name=dwfrm_billing_paymentMethod]').val() === 'ACH')
        {
            this.getSubmitButton().prop('disabled', true);
        }
        this.hideLegalTextContainer();
        this.hideConfirmFieldsButton();
        $('#sdc-account-number-frame, #sdc-routing-number-frame, #sdc-id-value-frame, #sdc-business-name-frame, #sdc-id-type-frame, #sdc-driver-license-state-frame, #sdc-account-type-frame, #sdc-check-type-frame')
            .removeClass('sdc-valid-field sdc-error-field sdc-focused-field');
        $('#sdc-account-number-invalid-message, #sdc-routing-number-invalid-message, #sdc-id-value-invalid-message, #sdc-business-name-invalid-message, #sdc-id-type-invalid-message, #sdc-driver-license-state-invalid-message, #sdc-account-type-invalid-message, #sdc-check-type-invalid-message')
            .addClass('sdc-hidden');
    }

    setSessionIdInput = function(sessionId)
    {
        $('input#commercehubSessionIdInputACH').val(sessionId);
    }

    getSubmitButton = function()
    {
        return $('button.btn.btn-primary.btn-block.submit-payment');
    }

    sdkInitialized = function()
    {
        $.spinner().stop();
    }

    sdkLoadFailure = function(err, noticeId)
    {
        console.log(err);
        this.disableSubmitButton();
        $(noticeId).show();
        $.spinner().stop();
        throw new Error("Unable to load CommerceHub ACH SDK.");
    }

    achCaptureSuccess = function()
    {
        $.spinner().stop();
        this.getSubmitButton().trigger('click');
    }

    showError = function(message)
    {
        let form = $('#dwfrm_billing');
        $('.alert', form).remove();
        form.prepend('<div class="alert alert-danger" role="alert">' + message + '</div>');
        $('.alert', form)[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    paymentProceedFailure = function(msg)
    {
        this.formAdapter.destroyIframe('ach');
        this.initializeAdapter();
        this.watchSubmitButton();
        this.showError(msg ? msg : this.configDataACH.captureFailureMessage);
        $.spinner().stop();
    }

    paymentMethodHandler = (_e) => {
        this.watchSubmitButton();
        this.getSubmitButton().prop('disabled', !$('#achLegalTextAccepted').prop('checked'));
    }

    watchPaymentMethod = function()
    {
        $('ul.payment-options li.nav-item[data-method-id="ACH"]').on('click', this.paymentMethodHandler);
    }

    submitHandler = (_e) =>
    {
        if ($('.tab-pane.active').find('input[name=dwfrm_billing_paymentMethod]').val() === 'ACH')
        {
            _e.preventDefault();
            $.spinner().start();
            this.unwatchSubmitButton();
            this.setSessionIdInput(null);
            this.formAdapter.submitForm(this.credentialsUrl, this.setSessionIdInput.bind(this), null);
            return false;
        }
    }

    watchSubmitResponse = function()
    {
        $(document).on("ajaxError", $.proxy(this.onSubmitResponse, this));
        $(document).on("ajaxSuccess", $.proxy(this.onSubmitResponse, this));
    }

    onSubmitResponse = function(ev, xhr)
    {
        if (typeof(xhr.responseJSON) !== 'undefined' &&
            typeof(xhr.responseJSON.action) !== 'undefined' &&
            xhr.responseJSON.action === "CheckoutServices-SubmitPayment" &&
            $(".payment-information").data("payment-method-id") === "ACH" &&
            xhr.responseJSON.error
        ) {
            this.setSessionIdInput('');
            this.watchSubmitButton();
        }
    }

    watchSubmitButton = function()
    {
        this.unwatchSubmitButton();
        this.getSubmitButton().one('click', this.submitHandler);
    }

    unwatchSubmitButton = function()
    {
        this.getSubmitButton().off('click', this.submitHandler);
    }

    disableSubmitButton = function()
    {
        this.getSubmitButton().prop('disabled', true);
    }

    getSdcFieldFrame = function(name)
    {
        switch (name)
        {
            case "accountNumber":
                return $('#sdc-account-number-frame');
            case "routingNumber":
                return $('#sdc-routing-number-frame');
            case "idValue":
                return $('#sdc-id-value-frame');
            case "businessName":
                return $('#sdc-business-name-frame');
            case "idType":
                return $('#sdc-id-type-frame');
            case "driverLicenseState":
                return $('#sdc-driver-license-state-frame');
            case "accountType":
                return $('#sdc-account-type-frame');
            case "checkType":
                return $('#sdc-check-type-frame');
        }

        return undefined;
    }

    getSdcFieldInvalidMessageContainer = function(name)
    {
        switch (name)
        {
            case "accountNumber":
                return $('#sdc-account-number-invalid-message');
            case "routingNumber":
                return $('#sdc-routing-number-invalid-message');
            case "idValue":
                return $('#sdc-id-value-invalid-message');
            case "businessName":
                return $('#sdc-business-name-invalid-message');
            case "idType":
                return $('#sdc-id-type-invalid-message');
            case "driverLicenseState":
                return $('#sdc-driver-license-state-invalid-message');
            case "accountType":
                return $('#sdc-account-type-invalid-message');
            case "checkType":
                return $('#sdc-check-type-invalid-message');
        }

        return undefined;
    }

    getSdcInvalidFieldMessageText = function(name)
    {
        let invalidFields = this.formConfig['invalidFields'];

        switch (name)
        {
            case "accountNumber":
                return invalidFields["accountNumber"];
            case "routingNumber":
                return invalidFields["routingNumber"];
            case "idValue":
                return invalidFields["idValue"];
            case "businessName":
                return invalidFields["businessName"];
            case "idType":
                return invalidFields["idType"];
            case "driverLicenseState":
                return invalidFields["driverLicenseState"];
            case "accountType":
                return invalidFields["accountType"];
            case "checkType":
                return invalidFields["checkType"];
        }

        return "";
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

    fieldFocusHandler = function(frame)
    {
        if (typeof(frame) !== "undefined")
        {
            if (frame[0].contains(document.activeElement) === true)
            {
                frame.addClass('sdc-focused-field');
                if ($('#fiserv-ach-legal-text-container').hasClass('fiserv-ach-legal-populated'))
                {
                    this.hideLegalTextContainer();
                    if ($(".payment-information").data("payment-method-id") === "ACH")
                    {
                        this.getSubmitButton().prop('disabled', true);
                    }
                    if (this.validForm)
                    {
                        this.showConfirmFieldsButton();
                    }
                }
            }
            else
            {
                frame.removeClass('sdc-focused-field');
            }
        }
    }

    mask = function(element, adapter, fieldParameter)
    {
        element.preventDefault();

        let field = element.target;
        let jQueryObject = $('#' + field.id);

        let id;
        if (!fieldParameter)
        {
            id = field.id.replace(/sdc-mask-/, "");
        }
        else
        {
            id = fieldParameter;
        }

        if (jQueryObject.hasClass('sdc-unmasking-icon'))
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
}
