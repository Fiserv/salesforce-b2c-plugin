'use strict';

class CommercehubSamsungPay
{
    constructor(initializationData)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize Samsung Pay button.");
        }

        this.configDataSamsungPay = initializationData.config.configData;
        this.credentialsUrl = initializationData.credentialsUrl;

        this.createAdapter();
        this.CommercehubSamsungPayEventHandler = new CommercehubSamsungPayEventHandler(initializationData, this.sdkButton, this);
    }

    initialize = async function()
    {
        try {
            $.spinner().start();
            $('#fiserv-samsungpay-fatal-notice').hide();
            await this.sdkButton.initSdk(this.credentialsUrl, this.setSessionIdInput, "SamsungPay");
            this.CommercehubSamsungPayEventHandler.initialize();
        } catch (_err) {
            this.sdkLoadFailure(_err);
        }
    }

    createAdapter = function()
    {
        let loadSuccessCallback = () => { console.log("CommerceHub Samsung Pay SDK has loaded."); };
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
            onApprove: (response) => { this.CommercehubSamsungPayEventHandler.handleApproval(response); },
            onCancel: (response) => { this.CommercehubSamsungPayEventHandler.handleCancel(response); },
            onError: (response) => { this.CommercehubSamsungPayEventHandler.handleError(response); }
        };
    }

    sdkInitialized = async function()
    {
        try
        {
            await window.fiserv.components.samsungPay({
                data: this.configDataSamsungPay.buttonConfig,
                hooks: this.createCallbacksObject()
            });
            $('#fiserv_commercehub-samsungpay-button button').attr('type', 'button');
        }
        catch(e)
        {
            $('#fiserv-samsungpay-fatal-notice').show();
        }
        $.spinner().stop();
    }
    
    sdkLoadFailure = function (err)
    {
        console.log(err);
        $('#fiserv-samsungpay-fatal-notice').show();
        $.spinner().stop();
        throw new Error("Unable to load CommerceHub SDK.")
    }

    setSessionIdInput = function(sessionId)
    {
        $('input#commercehubSessionIdInputSamsungPay').val(sessionId);
    }
}
