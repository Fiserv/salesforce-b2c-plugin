'use strict';

class CommercehubPaze
{
    constructor(initializationData)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize Paze button.");
        }

        this.configDataPaze = initializationData.config.configData;
        this.credentialsUrl = initializationData.credentialsUrl;
        this.orderDetailsUrl = initializationData.orderDetailsUrl;
    
        this.createAdapter();
        this.CommercehubPazeEventHandler = new CommercehubPazeEventHandler(initializationData, this.sdkButton, this);
    }

    initialize = async function()
    {
        try {
            $.spinner().start();
            $('#fiserv-paze-fatal-notice').hide();
            await this.sdkButton.initSdk(this.credentialsUrl, this.setSessionIdInput, "PAZE");
            this.CommercehubPazeEventHandler.initialize();
        } catch (_err) {
            this.sdkLoadFailure(_err);
        }
    }

    createAdapter = function()
    {
        let loadSuccessCallback = () => { console.log("CommerceHub Paze SDK has loaded."); };
        let loadFailCallback = (error) => { this.sdkLoadFailure(error); };
        let sdkReadyCallback = () => { this.sdkInitialized(); };

        this.sdkButton = new FiservSDKButton(
            loadSuccessCallback,
            loadFailCallback,
            sdkReadyCallback
        );
    }

    buildPazeConfig = function()
    {
        return {
            displayName: this.configDataPaze.displayName
        };
    }

    createPazeButton = function()
    {
        const buttonElement = $('<button>', {
            id: 'paze-payment-button',
            class: 'paze-blue',
            type: 'button'
        });

        const labelSpan = $('<span>', {
            class: 'paze-button-label'
        });
        buttonElement.append(labelSpan);

        buttonElement.on('click', async () => {
            await this.CommercehubPazeEventHandler.handlePaymentButtonClick();
        });

        return buttonElement[0];
    }

    sdkInitialized = async function()
    {
        try
        {
            const pazeLoadConfig = this.buildPazeConfig();
            this.CommercehubPazeEventHandler.pazeComponent = await window.fiserv.components.paze(pazeLoadConfig);

            const pazeButtonContainer = $('#fiserv_commercehub-paze-button');
           
            const buttonElement = this.createPazeButton();
            pazeButtonContainer.empty().append(buttonElement);

            $.spinner().stop();
        }
        catch(e)
        {
            $('#fiserv-paze-fatal-notice').show();
            $.spinner().stop();
        }
    }

    getOrderData = async function()
    {
        return await new Promise((resolve, reject) => {
            FiservSDKHelper.backendCall(this.orderDetailsUrl, resolve, reject);
        })
        .then(response => ({
            amount: {
                currency: response.currency,
                total: response.total.toString()
            }
        }));
    }

    sdkLoadFailure = function (err)
    {
        console.log(err);
        $('#fiserv-paze-fatal-notice').show();
        $.spinner().stop();
    }

    setSessionIdInput = function(sessionId)
    {
        $('input#commercehubSessionIdInputPaze').val(sessionId);
    }
}