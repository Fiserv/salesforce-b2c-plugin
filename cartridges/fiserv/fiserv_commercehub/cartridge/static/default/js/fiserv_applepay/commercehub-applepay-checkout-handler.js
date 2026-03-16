'use strict';

class ApplePayEventHandler
{

    constructor(initializationData, sdkButton, applepayBase)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize Apple Pay button.");
        }

        this.sdkButton = sdkButton;
        this.applepayBase = applepayBase;
        this.formConfig = initializationData.config;
        this.configDataApplePay = initializationData.config.configData;

        this.watchButtonLoadLag();
        this.watchSubmitResponse();
        this.watchPaymentMethod();
    }

    initialize = function()
    {
        $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
    }

    handleApproval = async function(response)
    {
        this.completePayment = response.completePayment;
        $('.address-selector-block').find('.btn-show-details').trigger('click');
        let addressObject = this.createAddressObject(response.billingAddress);
        await FiservSDKHelper.populateAddress(addressObject, this.configDataApplePay.billingAddressFormNames, 'billing');

        $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', false);
        $('button.btn.btn-primary.btn-block.submit-payment').trigger('click');
        $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
    }

    handleCancel = function (response) 
    {
        console.log("Apple Pay flow cancelled");
    }

    handleError = function(response)
    {
        this.applepayFailure(this.configDataApplePay.applepayFailureMessage);
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

    watchSubmitResponse = function()
    {
        $(document).on("ajaxSuccess", $.proxy(this.onSubmitResponse, this));
    }

    onSubmitResponse = function(ev, xhr)
    {
        if (typeof(xhr.responseJSON) !== 'undefined' &&
            typeof(xhr.responseJSON.action) !== 'undefined' &&
            xhr.responseJSON.action === "CheckoutServices-SubmitPayment" &&
            $(".payment-information").data("payment-method-id") === "APPLEPAY"
        ) {
            if(xhr.responseJSON.isApplePaySuccess)
            {
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
            else
            {
                this.applepayBase.setSessionIdInput('');
                $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
                this.applepayFailure();
            }
        }
    }

    applepayFailure = function(message)
    {
        $('#fiserv_commercehub-applepay-button').children().remove();
        if(message)
            this.showError(message);
        this.completePayment('FAILURE');
        this.applepayBase.initialize();
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