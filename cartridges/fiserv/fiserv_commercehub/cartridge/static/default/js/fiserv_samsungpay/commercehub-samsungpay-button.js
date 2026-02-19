//samsung button.js


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

        this.configDataSamsungPay.buttonConfig.button['locale'] = initializationData.locale.replace('_', '-');
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
            $('#fiserv-samsungpay-fatal-notice').hide();
            await this.sdkButton.initSdk(this.credentialsUrl, this.setSessionIdInput, "SamsungPay");
            $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
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

    createAddressObject = function(responseAddress)
    {
        // Defensive check: ensure responseAddress exists
        if (!responseAddress) {
            return null;
        }

        // Defensive check: ensure responseAddress.address exists
        if (!responseAddress.address) {
            return null;
        }

        return {
            firstName: responseAddress.firstName || '',
            lastName: responseAddress.lastName || '',
            street: responseAddress.address.street || '',
            houseNumberOrName: responseAddress.address.houseNumberOrName || '',
            city: responseAddress.address.city || '',
            stateOrProvince: responseAddress.address.stateOrProvince || '',
            postalCode: responseAddress.address.postalCode || '',
            country: responseAddress.address.country || ''
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
            setTimeout(() => {
                const buttonContainer = document.querySelector('#fiserv_commercehub-samsungpay-button');
                const button = buttonContainer ? buttonContainer.querySelector('button') : null;
                if (button) {
                    // Ensure button type is "button" not "submit" to prevent form submission
                    if (button.type === 'submit') {
                        button.type = 'button';
                    }
                }
            }, 300);
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
        this.completePayment = response.completePayment;
        $('.address-selector-block').find('.btn-show-details').trigger('click');
        
        // Create address object with defensive checks
        let addressObject = this.createAddressObject(response.billingAddress);
        
        // Only populate address if we have a valid address object
        if (addressObject) {
            await FiservSDKHelper.populateAddress(addressObject, this.configDataSamsungPay.billingAddressFormNames, 'billing');
        }

  
        // Mark button as approved before triggering submission
        $('button.btn.btn-primary.btn-block.submit-payment').data('samsung-pay-approved', true);
        $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', false);
        $('button.btn.btn-primary.btn-block.submit-payment').trigger('click');
        $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
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
            $(".payment-information").data("payment-method-id") === "SAMSUNGPAY"
        ) {
            if(xhr.responseJSON.isSamsungPaySuccess)
            {
                new Promise((resolve, reject) => {
                    FiservSDKHelper.backendCall(xhr.responseJSON.placeOrderURL, resolve, reject);
                })
                .then(async (response) => {
                    if(response.error)
                    {
                        this.samsungpayFailure(response.errorMessage);
                        return;
                    }

                    this.samsungpaySuccess(response);
                }).catch((error) => {
                    this.samsungpayFailure();
                });
            }
            else
            {
                this.setSessionIdInput('');
                $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
                this.samsungpayFailure();
            }
        }
    }

    samsungpayFailure = function(message)
    {
        if (message) {
            console.error("[Samsung Pay] Error:", message);
        }

        $('#fiserv_commercehub-samsungpay-button').children().remove();

        // Reset approval flag
        $('button.btn.btn-primary.btn-block.submit-payment').data('samsung-pay-approved', false);

        if(message)
        this.showError(message);
        this.completePayment('FAILURE');
        this.initialize();
    }

    samsungpaySuccess = function(data)
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
        $('ul.payment-options li.nav-item[data-method-id=SAMSUNGPAY]').on('click', this.paymentMethodHandler);
    }

    paymentMethodHandler = (_e) => {
        $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
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
}
