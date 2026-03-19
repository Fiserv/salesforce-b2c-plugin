'use strict';

class CommercehubSamsungPay
{

    constructor(initializationData)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize Samsung Pay button.");
        }
        this.formConfig = initializationData.config;
        this.configDataSamsungPay = initializationData.config.configData;

        this.credentialsUrl = initializationData.credentialsUrl;
        this.createAdapter();

        this.watchButtonLoadLag();
        this.watchSubmitResponse();
        this.watchPaymentMethod();
        this.setupPlaceOrderHandler();
    }

    initialize = async function()
    {
        try {
            $.spinner().start();
            $('#fiserv-samsungpay-fatal-notice').hide();
            await this.sdkButton.initSdk(this.credentialsUrl, this.setSessionIdInput, "SamsungPay");
            this.setSubmitButtonEnabled(false);
        } catch (_err) {
            this.sdkLoadFailure(_err);
        }
    }

    createAdapter = function()
    {
        let loadSuccessCallback = () => { console.log("CommerceHub Samsung Pay SDK has loaded."); };
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
            onApprove: (response) => { this.samsungpayApproval(response); },
            onCancel: (response) => { this.samsungpayCancel(response); },
            onError: (response) => { this.samsungpayError(response); }
        };
    }

    sdkInitialized = async function()
    {
        try
        {
            await window.fiserv.components.samsungPay({
                data: this.configDataSamsungPay.buttonConfig,
                hooks: this.createCallbacksObject()
            });
            $('#fiserv_commercehub-samsungpay-button button').attr('type', 'button');
        }
        catch(e)
        {
            $('#fiserv-samsungpay-fatal-notice').show();
        }
        $.spinner().stop();
    }
    
    sdkLoadFailure = function (err)
    {
        console.log(err);
        $('#fiserv-samsungpay-fatal-notice').show();
        $.spinner().stop();
        throw new Error("Unable to load CommerceHub SDK.")
    }
    
    samsungpayApproval = async function(response)
    {
        this.setSubmitButtonEnabled(true);
        $('button.btn.btn-primary.btn-block.submit-payment').trigger('click');
        this.setSubmitButtonEnabled(false);
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
            this.setSessionIdInput('');
            this.setSubmitButtonEnabled(false);
            this.samsungpayFailure();
        }
    }

    samsungpayFailure = function(message)
    {
        $('#fiserv_commercehub-samsungpay-button').children().remove();

        if(message)
        this.showError(message);
        this.initialize();
    }

    samsungpayCancel = function()
    {
        console.log("Samsung Pay flow cancelled");
    }

    samsungpayError = function()
    {
        this.samsungpayFailure(this.configDataSamsungPay.samsungpayFailureMessage);
    }

    setSessionIdInput = function(sessionId)
    {
        $('input#commercehubSessionIdInputSamsungPay').val(sessionId);
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

    setupPlaceOrderHandler = function()
    {
        if (!window.fiservPlaceOrderHandler) {
        window.fiservPlaceOrderHandler = new PlaceOrderButtonHandler();
        this.setSubmitButtonEnabled(false);
        window.fiservPlaceOrderHandler.addBlocker(
            'samsung-pay',
            'samsungpay-approval',
            (facts) => facts.get('payment.required') === true && facts.get('payment.samsungpayApproved') !== true
        );
        }
    }

    showError = function(message)
    {
        let form = $('#dwfrm_billing');
        $('.alert', form).remove();
        form.prepend('<div class="alert alert-danger" role="alert">' + message + '</div>');
        $('.alert', form)[0].scrollIntoView({ block: 'center', behavior: 'smooth'});
    }

    setSubmitButtonEnabled = function (enabled)
    {
        window.fiservPlaceOrderHandler.setFact('payment.samsungpayApproved', enabled);
    }
}
