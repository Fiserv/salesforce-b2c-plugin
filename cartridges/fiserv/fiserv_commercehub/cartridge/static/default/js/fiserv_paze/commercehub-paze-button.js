'use strict';

class CommercehubPaze
{

    constructor(initializationData)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize Paze button.");
        }

        this.formConfig = initializationData.config;
        this.configDataPaze = initializationData.config.configData;
        this.credentialsUrl = initializationData.credentialsUrl;
        this.orderDetailsUrl = initializationData.orderDetailsUrl;
    
        this.methodId = 'PAZE';
        this.createAdapter();
        this.watchButtonLoadLag();
        this.watchPaymentMethod();
        this.watchSubmitResponse();
        this.setupDisableHandlerValues();
    }

    initialize = async function()
    {
        try {
            $.spinner().start();
            $('#fiserv-paze-fatal-notice').hide();

            await this.sdkButton.initSdk(this.credentialsUrl, (sessionId) => this.setSessionIdInput(sessionId), "PAZE");

            this.setSubmitButtonEnabled(false);
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

    buttonClass = function()
    {
        const buttonColor = this.configDataPaze.buttonConfig.color;
        if (buttonColor === 'blue') {
            return 'paze-blue';
        } else if (buttonColor === 'white') {
            return 'paze-white';
        } else if (buttonColor === 'whitewithoutline') {
            return 'paze-whitewithoutline';
        } else {
            return 'paze-black';
        }
    }

    buttonShape = function()
    {
        const buttonShape = this.configDataPaze.buttonConfig.shape;
        if (buttonShape === 'rectangle') {
            return 'paze-rect';
        } else if (buttonShape === 'pill') {
            return 'paze-pill';
        } else {
            return 'paze-default-shape';
        }
    }

    buttonLabel = function()
    {
        return this.configDataPaze.buttonConfig.label !== "paze" ? this.configDataPaze.buttonConfig.label : '';
    }

    createPazeButton = function()
    {
        const pazeButtonClass = this.buttonClass();
        const pazeButtonShape = this.buttonShape();
        const pazeButtonLabel = this.buttonLabel();
        const buttonElement = $('<button>', {
            id: 'paze-payment-button',
            class: `${pazeButtonClass} ${pazeButtonShape}${this.configDataPaze.buttonConfig.label === 'checkout' ? ' paze-logo-first' : ''}`,
            type: 'button'
        });

        const labelSpan = $('<span>', {
            class: 'paze-button-label',
            text: pazeButtonLabel
        });
        buttonElement.append(labelSpan);

        buttonElement.on('click', async () => {
            await this.handlePaymentButtonClick();
        });

        return buttonElement[0];
    }

    submitPayment = async function(orderData)
    {
        return await this.pazeComponent.submit(orderData);
    }

    triggerCheckoutSubmission = function()
    {
        this.setSubmitButtonEnabled(true);
        $('button.btn.btn-primary.btn-block.submit-payment').trigger('click');
        this.setSubmitButtonEnabled(false);
    }

    handlePaymentError = function(error)
    {
        this.pazeError();
        $.spinner().stop();
    }

    handlePaymentButtonClick = async function()
    {
        try {
            $.spinner().start();
            const orderData = await this.getOrderData();
            await this.pazeComponent.selectPaymentMethod(orderData); 
            await this.submitPayment(orderData);
            this.triggerCheckoutSubmission();
            $.spinner().stop();
        
        } catch (error) {
            this.handlePaymentError(error);
        }
    }

    sdkInitialized = async function()
    {
        try
        {
            const pazeLoadConfig = this.buildPazeConfig();
            this.pazeComponent = await window.fiserv.components.paze(pazeLoadConfig);

            const pazeButtonContainer = $('#fiserv_commercehub-paze-button');
            if (pazeButtonContainer.length) {
                const buttonElement = this.createPazeButton();
                pazeButtonContainer.empty().append(buttonElement);
            }

            $.spinner().stop();
        }
        catch(e)
        {
            $('#fiserv-paze-fatal-notice').show();
            $.spinner().stop();

            throw e;
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
        $('#fiserv-paze-fatal-notice').show();
        this.setSubmitButtonEnabled(false);
        $.spinner().stop();
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
            $(".payment-information").data("payment-method-id") === "PAZE" &&
            xhr.responseJSON.error
        ) {
            this.setSessionIdInput('');
            this.setSubmitButtonEnabled(false);
            this.pazeFailure();
        }
    }

    setupDisableHandlerValues = function()
    {
        this.setSubmitButtonEnabled(false);
        window.fiservSubmitButtonHandler.addBlocker(
            this.methodId,
            'paze-approval',
            (buttonHandler) => buttonHandler.getFact('PRIMARY_PAYMENT_METHOD_NOT_REQURED') === false && buttonHandler.getFact('APM_APPROVAL') !== true
        );
    }

    setSubmitButtonEnabled = function(enabled)
    {
        window.fiservSubmitButtonHandler.setFact('APM_APPROVAL', enabled);
    }

    pazeFailure = function(message)
    {
        $('#fiserv_commercehub-paze-button').children().remove();
        if(message)
            this.showError(message);
        this.initialize();
    }

    pazeError = function()
    {
        this.pazeFailure(this.configDataPaze.pazeFailureMessage);
    }

    setSessionIdInput = function(sessionId)
    {
        $('input#commercehubSessionIdInputPaze').val(sessionId);
    }

    watchPaymentMethod = function()
    {
        $('ul.payment-options li.nav-item[data-method-id=PAZE]').on('click', (e) => this.paymentMethodHandler(e));
    }

    paymentMethodHandler = (e) => {
        this.setSubmitButtonEnabled(false);
    }

    watchButtonLoadLag = function()
    {
        $('.paze-option').on('click', this.waitForButtonLoad);
    }

    waitForButtonLoad = function()
    {
        if(!$('#fiserv_commercehub-paze-button').children().length)
        {
            $.spinner().start();
        }
        $('.paze-option').off('click', this.waitForButtonLoad);
    }

    showError = function(message)
    {
        let form = $('#dwfrm_billing');
        $('.alert', form).remove();
        form.prepend('<div class="alert alert-danger" role="alert">' + message + '</div>');
        $('.alert', form)[0].scrollIntoView({ block: 'center', behavior: 'smooth'});
    }
}