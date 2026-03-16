'use strict';

document.addEventListener("DOMContentLoaded", () => {
    let initialized = false;
    let basketTokenFlowEnabled = false;

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

        basketTokenFlowEnabled = data.config.configData.basketTokenization;

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
            if (form.cvvEnabled)
            {
                form.initializeTokenCVVForms();
                form.disableSubmitButton();
            }
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

        if (form.cvvEnabled) form.initializeTokenCVVForms();

        if (!creditCardFormHidden())
        {
            if(savedPaymentsPresent() &&
                (($('input#saveCreditCard').length &&
                $('input#saveCreditCard')[0].checked) ||
                basketTokenFlowEnabled))
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
        if (form.shouldEnableSubmitButtonOnCancelNewPayment()) form.enableSubmitButton();
        else form.disableSubmitButton();
    });

    $('.btn.add-payment').click(()=> {
        clearPaymentForm();
        initPaymentForm();
    });

    $(document).on('ajaxSuccess', (ev, xhr) => {
        if (typeof(xhr.responseJSON) === 'undefined' ||
            typeof(xhr.responseJSON.paymentCovered) === 'undefined' ||
            $(".payment-information").data("payment-method-id") !== "CREDIT_CARD")
        {
            return;
        }

        if (xhr.responseJSON.paymentCovered)
        {
            form.unwatchSubmitButton();
        }
        else
        {
            form.watchSubmitButton();
            if (form.validForm) form.enableSubmitButton();
            else form.disableSubmitButton();
        }
    });

    // if payment stage: instantiate payment form
    if($(".payment-information").data("payment-method-id") === "CREDIT_CARD")
    {
        switch (checkoutStage) {
            case 'payment':
                initCreditCardSection();
                break;
        }
    }
});
