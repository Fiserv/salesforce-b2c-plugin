"use strict"

class CommercehubApplePay
{

    constructor(initializationData)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize PayPal button.");
        }

        this.formConfig = initializationData.config;
        this.configDataApplePay = initializationData.config.configData;
        this.configDataApplePay.buttonConfig.button['locale'] = initializationData.locale.replace('_', '-');
        this.credentialsUrl = initializationData.credentialsUrl;

        this.createAdapter();

        this.watchButtonLoadLag();
        this.watchPaymentMethod();
    }

    initialize = async function()
    {
        try {
            $.spinner().start();
            $('#fiserv-applepay-fatal-notice').hide();
            await this.sdkButton.initSdk(this.credentialsUrl, this.setSessionIdInput, "ApplePay");
        } catch (_err) {
            this.sdkLoadFailure(_err);
        }
    }

    createAdapter = function()
    {
        let loadSuccessCallback = () => { console.log("CommerceHub Apple Pay SDK has loaded."); };
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
            onApprove: (response) => { this.applepayApproval(response); },
            onCancel: (response) => { this.applepayCancel(response); },
            onError: (response) => { this.applepayError(response); }
        };
    }

    createAddressObject = function(responseAddress)
    {
        return {
            firstName: responseAddress.firstName,
            lastName: responseAddress.lastName,
            street: responseAddress.address.street,
            houseNumberOrName: responseAddress.address.houseNumberOrName,
            city: responseAddress.address.city,
            stateOrProvince: responseAddress.address.stateOrProvince,
            postalCode: responseAddress.address.postalCode,
            country: responseAddress.address.country
        };
    }

    sdkInitialized = async function()
    {
        try
        {
            await window.fiserv.components.applePay({ data: this.configDataApplePay.buttonConfig, hooks: this.createCallbacksObject() });
        }
        catch(e)
        {
            console.log(e);
            $('#fiserv-applepay-fatal-notice').show();
        }
        $.spinner().stop();
    }

    sdkLoadFailure = function (err) 
    {
        console.log(err);
        $('#fiserv-applepay-fatal-notice').show();
        $.spinner().stop(); 
        throw new Error("Unable to load CommerceHub SDK.")
    }

    applepayApproval = async function(response)
    {
        $(document).on("ajaxSuccess", $.proxy(this.immediatePlaceOrder, this));
        this.completePayment = response.completePayment;
        $('.address-selector-block').find('.btn-show-details').trigger('click');
        let addressObject = this.createAddressObject(response.billingAddress);
        await FiservSDKHelper.populateAddress(addressObject, this.configDataApplePay.billingAddressFormNames, 'billing');

        $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', false);
        $('button.btn.btn-primary.btn-block.submit-payment').trigger('click');
        $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
    }

    immediatePlaceOrder = function(ev, xhr)
    { 
        $(document).off("ajaxSuccess", this.immediatePlaceOrder);
        if (typeof(xhr.responseJSON) !== 'undefined' &&
            typeof(xhr.responseJSON.action) !== 'undefined' &&
            xhr.responseJSON.action === "CheckoutServices-SubmitPayment" &&
            xhr.responseJSON.isApplePaySuccess
        ) {
            new Promise((resolve, reject) => {
                FiservSDKHelper.backendCall(xhr.responseJSON.placeOrderURL, resolve, reject);
            })
            .then(async (response) => {
                if(response.error)
                {
                    this.applepayFailure(response.errorMessage);
                    return;
                }

                this.applepaySuccess(response);
            }).catch((error) => {
                this.applepayFailure();
            });
        }
    }

    applepayFailure = function(message)
    {
        $('#fiserv_commercehub-applepay-button').children().remove();
        if(message)
            this.showError(message);
        this.completePayment('FAILURE');
        this.initialize();
    }

    applepaySuccess = function(data)
    {
        this.completePayment('SUCCESS');

        var redirect = $('<form>')
            .appendTo(document.body)
            .attr({
                method: 'POST',
                action: data.continueUrl
            });

        $('<input>')
            .appendTo(redirect)
            .attr({
                name: 'orderID',
                value: data.orderID
            });

        $('<input>')
            .appendTo(redirect)
            .attr({
                name: 'orderToken',
                value: data.orderToken
            });

        redirect.submit();
    }

    applepayCancel = function()
    {
        console.log("Apple Pay flow cancelled");
    }

    applepayError = function()
    {
        applepayFailure(this.configDataApplePay.applepayFailureMessage);
    }

    setSessionIdInput = function(sessionId)
    {
        $('input#commercehubSessionIdInputApplePay').val(sessionId);
    }

    watchPaymentMethod = function()
    {
        $('ul.payment-options li.nav-item[data-method-id=APPLEPAY]').on('click', this.paymentMethodHandler);
    }

    paymentMethodHandler = (_e) => {
        $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
    }

    watchButtonLoadLag = function()
    {
        $('.applepay-option').on('click', this.waitForButtonLoad);
    }

    waitForButtonLoad = function()
    {
        if(!$('#fiserv_commercehub-applepay-button').children().length)
        {
            $.spinner().start();
        }
        $('.applepay-option').off('click', this.waitForButtonLoad);
    }

    showError = function(message)
    {
        let form = $('#dwfrm_billing');
        $('.alert', form).remove();
        form.prepend('<div class="alert alert-danger" role="alert">' + message + '</div>');
        $('.alert', form)[0].scrollIntoView({ block: 'center', behavior: 'smooth'});
    }
}