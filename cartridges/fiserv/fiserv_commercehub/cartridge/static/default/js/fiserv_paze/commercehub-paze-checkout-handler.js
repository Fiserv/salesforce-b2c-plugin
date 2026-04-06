'use strict';

class CommercehubPazeEventHandler
{
    constructor(initializationData, sdkButton, pazeBase)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize Paze button.");
        }

        this.methodId = 'PAZE';
        this.sdkButton = sdkButton;
        this.pazeBase = pazeBase;
        this.configDataPaze = initializationData.config.configData;

        this.watchButtonLoadLag();
        this.watchPaymentMethod();
        this.watchSubmitResponse();
        this.setupDisableHandlerValues();
    }

    initialize = function()
    {
        this.setSubmitButtonEnabled(false);
    }

    handlePaymentButtonClick = async function()
    {
        try {
            $.spinner().start();
            const orderData = await this.pazeBase.getOrderData();
            await this.pazeComponent.selectPaymentMethod(orderData); 
            await this.pazeComponent.submit(orderData);

            this.setSubmitButtonEnabled(true);
            $('button.btn.btn-primary.btn-block.submit-payment').trigger('click');
            this.setSubmitButtonEnabled(false);

            $.spinner().stop();
        } catch (error) {
            this.handlePaymentError(error);
        }
    }

    handlePaymentError = function(error)
    {
        this.pazeFailure(this.configDataPaze.pazeFailureMessage);
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
            this.pazeBase.setSessionIdInput('');
            this.setSubmitButtonEnabled(false);
            this.pazeFailure();
        }
    }

    pazeFailure = function(message)
    {
        $('#fiserv_commercehub-paze-button').children().remove();
        if(message)
            this.showError(message);
        this.pazeBase.initialize();
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
}
