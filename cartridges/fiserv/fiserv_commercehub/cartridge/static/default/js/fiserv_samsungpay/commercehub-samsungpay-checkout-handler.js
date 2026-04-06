'use strict';

class CommercehubSamsungPayEventHandler
{
    constructor(initializationData, sdkButton, samsungpayBase)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize Samsung Pay button.");
        }

        this.methodId = 'SAMSUNGPAY';
        this.sdkButton = sdkButton;
        this.samsungpayBase = samsungpayBase;
        this.configDataSamsungPay = initializationData.config.configData;

        this.watchButtonLoadLag();
        this.watchSubmitResponse();
        this.watchPaymentMethod();
        this.setupDisableHandlerValues();
    }

    initialize = function()
    {
        this.setSubmitButtonEnabled(false);
    }

    handleApproval = function(response)
    {
        this.setSubmitButtonEnabled(true);
        $('button.btn.btn-primary.btn-block.submit-payment').trigger('click');
        this.setSubmitButtonEnabled(false);
    }

    handleCancel = function(response)
    {
        console.log("Samsung Pay flow cancelled");
    }

    handleError = function(response)
    {
        this.samsungpayFailure(this.configDataSamsungPay.samsungpayFailureMessage);
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
            $(".payment-information").data("payment-method-id") === "SAMSUNGPAY" && 
            xhr.responseJSON.error
        ) {
            this.samsungpayBase.setSessionIdInput('');
            this.setSubmitButtonEnabled(false);
            this.samsungpayFailure();
        }
    }

    samsungpayFailure = function(message)
    {
        $('#fiserv_commercehub-samsungpay-button').children().remove();

        if(message)
            this.showError(message);
        this.samsungpayBase.initialize();
    }

    watchPaymentMethod = function()
    {
        $('ul.payment-options li.nav-item[data-method-id=SAMSUNGPAY] a.nav-link').on('click', this.paymentMethodHandler);
    }

    paymentMethodHandler = (_e) => {
        this.setSubmitButtonEnabled(false);
    }

    watchButtonLoadLag = function()
    {
        $('.samsungpay-option').on('click', this.waitForButtonLoad);
    }

    waitForButtonLoad = function()
    {
        if(!$('#fiserv_commercehub-samsungpay-button').children().length)
        {
            $.spinner().start();
        }
        $('.samsungpay-option').off('click', this.waitForButtonLoad);
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
            'samsungpay-approval',
            (buttonHandler) => buttonHandler.getFact('PRIMARY_PAYMENT_METHOD_NOT_REQURED') === false && buttonHandler.getFact('APM_APPROVAL') !== true
        );
    }

    setSubmitButtonEnabled = function (enabled)
    {
        window.fiservSubmitButtonHandler.setFact('APM_APPROVAL', enabled);
    }
}
