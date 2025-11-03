"use strict"

class CommercehubPayPal
{

    constructor(initializationData)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize PayPal button.");
        }

        this.formConfig = initializationData.config;
        this.configDataPayPal = initializationData.config.configData;
        this.credentialsUrl = initializationData.credentialsUrl;

        this.createAdapter();

        this.watchButtonLoadLag();
        this.watchSubmitResponse();
        this.watchPaymentMethod();
    }

    initialize = async function()
    {
        try {
            $.spinner().start();
            $('#fiserv-paypal-fatal-notice').hide();
            await this.sdkButton.initSdk(this.credentialsUrl, null, "PayPal");
            $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
        } catch (_err) {
            this.sdkLoadFailure(_err);
        }
    }

    createAdapter = function()
    {
        let loadSuccessCallback = () => { console.log("CommerceHub PayPal SDK has loaded."); };
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
            onApprove: (response) => { this.paypalApproval(response); },
            onCancel: (response) => { this.paypalCancel(response); },
            onError: (response) => { this.paypalError(response); }
        };
    }

    sdkInitialized = async function() 
    {
        try
        {
            let paypalLoadConfig = {};
            paypalLoadConfig['intent'] = this.configDataPayPal.chargeType === 'AUTH' ? 'AUTHORIZE' : 'CAPTURE';
            paypalLoadConfig['shippingAddress'] = await FiservSDKHelper.retrieveAddress(this.configDataPayPal.shippingAddressFormNames, 'shipping');
            const paypal = await window.fiserv.components.paypal(paypalLoadConfig);

            await paypal.buttons({ data: this.configDataPayPal.buttonsConfig, hooks: this.createCallbacksObject() });
        }
        catch(e)
        {
            $('#fiserv-paypal-fatal-notice').show();
        }
        $.spinner().stop();
    }

    sdkLoadFailure = function (err) 
    {
        console.log(err);
        $('#fiserv-paypal-fatal-notice').show();
        $.spinner().stop(); 
        throw new Error("Unable to load CommerceHub SDK.")
    }

    paypalApproval = function(response)
    {
        this.setOrderIdInput(response.orderId);
        $('.payment-details').addClass('checkout-hidden');
        $('<div class="payment-details-paypal">PayPal</div>').insertAfter('.payment-details');
        $('.edit-button').on('click', this.removeInsertedSummary);
        $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', false);
        $('button.btn.btn-primary.btn-block.submit-payment').trigger('click');
    }

    removeInsertedSummary = () =>
    {
        $('.payment-details').removeClass('checkout-hidden');
        $('.payment-details-paypal').remove();
        $('.edit-button').off('click', this.removeInsertedSummary);
    }

    paypalCancel = function()
    {
        console.log("PayPal flow cancelled");
    }

    paypalError = function()
    {
        $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
        this.showError(this.configDataPayPal.paypalFailureMessage);
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
            $(".payment-information").data("payment-method-id") === "PAYPAL" &&
            xhr.responseJSON.error
        ) {
            this.setOrderIdInput('');
            this.removeInsertedSummary();
            $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
        }
    }

    setOrderIdInput = function(orderId)
    {
        $('input#commercehubOrderIdInputPayPal').val(orderId);
    }

    watchPaymentMethod = function()
    {
        $('ul.payment-options li.nav-item[data-method-id=PAYPAL]').on('click', this.paymentMethodHandler);
    }

    paymentMethodHandler = (_e) => {
        $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
    }

    watchButtonLoadLag = function()
    {
        $('.paypal-option').on('click', this.waitForButtonLoad);
    }

    waitForButtonLoad = function()
    {
        if(!$('#fiserv_commercehub-paypal-button').children().length)
        {
            $.spinner().start();
        }
        $('.paypal-option').off('click', this.waitForButtonLoad);
    }

    showError = function(message)
    {
        let form = $('#dwfrm_billing');
        $('.alert', form).remove();
        form.prepend('<div class="alert alert-danger" role="alert">' + message + '</div>');
        $('.alert', form)[0].scrollIntoView({ block: 'center', behavior: 'smooth'});
    }
}