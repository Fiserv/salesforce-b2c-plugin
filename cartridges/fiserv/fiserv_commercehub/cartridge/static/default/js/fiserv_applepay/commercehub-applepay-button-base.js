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
        this.ApplePayEventHandler = new ApplePayEventHandler(initializationData, this.sdkButton, this);
    }

    initialize = async function()
    {
        try {
            $.spinner().start();
            $('#fiserv-applepay-fatal-notice').hide();
            await this.sdkButton.initSdk(this.credentialsUrl, this.setSessionIdInput, "ApplePay");
            this.ApplePayEventHandler.initialize();
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
            onApprove: (response) => { this.ApplePayEventHandler.handleApproval(response); },
            onCancel: (response) => { this.ApplePayEventHandler.handleCancel(response); },
            onError: (response) => { this.ApplePayEventHandler.handleError(response); }
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

    setSessionIdInput = function(sessionId)
    {
        $('input#commercehubSessionIdInputApplePay').val(sessionId);
    }
}