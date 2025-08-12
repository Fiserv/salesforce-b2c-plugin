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
            this.sdkButton.initSdk(this.credentialsUrl, this.setSessionIdInput);
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
            onApprove: this.paypalApproval,
            onCancel: this.paypalCancel,
            onError: this.paypalError,
            onShippingAddressChange: this.paypalShippingAddressChange,
            onShippingOptionsChange: this.paypalShippingOptionsChange
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

    paypalApproval = function()
    {

    }

    paypalCancel = function()
    {
        
    }

    paypalError = function()
    {
        
    }

    paypalShippingAddressChange = function()
    {
        
    }

    paypalShippingOptionsChange = function()
    {
        
    }

    setSessionIdInput = function(sessionId)
    {
        $('input#commercehubSessionIdInput').val(sessionId);
    }
}