'use strict';

document.addEventListener("DOMContentLoaded", () => {
    let initialized = false;
    let guestTokenFlowEnabled = false;
    let savedCVVHandler = null;

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

            // Initialize saved CVV iframe fields if tokenization is enabled
            if (!savedCVVHandler && $('.saved-cvv-field-frame').length) {
                initSavedCVVIframes();
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

    let initSavedCVVIframes = function()
    {
        if (savedCVVHandler) {
            console.log('CVV handler already initialized');
            return;
        }

        // Ensure form and config are ready
        if (!form || !form.formConfig) {
            console.error('Form config not ready, cannot initialize CVV fields');
            return;
        }

        // Check if CVV containers exist in DOM
        const cvvContainers = $('.saved-cvv-container');
        if (cvvContainers.length === 0) {
            console.log('No CVV containers found in DOM');
            return;
        }

        console.log(`Found ${cvvContainers.length} CVV container(s), initializing...`);

        try {
            savedCVVHandler = new SavedCVVIframeHandler();
            savedCVVHandler.initializeSavedCVVFields(form.formConfig, form.credentialsUrl);
            console.log('Saved CVV SDK fields initialized successfully');
        } catch (error) {
            console.error('Failed to initialize CVV fields:', error);
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

            // Initialize CVV iframes if not already initialized
            if (!savedCVVHandler && $('.saved-cvv-container').length) {
                initSavedCVVIframes();
            }

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
            // Check if using new handler
            if (savedCVVHandler) {
                savedCVVHandler.updateSubmitButton();
                return;
            }

            // Fallback to basic validation
            let cvvInput = selectedPayment.find('.saved-payment-security-code');
            
            // If CVV field doesn't exist (tokenization disabled), enable submit button
            if (!cvvInput.length) {
                form.enableSubmitButton();
                return;
            }
            
            let cvvValue = cvvInput.val();
            let isValid = cvvValue && cvvValue.length >= 3 && cvvValue.length <= 4 && /^[0-9]{3,4}$/.test(cvvValue);

            if (isValid) {
                form.enableSubmitButton();
            } else {
                form.disableSubmitButton();
            }
        }
    };

    // Prevent CVV iframe clicks from bubbling to parent
    $(document).on('click', '.saved-payment-security-code, .saved-cvv-mask-btn', function(e) {
        e.stopPropagation();
    });

    // Watch for saved payment selection changes (if handler not initialized)
    $(document).on('click', '.saved-payment-instrument', function(e) {
        // Only handle if CVV handler not initialized (fallback behavior)
        if (savedCVVHandler) {
            return; // Handler will manage this
        }

        // Only change selection if not clicking on CVV field or its controls
        if (!$(e.target).closest('.saved-payment-security-code, .saved-cvv-mask-btn').length) {
            $('.saved-payment-instrument').removeClass('selected-payment');
            $(this).addClass('selected-payment');
            validateSavedPaymentCVV();
        }
    });

    // Initial validation on page load
    if (savedPaymentsPresent() && creditCardFormHidden()) {
        // Initialize CVV iframes if saved payments are showing
        if (!savedCVVHandler && $('.saved-cvv-field-frame').length) {
            initSavedCVVIframes();
        }
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

    // Delayed initialization for CVV iframes to ensure everything is ready
    setTimeout(() => {
        if (!savedCVVHandler && savedPaymentsPresent() && creditCardFormHidden() && $('.saved-cvv-container').length) {
            console.log('Attempting delayed CVV iframe initialization...');
            initSavedCVVIframes();
        }
    }, 500);
});