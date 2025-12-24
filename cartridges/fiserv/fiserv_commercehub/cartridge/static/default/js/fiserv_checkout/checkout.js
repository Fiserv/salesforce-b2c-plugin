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
        if($(".payment-information").data("payment-method-id") === "CREDIT_CARD" && $('.credit-card-form.checkout-hidden').length)
        {
            form.watchSubmitButtonToken();
            validateSavedPaymentCVV();
        }
    });

    $('.btn.add-payment').click(()=> {
        clearPaymentForm();
        initPaymentForm();
    });

    // CVV validation for saved payment instruments
    let validateSavedPaymentCVV = function(showEmptyError) {
        let selectedPayment = $('.saved-payment-instrument.selected-payment');
        if (selectedPayment.length) {
            let cvvInput = selectedPayment.find('.saved-payment-security-code');
            
            // If CVV field doesn't exist (tokenization disabled), enable submit button
            if (!cvvInput.length) {
                form.enableSubmitButton();
                return;
            }
            
            let cvvValue = cvvInput.val();
            let isValid = cvvValue && cvvValue.length >= 3 && cvvValue.length <= 4 && /^[0-9]{3,4}$/.test(cvvValue);
            let errorMsg = cvvInput.closest('.col').find('.invalid-feedback');
            
            if (isValid) {
                form.enableSubmitButton();
                cvvInput.removeClass('is-invalid').addClass('is-valid');
                errorMsg.hide();
            } else {
                form.disableSubmitButton();
                // Show error if value is invalid or if field was cleared after having a value
                if ((cvvValue && cvvValue.length > 0) || showEmptyError) {
                    cvvInput.removeClass('is-valid').addClass('is-invalid');
                    errorMsg.show().css('display', 'block');
                } else {
                    cvvInput.removeClass('is-valid is-invalid');
                    errorMsg.hide();
                }
            }
        }
    };

    // Watch for CVV input on saved payment instruments
    $(document).on('input', '.saved-payment-security-code', function() {
        let wasValid = $(this).hasClass('is-valid');
        validateSavedPaymentCVV(wasValid && $(this).val().length === 0);
    });

    // Watch for CVV field blur to show error if empty
    $(document).on('blur', '.saved-payment-security-code', function() {
        if ($(this).val().length === 0) {
            validateSavedPaymentCVV(true);
        }
    });

    // Prevent CVV field clicks from bubbling to parent
    $(document).on('click', '.saved-payment-security-code, .saved-cvv-mask-toggle', function(e) {
        e.stopPropagation();
    });

    // Watch for saved payment selection changes
    $(document).on('click', '.saved-payment-instrument', function(e) {
        // Only change selection if not clicking on CVV field or its controls
        if (!$(e.target).closest('.saved-payment-security-code, .saved-cvv-mask-toggle, .input-group').length) {
            $('.saved-payment-instrument').removeClass('selected-payment');
            $(this).addClass('selected-payment');
            validateSavedPaymentCVV();
        }
    });

    // Initial validation on page load
    if (savedPaymentsPresent() && creditCardFormHidden()) {
        validateSavedPaymentCVV();
    }

    // CVV masking toggle for saved payment instruments
    $(document).on('click', '.saved-cvv-mask-toggle', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        let targetId = $(this).data('target');
        let input = $('#' + targetId);
        let icon = $(this).find('i');
        
        if (input.length > 0) {
            if (input.attr('type') === 'password') {
                input.attr('type', 'text');
                icon.removeClass('fa-eye').addClass('fa-eye-slash');
            } else {
                input.attr('type', 'password');
                icon.removeClass('fa-eye-slash').addClass('fa-eye');
            }
        }
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