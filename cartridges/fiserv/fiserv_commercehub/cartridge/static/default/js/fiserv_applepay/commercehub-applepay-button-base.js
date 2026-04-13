'use strict';

class CommercehubApplePay
{

    constructor(initializationData)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize Apple Pay button.");
        }

        this.configDataApplePay = initializationData.config.configData;
        this.configDataApplePay.buttonConfig.button['locale'] = initializationData.locale.replace('_', '-');
        this.credentialsUrl = initializationData.credentialsUrl;

        this.createAdapter();
        this.CommercehubApplePayEventHandler = new CommercehubApplePayEventHandler(initializationData, this.sdkButton, this);
    }

    initialize = async function()
    {
        try {
            $.spinner().start();
            $('#fiserv-applepay-fatal-notice').hide();
            await this.sdkButton.initSdk(this.credentialsUrl, this.setSessionIdInput, "ApplePay");
            this.CommercehubApplePayEventHandler.initializedHook();
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
            onApprove: (response) => { this.CommercehubApplePayEventHandler.handleApproval(response); },
            onCancel: (response) => { this.CommercehubApplePayEventHandler.handleCancel(response); },
            onError: (response) => { this.CommercehubApplePayEventHandler.handleError(response); },
            onPaymentMethodChange: (response) => { this.CommercehubApplePayEventHandler.handlePaymentMethodChange(response); },
            onShippingAddressChange: (response) => { this.CommercehubApplePayEventHandler.handleShippingAddressChange(response); },
            onShippingOptionsChange: (response) => { this.CommercehubApplePayEventHandler.handleShippingOptionsChange(response); },
            onCouponCodeChange: (response) => { this.CommercehubApplePayEventHandler.handleCouponCodeChange(response); }
        };
    }

    sdkInitialized = async function()
    {
        try
        {
            const componentConfig = { data: this.configDataApplePay.buttonConfig, hooks: this.createCallbacksObject() };
            const component = await window.fiserv.components.applePay(componentConfig);
            // const applePayComponent = await window.fiserv.ApplePayComponent.loadUntrusted(window.fiserv.context(), );
            // applePayComponent.mount(undefined, () => { return {} });
        }
        catch(e)
        {
            console.log(e);
            this.CommercehubApplePayEventHandler.showError(e.message);
        }
        $.spinner().stop();
    }

    sdkLoadFailure = function (err) 
    {
        console.log(err);
        this.CommercehubApplePayEventHandler.showError(err);
        $.spinner().stop();
        throw new Error("Unable to load CommerceHub SDK.")
    }

    setSessionIdInput = function(sessionId)
    {
        $('input#commercehubSessionIdInputApplePay').val(sessionId);
    }
}