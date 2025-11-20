"use strict"

class CommercehubVenmo
{

    constructor(initializationData)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize Venmo button.");
        }

        this.formConfig = initializationData.config;
        this.configDataVenmo = initializationData.config.configData;
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
            $('#fiserv-venmo-fatal-notice').hide();
            await this.sdkButton.initSdk(this.credentialsUrl, null, "Venmo");
            $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
        } catch (_err) {
            this.sdkLoadFailure(_err);
        }
    }

    createAdapter = function()
    {
        let loadSuccessCallback = () => { console.log("CommerceHub Venmo SDK has loaded."); };
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
            onApprove: (response) => { this.venmoApproval(response); },
            onCancel: (response) => { this.venmoCancel(response); },
            onError: (response) => { this.venmoError(response); }
        };
    }

    sdkInitialized = async function() 
    {
        try
        {
            let venmoLoadConfig = {};
            venmoLoadConfig['intent'] = this.configDataVenmo.chargeType === 'AUTH' ? 'AUTHORIZE' : 'SALE';
            venmoLoadConfig['shippingAddress'] = await FiservSDKHelper.retrieveAddress(this.configDataVenmo.shippingAddressFormNames, 'shipping');
            const venmo = await window.fiserv.components.venmo(venmoLoadConfig);

            await venmo.buttons({ data: this.configDataVenmo.buttonsConfig, hooks: this.createCallbacksObject() });
        }
        catch(e)
        {
            $('#fiserv-venmo-fatal-notice').show();
        }
        $.spinner().stop();
    }

    sdkLoadFailure = function (err) 
    {
        console.log(err);
        $('#fiserv-venmo-fatal-notice').show();
        $.spinner().stop(); 
        throw new Error("Unable to load CommerceHub SDK.")
    }

    venmoApproval = function(response)
    {
        this.setOrderIdInput(response.orderId);
        $('.payment-details').addClass('checkout-hidden');
        $('<div class="payment-details-venmo">Venmo</div>').insertAfter('.payment-details');
        $('.edit-button').on('click', this.removeInsertedSummary);
        $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', false);
        $('button.btn.btn-primary.btn-block.submit-payment').trigger('click');
    }

    removeInsertedSummary = () =>
    {
        $('.payment-details').removeClass('checkout-hidden');
        $('.payment-details-venmo').remove();
        $('.edit-button').off('click', this.removeInsertedSummary);
    }

    venmoCancel = function()
    {
        console.log("Venmo flow cancelled");
    }

    venmoError = function()
    {
        $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
        this.showError(this.configDataVenmo.venmoFailureMessage);
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
            $(".payment-information").data("payment-method-id") === "VENMO" &&
            xhr.responseJSON.error
        ) {
            this.setOrderIdInput('');
            this.removeInsertedSummary();
            $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
        }
    }

    setOrderIdInput = function(orderId)
    {
        $('input#commercehubOrderIdInputVenmo').val(orderId);
    }

    watchPaymentMethod = function()
    {
        $('ul.payment-options li.nav-item[data-method-id=VENMO]').on('click', this.paymentMethodHandler);
    }

    paymentMethodHandler = (_e) => {
        $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
    }

    watchButtonLoadLag = function()
    {
        $('.venmo-option').on('click', this.waitForButtonLoad);
    }

    waitForButtonLoad = function()
    {
        if(!$('#fiserv_commercehub-venmo-button').children().length)
        {
            $.spinner().start();
        }
        $('.venmo-option').off('click', this.waitForButtonLoad);
    }

    showError = function(message)
    {
        let form = $('#dwfrm_billing');
        $('.alert', form).remove();
        form.prepend('<div class="alert alert-danger" role="alert">' + message + '</div>');
        $('.alert', form)[0].scrollIntoView({ block: 'center', behavior: 'smooth'});
    }
}