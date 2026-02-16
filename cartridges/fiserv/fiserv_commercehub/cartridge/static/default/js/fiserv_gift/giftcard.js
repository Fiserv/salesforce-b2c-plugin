'use strict';

document.addEventListener("DOMContentLoaded", () => {
    let extractInitializationData = function()
    {
        let data = {
            config: $('#fiserv-commercehub-gift-form-init-container').data('commercehub-initialization-data'),
            credentialsUrl: $('#fiserv-commercehub-gift-form-init-container').attr('data-commercehub-credentials'),
            balanceUrl: $('#fiserv-commercehub-gift-form-init-container').attr('data-commercehub-balance-inquiry'),
            applyUrl: $('#fiserv-commercehub-gift-form-init-container').attr('data-commercehub-gift-apply'),
            giftRemoveUrl: $('#fiserv-commercehub-gift-form-init-container').attr('data-commercehub-gift-remove'),
            recalculateGiftUrl: $('#fiserv-commercehub-gift-form-init-container').attr('data-commercehub-recalculate')
        }
        $('#fiserv-commercehub-gift-form-init-container').remove();
        return data;
    }

    const checkoutStage = $('#fiserv-commercehub-gift-form-init-container').attr('data-initial-checkout-stage');

    if(checkoutStage !== undefined)
    {
        let form = new CommercehubGiftForm(extractInitializationData());
        let initialized = false;

        let clearGiftForm = function()
        {
            if (initialized)
            {
                form.resetForm();
                initialized = false;
            }
        };

        let initGiftForm = function()
        {
            if (!initialized)
            {
                form.initialize();
                showGiftPanel();
                initialized = true;
            }
        };

        let hideGiftPanel = function()
        {
            let panel = $('#ch-gift-panel');
            if(panel.length)
            {
                panel.hide();
            }
        };

        let showGiftPanel = function()
        {
            let panel = $('#ch-gift-panel');
            if(panel.length)
            {
                panel.show();
            }
        };

        // clear gift form on shipping/customer edit buttons
        $('.customer-summary .edit-button,.shipping-summary .edit-button').on('click', () => {
            clearGiftForm();
            hideGiftPanel();
        });

        // clear and reinit gift form on payment edit button
        $('.payment-summary .edit-button').on('click', () => {
            clearGiftForm();
            initGiftForm();
        });

        // set listener for ajax success of shipping submit action
        // after which we init gift form
        $(document).on("ajaxSuccess", (ev, xhr) => {
            if (typeof(xhr.responseJSON) !== 'undefined' &&
                typeof(xhr.responseJSON.action) !== 'undefined' &&
                xhr.responseJSON.action === "CheckoutShippingServices-SubmitShipping" &&
                typeof(xhr.responseJSON.order) !== 'undefined' &&
                typeof(xhr.responseJSON.order.shipping) !== 'undefined')
            {
                initGiftForm();
            }
        });

        // set listener for ajax success of payment submit action
        // after which we hide gift form
        $(document).on("ajaxSuccess", (ev, xhr) => {
            if (typeof(xhr.responseJSON) !== 'undefined' &&
                typeof(xhr.responseJSON.action) !== 'undefined' &&
                xhr.responseJSON.action === "CheckoutServices-SubmitPayment" &&
                typeof(xhr.responseJSON.paymentMethod) !== 'undefined')
            {
                clearGiftForm();
                hideGiftPanel();
            }
        });

        // if payment stage: instantiate gift form
        // if beyond payment stage: return to payment stage
        switch (checkoutStage) {
            case 'payment':
                initGiftForm();
                break;
            case 'placeOrder':
                hideGiftPanel();
                break;
            default:
                hideGiftPanel();
                break;
        }
    }
    else
    {
        let form = new CommercehubGiftForm(extractInitializationData());
        form.initialize();
    }
});