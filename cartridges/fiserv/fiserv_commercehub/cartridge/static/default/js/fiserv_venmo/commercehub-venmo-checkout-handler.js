'use strict';

class CommercehubVenmoEventHandler
{
    constructor(initializationData, sdkButton, venmoBase)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize Venmo button.");
        }

        this.methodId = 'VENMO';
        this.sdkButton = sdkButton;
        this.venmoBase = venmoBase;
        this.configDataVenmo = initializationData.config.configData;

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
        this.venmoBase.setOrderIdInput(response.orderId);
        $('.payment-details').addClass('checkout-hidden');
        $('<div class="payment-details-venmo">Venmo</div>').insertAfter('.payment-details');
        $('.edit-button').on('click', this.removeInsertedSummary);
        this.setSubmitButtonEnabled(true);
        $('button.btn.btn-primary.btn-block.submit-payment').trigger('click');
        this.setSubmitButtonEnabled(false);
    }

    handleCancel = function(response)
    {
        console.log("Venmo flow cancelled");
    }

    handleError = function(response)
    {
        this.setSubmitButtonEnabled(false);
        this.showError(this.configDataVenmo.venmoFailureMessage);
    }

    removeInsertedSummary = () =>
    {
        $('.payment-details').removeClass('checkout-hidden');
        $('.payment-details-venmo').remove();
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
            $(".payment-information").data("payment-method-id") === "VENMO" &&
            xhr.responseJSON.error
        ) {
            this.venmoBase.setOrderIdInput('');
            this.removeInsertedSummary();
            this.setSubmitButtonEnabled(false);
        }
    }

    watchPaymentMethod = function()
    {
        $('ul.payment-options li.nav-item[data-method-id=VENMO]').on('click', this.paymentMethodHandler);
    }

    paymentMethodHandler = (_e) => {
        this.setSubmitButtonEnabled(false);
    }

    watchButtonLoadLag = function()
    {
        $('.venmo-option').on('click', this.waitForButtonLoad);
    }

    waitForButtonLoad = function()
    {
        if(!$('#fiserv_commercehub-venmo-button').children().length)
        {
            $.spinner().start();
        }
        $('.venmo-option').off('click', this.waitForButtonLoad);
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
            'venmo-approval',
            (buttonHandler) => buttonHandler.getFact('PRIMARY_PAYMENT_METHOD_NOT_REQURED') === false && buttonHandler.getFact('APM_APPROVAL') !== true
        );
    }

    setSubmitButtonEnabled = function(enabled)
    {
        window.fiservSubmitButtonHandler.setFact('APM_APPROVAL', enabled);
    }
}
