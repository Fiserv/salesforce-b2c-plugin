"use strict"

class CommercehubApplePay
{

    constructor(initializationData)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize PayPal button.");
        }

        this.formConfig = initializationData.config;
        this.configDataApplePay = initializationData.config.configData;
        this.configDataApplePay.buttonConfig.button['locale'] = initializationData.locale.replace('_', '-');
        this.credentialsUrl = initializationData.credentialsUrl;

        this.createAdapter();

        this.watchButtonLoadLag();
        this.watchPaymentMethod();
    }

    initialize = async function()
    {
        try {
            $.spinner().start();
            $('#fiserv-applepay-fatal-notice').hide();
            await this.sdkButton.initSdk(this.credentialsUrl, this.setSessionIdInput, "ApplePay");
        } catch (_err) {
            this.sdkLoadFailure(_err);
        }
    }

    createAdapter = function()
    {
        let loadSuccessCallback = () => { console.log("CommerceHub Apple Pay SDK has loaded."); };
        let loadFailCallback = (error) => { this.sdkLoadFailure(error); };
        let sdkReadyCallback = () => { this.sdkInitialized() };

        this.sdkButton = new FiservSDKButton(
            loadSuccessCallback,
            loadFailCallback,
            sdkReadyCallback
        );
    }

    createCallbacksObject = function()
    {
        return {
            onApprove: (response) => { this.applepayApproval(response); },
            onCancel: (response) => { this.applepayCancel(response); },
            onError: (response) => { this.applepayError(response); }
        };
    }

    sdkInitialized = async function()
    {
        try
        {
            await window.fiserv.components.applePay({ data: this.configDataApplePay.buttonConfig, hooks: this.createCallbacksObject() });
        }
        catch(e)
        {
            console.log(e);
            $('#fiserv-applepay-fatal-notice').show();
        }
        $.spinner().stop();
    }

    sdkLoadFailure = function (err) 
    {
        console.log(err);
        $('#fiserv-applepay-fatal-notice').show();
        $.spinner().stop(); 
        throw new Error("Unable to load CommerceHub SDK.")
    }

    applepayApproval = function()
    {
        $('.payment-details').addClass('checkout-hidden');
        $('<div class="payment-details-applepay">Apple Pay</div>').insertAfter('.payment-details');
        $('.edit-button').on('click', this.removeInsertedSummary);
        $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', false);
        $('button.btn.btn-primary.btn-block.submit-payment').trigger('click');
    }

    removeInsertedSummary = () =>
    {
        $('.payment-details').removeClass('checkout-hidden');
        $('.payment-details-applepay').remove();
        $('.edit-button').off('click', this.removeInsertedSummary);
    }

    applepayCancel = function()
    {
        console.log("Apple Pay flow cancelled");
    }

    applepayError = function()
    {
        $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
        this.showError(this.configDataApplePay.applepayFailureMessage);
    }

    setSessionIdInput = function(sessionId)
    {
        $('input#commercehubSessionIdInputApplePay').val(sessionId);
    }

    watchPaymentMethod = function()
    {
        $('ul.payment-options li.nav-item[data-method-id=APPLEPAY]').on('click', this.paymentMethodHandler);
    }

    paymentMethodHandler = (_e) => {
        $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
    }

    watchButtonLoadLag = function()
    {
        $('.applepay-option').on('click', this.waitForButtonLoad);
    }

    waitForButtonLoad = function()
    {
        if(!$('#fiserv_commercehub-applepay-button').children().length)
        {
            $.spinner().start();
        }
        $('.applepay-option').off('click', this.waitForButtonLoad);
    }

    showError = function(message)
    {
        let form = $('#dwfrm_billing');
        $('.alert', form).remove();
        form.prepend('<div class="alert alert-danger" role="alert">' + message + '</div>');
        $('.alert', form)[0].scrollIntoView({ block: 'center', behavior: 'smooth'});
    }
}