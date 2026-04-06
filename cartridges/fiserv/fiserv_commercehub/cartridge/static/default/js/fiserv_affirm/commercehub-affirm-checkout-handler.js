'use strict';

class CommercehubAffirmEventHandler
{
    constructor(initializationData, sdkButton, affirmBase)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize Affirm button.");
        }

        this.methodId = 'AFFIRM';
        this.sdkButton = sdkButton;
        this.affirmBase = affirmBase;
        this.configDataAffirm = initializationData.config.configData;

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
        this.affirmBase.setOrderIdInput(response.orderId);
        $('.payment-details').addClass('checkout-hidden');
        $('<div class="payment-details-affirm">Affirm</div>').insertAfter('.payment-details');
        $('.edit-button').on('click', this.removeInsertedSummary);
        this.setSubmitButtonEnabled(true);
        $('button.btn.btn-primary.btn-block.submit-payment').trigger('click');
        this.setSubmitButtonEnabled(false);
    }

    handleCancel = function(response)
    {
        console.log("Affirm flow cancelled");
    }

    handleError = function(response)
    {
        if(response.providerData?.error?.reason === 'canceled')
        {
            this.handleCancel(response);
        }
        else
        {
            this.setSubmitButtonEnabled(false);
            this.showError(this.configDataAffirm.affirmFailureMessage);
        }
    }

    removeInsertedSummary = () =>
    {
        $('.payment-details').removeClass('checkout-hidden');
        $('.payment-details-affirm').remove();
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
            $(".payment-information").data("payment-method-id") === "AFFIRM" &&
            xhr.responseJSON.error
        ) {
            this.affirmBase.setOrderIdInput('');
            this.removeInsertedSummary();
        }
    }

    watchPaymentMethod = function()
    {
        $('ul.payment-options li.nav-item[data-method-id=AFFIRM]').on('click', this.paymentMethodHandler);
    }

    paymentMethodHandler = (_e) => {
        this.setSubmitButtonEnabled(false);
    }

    watchButtonLoadLag = function()
    {
        $('.affirm-option').on('click', this.waitForButtonLoad);
    }

    waitForButtonLoad = function()
    {
        if(!$('#fiserv_commercehub-affirm-button').children().length)
        {
            $.spinner().start();
        }
        $('.affirm-option').off('click', this.waitForButtonLoad);
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
            'affirm-approval',
            (buttonHandler) => buttonHandler.getFact('PRIMARY_PAYMENT_METHOD_NOT_REQURED') === false && buttonHandler.getFact('APM_APPROVAL') !== true
        );
    }

    setSubmitButtonEnabled = function(enabled)
    {
        window.fiservSubmitButtonHandler.setFact('APM_APPROVAL', enabled);
    }
}
