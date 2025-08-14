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
        this.watchPaymentMethods();

        new MutationObserver(() => { this.grandTotalUpdated(); }).observe($('.grand-total-sum')[0], { childList: true })
    }

    initialize = function()
    {
        try {
            $.spinner().start();
            this.initializeAdapter();
            //this.watchFormButtons();
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

    initializeAdapter = async function()
    {
        try
        {
            this.sdkButton.initSdk(this.credentialsUrl, null, "PayPal");
        }
        catch(err)
        {
            console.log(err);
            throw new Error(err);
        };
    }

    createCallbacksObject = function()
    {
        return {
            onApprove: (response) => { this.paypalApproval(response); },
            onCancel: (response) => { this.paypalCancel(response); },
            onError: (response) => { this.paypalError(response); },
            onShippingAddressChange: (response) => { this.paypalShippingAddressChange(response); },
            onShippingOptionsChange: (response) => { this.paypalShippingOptionsChange(response); }
        };
    }

    sdkInitialized = async function() 
    {
        let paypalLoadConfig = {};
        paypalLoadConfig['intent'] = this.configDataPayPal.chargeType === 'AUTH' ? 'authorize' : 'capture';
        if(this.configDataPayPal.customerId)
        {
            paypalLoadConfig['customerId'] = this.configDataPayPal.customerId;
        }
        const paypal = await window.fiserv.components.paypal(paypalLoadConfig);

        await paypal.buttons({ data: this.configDataPayPal.buttonsConfig, hooks: this.createCallbacksObject() });
        $.spinner().stop();
    }

    sdkLoadFailure = function (err) 
    {
        console.log(err);
        this.disableFormButtons();
        this.getFatalNotice().show();
        $.spinner().stop(); 
        throw new Error("Unable to load CommerceHub SDK.")
    }

    paypalApproval = function(response)
    {
        this.setOrderIdInput(response.orderId);
        $('.payment-details').addClass('checkout-hidden');
        $('<div class="payment-details-paypal">PayPal</div>').insertAfter('.payment-details');
        $('.edit-button').on('click', this.removeInsertedSummary);
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
        // this.showError()...
    }

    paypalShippingAddressChange = function()
    {
        // ¯\_(ツ)_/¯
    }

    paypalShippingOptionsChange = function()
    {
        // ¯\_(ツ)_/¯
    }

    setOrderIdInput = function(sessionId)
    {
        $('input#commercehubOrderIdInputPayPal').val(sessionId);
    }

    grandTotalUpdated = function(context)
    {
        $('#fiserv_commercehub-paypal-button').children().remove();
        this.initialize();
    }

    watchPaymentMethods = function()
    {
        $('ul.payment-options li.nav-item').on('click', this.paymentMethodHandler);
    }

    unwatchPaymentMethods = function()
    {
        $('ul.payment-options li.nav-item').off('click', this.paymentMethodHandler);
    }

    paymentMethodHandler = (_e) => { 
        /*if (
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
        }*/
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
}