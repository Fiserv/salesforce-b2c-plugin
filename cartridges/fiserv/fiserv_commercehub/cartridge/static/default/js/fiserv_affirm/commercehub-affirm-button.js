'use strict';

class CommercehubAffirm
{
    constructor(initializationData)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize Affirm button.");
        }

        this.formConfig = initializationData.config;
        this.configDataAffirm = initializationData.config.configData;
        this.credentialsUrl = initializationData.credentialsUrl;

        this.createAdapter();

        this.watchButtonLoadLag();
        this.watchSubmitResponse();
        this.watchPaymentMethod();
    }

    initialize = async function()
    {
        try {
            $.spinner().start();
            $('#fiserv-affirm-fatal-notice').hide();
            await this.sdkButton.initSdk(this.credentialsUrl, null, "Affirm");
            $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
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
            onApprove: (response) => { this.affirmApproval(response); },
            onCancel: (response) => { this.affirmCancel(response); },
            onError: (response) => { this.affirmError(response); }
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

    affirmApproval = function(response)
    {
        this.setOrderIdInput(response.orderId);
        $('.payment-details').addClass('checkout-hidden');
        $('<div class="payment-details-affirm">Affirm</div>').insertAfter('.payment-details');
        $('.edit-button').on('click', this.removeInsertedSummary);
        $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', false);
        $('button.btn.btn-primary.btn-block.submit-payment').trigger('click');
    }

    removeInsertedSummary = () =>
    {
        $('.payment-details').removeClass('checkout-hidden');
        $('.payment-details-affirm').remove();
        $('.edit-button').off('click', this.removeInsertedSummary);
    }

    affirmCancel = function()
    {
        console.log("Affirm flow cancelled");
    }

    affirmError = function(response)
    {
        if(response.providerData?.error?.reason === 'canceled')
        {
            this.affirmCancel(response);
        }
        else
        {
            $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
            this.showError(this.configDataAffirm.affirmFailureMessage);
        }
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
            this.setOrderIdInput('');
            this.removeInsertedSummary();
            $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
        }
    }

    setOrderIdInput = function(orderId)
    {
        $('input#commercehubOrderIdInputAffirm').val(orderId);
    }

    watchPaymentMethod = function()
    {
        $('ul.payment-options li.nav-item[data-method-id=AFFIRM]').on('click', this.paymentMethodHandler);
    }

    paymentMethodHandler = (_e) => {
        $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
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
}