'use strict';

document.addEventListener("DOMContentLoaded", () => {
    let initialized = false;
    let guestTokenFlowEnabled = false;

    // detect current stage
    const checkoutStage = $('#fiserv-commercehub-card-form-init-container').attr('data-initial-checkout-stage');

    let extractInitializationData = function()
    {
        let data = {
            config: $('#fiserv-commercehub-card-form-init-container').data('commercehub-initialization-data'),
            userLoggedIn: $('#fiserv-commercehub-card-form-init-container').data('user-logged-in'),
            credentialsUrl: $('#fiserv-commercehub-card-form-init-container').attr('data-commercehub-credentials'),
            tokenizationUrl: $('#fiserv-commercehub-card-form-init-container').attr('data-commercehub-tokenization')
        }
        $('#fiserv-commercehub-card-form-init-container').remove();

        guestTokenFlowEnabled = data.config.configData.tokenizeEarlyGuest;

        return data;
    }

    let savedPaymentsPresent = function()
    {
        return $('.saved-payment-information').length
    };

    let creditCardFormHidden = function()
    {
        return $('.credit-card-form.checkout-hidden').length
    }

    let form = new CommercehubCheckoutForm(extractInitializationData());

    let clearPaymentForm = function()
    {
        form.unwatchSubmitButton();
        if (initialized)
        {
            $('input#commercehubSessionIdInput').val('');
            $('input#cardNumber').val('');
            form.resetForm();
            initialized = false;
        }
    };

    let initCreditCardSection = function()
    {
        if(!savedPaymentsPresent() || !creditCardFormHidden())
        {
            initPaymentForm();
        }
        else
        {
            form.unwatchSubmitButtonToken();
            form.watchSubmitButtonToken();
        }
    }

    let initPaymentForm = function()
    {
        if (!initialized)
        {
            form.initialize();
            initialized = true;
        }
    };

    // clear payment form on shipping/customer edit buttons
    $('.customer-summary .edit-button,.shipping-summary .edit-button').on('click', () => {
        clearPaymentForm();
        if(savedPaymentsPresent())
        {
            $('.cancel-new-payment').trigger('click');
        }
    });

    // clear and reinit payment form on payment edit button
    $('.payment-summary .edit-button').on('click', () => {
        if($(".payment-information").data("payment-method-id") !== "CREDIT_CARD")
            return;

        if (!creditCardFormHidden())
        {
            if(savedPaymentsPresent() &&
                (($('input#saveCreditCard').length &&
                $('input#saveCreditCard')[0].checked) ||
                guestTokenFlowEnabled))
            {
                $('.cancel-new-payment').trigger('click');
            }
            else
            {
                clearPaymentForm();
                initPaymentForm();
            }
        }
        else
        {
            form.watchSubmitButtonToken();
        }
    });

    // set listener for ajax success of shipping submit action
    // after which we init payment form
    // if saved payment menu is active, do not init form
    $(document).on("ajaxSuccess", (ev, xhr) => {
        if (typeof(xhr.responseJSON) !== 'undefined' &&
            typeof(xhr.responseJSON.action) !== 'undefined' &&
            xhr.responseJSON.action === "CheckoutShippingServices-SubmitShipping" &&
            typeof(xhr.responseJSON.order) !== 'undefined' &&
            typeof(xhr.responseJSON.order.shipping) !== 'undefined' &&
            $(".payment-information").data("payment-method-id") === "CREDIT_CARD")
        {
            initCreditCardSection();
        }
    });

    $('.btn.cancel-new-payment').click(()=> {
        form.watchSubmitButtonToken();
        if (form.shouldEnableSubmitButtonOnCancelNewPayment())
        {
            form.enableSubmitButton();
        }
    });

    $('.btn.add-payment').click(()=> {
        clearPaymentForm();
        initPaymentForm();
    });

    // if payment stage: instantiate payment form
    // if beyond payment stage: return to payment stage
    if($(".payment-information").data("payment-method-id") === "CREDIT_CARD")
    {
        switch (checkoutStage) {
            case 'payment':
                initCreditCardSection();
                break;
        }
    }
});
