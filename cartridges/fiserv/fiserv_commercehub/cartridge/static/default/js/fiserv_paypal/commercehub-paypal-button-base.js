'use strict';

class CommercehubPayPal
{
    constructor(initializationData)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize PayPal button.");
        }

        this.configDataPayPal = initializationData.config.configData;
        this.credentialsUrl = initializationData.credentialsUrl;

        this.createAdapter();
        this.CommercehubPayPalEventHandler = new CommercehubPayPalEventHandler(initializationData, this.sdkButton, this);
    }

    initialize = async function()
    {
        try {
            $.spinner().start();
            $('#fiserv-paypal-fatal-notice').hide();
            await this.sdkButton.initSdk(this.credentialsUrl, null, "PayPal");
            this.CommercehubPayPalEventHandler.initialize();
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
            onApprove: (response) => { this.CommercehubPayPalEventHandler.handleApproval(response); },
            onCancel: (response) => { this.CommercehubPayPalEventHandler.handleCancel(response); },
            onError: (response) => { this.CommercehubPayPalEventHandler.handleError(response); }
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

    setOrderIdInput = function(orderId)
    {
        $('input#commercehubOrderIdInputPayPal').val(orderId);
    }
}