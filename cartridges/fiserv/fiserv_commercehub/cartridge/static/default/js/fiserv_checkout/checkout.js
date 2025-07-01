/* eslint-disable prefer-regex-literals */
document.addEventListener("DOMContentLoaded", () => { // eslint-disable-line
    let initialized = false;
    let getFormConfigUrl = function () 
    {
        return $('#fiserv-commercehub-card-form-container').attr('data-commercehub-form-config');
    }

    let getCredentialsUrl = function () 
    {
        return $('#fiserv-commercehub-card-form-container').attr('data-commercehub-credentials');
    }

    let getTokenizationUrl = function () 
    {
        return $('#fiserv-commercehub-card-form-container').attr('data-commercehub-tokenization');
    }

    let savedPaymentsPresent = function()
    {
        return $('.saved-payment-information').length
    };

    let creditCardFormHidden = function()
    {
        return $('.credit-card-form.checkout-hidden').length
    }

    let form = new CommercehubCheckoutForm(getFormConfigUrl(), getCredentialsUrl(), getTokenizationUrl());

    let clearPaymentForm = function()
    {
        if (initialized)
        {
            $('input#commercehubSessionIdInput').val('');
            $('input#cardNumber').val('');
            form.resetForm();
            initialized = false;
        }
    };  

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
        if (!creditCardFormHidden())
        {
            if(savedPaymentsPresent() && $('input#saveCreditCard').length && $('input#saveCreditCard')[0].checked)
            {
                $('.cancel-new-payment').trigger('click');
            }
            else
            {
                clearPaymentForm();
                initPaymentForm();
            }
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
            !savedPaymentsPresent() && !creditCardFormHidden())
        {
            initPaymentForm();
        }
    });

    $('.btn.cancel-new-payment').click(()=> {
        clearPaymentForm();
    });

    $('.btn.add-payment').click(()=> {
        clearPaymentForm();
        initPaymentForm();
    });

    // detect current stage
    const checkoutStage = new RegExp('[?&]stage=([a-zA-Z0-9]+)([^&]*)').exec(
        window.location.search,
    );

    // if payment stage: instantiate payment form
    // if beyond payment stage: return to payment stage
    switch (checkoutStage[1]) {
        case 'payment':
            if (!savedPaymentsPresent() && !creditCardFormHidden())
            {
                initPaymentForm();
            }
            break;
    }
});