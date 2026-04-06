'use strict';

class CommercehubPayPalEventHandler
{
    constructor(initializationData, sdkButton, paypalBase)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize PayPal button.");
        }

        this.methodId = 'PAYPAL';
        this.sdkButton = sdkButton;
        this.paypalBase = paypalBase;
        this.configDataPayPal = initializationData.config.configData;

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
        this.paypalBase.setOrderIdInput(response.orderId);
        $('.payment-details').addClass('checkout-hidden');
        $('<div class="payment-details-paypal">PayPal</div>').insertAfter('.payment-details');
        $('.edit-button').on('click', this.removeInsertedSummary);
        this.setSubmitButtonEnabled(true);
        $('button.btn.btn-primary.btn-block.submit-payment').trigger('click');
        this.setSubmitButtonEnabled(false);
    }

    handleCancel = function(response)
    {
        console.log("PayPal flow cancelled");
    }

    handleError = function(response)
    {
        this.setSubmitButtonEnabled(false);
        this.showError(this.configDataPayPal.paypalFailureMessage);
    }

    removeInsertedSummary = () =>
    {
        $('.payment-details').removeClass('checkout-hidden');
        $('.payment-details-paypal').remove();
        $('.edit-button').off('click', this.removeInsertedSummary);
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
            $(".payment-information").data("payment-method-id") === "PAYPAL" &&
            xhr.responseJSON.error
        ) {
            this.paypalBase.setOrderIdInput('');
            this.removeInsertedSummary();
            this.setSubmitButtonEnabled(false);
        }
    }

    watchPaymentMethod = function()
    {
        $('ul.payment-options li.nav-item[data-method-id=PAYPAL]').on('click', this.paymentMethodHandler);
    }

    paymentMethodHandler = (_e) => {
        this.setSubmitButtonEnabled(false);
    }

    watchButtonLoadLag = function()
    {
        $('.paypal-option').on('click', this.waitForButtonLoad);
    }

    waitForButtonLoad = function()
    {
        if(!$('#fiserv_commercehub-paypal-button').children().length)
        {
            $.spinner().start();
        }
        $('.paypal-option').off('click', this.waitForButtonLoad);
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
            'paypal-approval',
            (buttonHandler) => buttonHandler.getFact('PRIMARY_PAYMENT_METHOD_NOT_REQURED') === false && buttonHandler.getFact('APM_APPROVAL') !== true
        );
    }

    setSubmitButtonEnabled = function(enabled)
    {
        window.fiservSubmitButtonHandler.setFact('APM_APPROVAL', enabled);
    }
}
