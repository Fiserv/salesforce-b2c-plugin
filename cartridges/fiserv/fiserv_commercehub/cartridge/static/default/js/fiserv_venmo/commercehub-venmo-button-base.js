'use strict';

class CommercehubVenmo
{
    constructor(initializationData)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize Venmo button.");
        }

        this.configDataVenmo = initializationData.config.configData;
        this.credentialsUrl = initializationData.credentialsUrl;

        this.createAdapter();
        this.CommercehubVenmoEventHandler = new CommercehubVenmoEventHandler(initializationData, this.sdkButton, this);
    }

    initialize = async function()
    {
        try {
            $.spinner().start();
            $('#fiserv-venmo-fatal-notice').hide();
            await this.sdkButton.initSdk(this.credentialsUrl, null, "Venmo");
            this.CommercehubVenmoEventHandler.initialize();
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
            onApprove: (response) => { this.CommercehubVenmoEventHandler.handleApproval(response); },
            onCancel: (response) => { this.CommercehubVenmoEventHandler.handleCancel(response); },
            onError: (response) => { this.CommercehubVenmoEventHandler.handleError(response); }
        };
    }

    sdkInitialized = async function() 
    {
        try
        {
            let venmoLoadConfig = {};
            venmoLoadConfig['intent'] = this.configDataVenmo.chargeType === 'AUTH' ? 'AUTHORIZE' : 'CAPTURE';
            venmoLoadConfig['shippingAddress'] = await FiservSDKHelper.retrieveAddress(this.configDataVenmo.shippingAddressFormNames, 'shipping');
            const venmo = await window.fiserv.components.paypal(venmoLoadConfig);
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

    setOrderIdInput = function(orderId)
    {
        $('input#commercehubOrderIdInputVenmo').val(orderId);
    }
}