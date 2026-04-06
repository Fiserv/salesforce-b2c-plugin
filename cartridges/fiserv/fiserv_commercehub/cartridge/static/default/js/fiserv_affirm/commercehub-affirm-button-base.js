'use strict';

class CommercehubAffirm
{
    constructor(initializationData)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize Affirm button.");
        }

        this.configDataAffirm = initializationData.config.configData;
        this.credentialsUrl = initializationData.credentialsUrl;

        this.createAdapter();
        this.CommercehubAffirmEventHandler = new CommercehubAffirmEventHandler(initializationData, this.sdkButton, this);
    }

    initialize = async function()
    {
        try {
            $.spinner().start();
            $('#fiserv-affirm-fatal-notice').hide();
            await this.sdkButton.initSdk(this.credentialsUrl, null, "Affirm");
            this.CommercehubAffirmEventHandler.initialize();
        } catch (_err) {
            this.sdkLoadFailure(_err);
        }
    }

    createAdapter = function()
    {
        let loadSuccessCallback = () => { console.log("CommerceHub Affirm SDK has loaded."); };
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
            onApprove: (response) => { this.CommercehubAffirmEventHandler.handleApproval(response); },
            onCancel: (response) => { this.CommercehubAffirmEventHandler.handleCancel(response); },
            onError: (response) => { this.CommercehubAffirmEventHandler.handleError(response); }
        };
    }

    sdkInitialized = async function() 
    {
        try
        {
            let affirmLoadConfig = {};
            affirmLoadConfig['intent'] = this.configDataAffirm.chargeType === 'AUTH' ? 'AUTHORIZE' : 'CAPTURE';
            affirmLoadConfig['button'] = this.configDataAffirm.buttonConfig;

            await window.fiserv.components.affirm({
                data: affirmLoadConfig,
                hooks: this.createCallbacksObject()
            });
        }
        catch(e)
        {
            $('#fiserv-affirm-fatal-notice').show();
        }
        $.spinner().stop();
    }

    sdkLoadFailure = function (err) 
    {
        console.log(err);
        $('#fiserv-affirm-fatal-notice').show();
        $.spinner().stop(); 
        throw new Error("Unable to load CommerceHub SDK.")
    }

    setOrderIdInput = function(orderId)
    {
        $('input#commercehubOrderIdInputAffirm').val(orderId);
    }
}