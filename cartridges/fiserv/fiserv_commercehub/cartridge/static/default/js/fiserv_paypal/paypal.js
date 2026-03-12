'use strict';

document.addEventListener("DOMContentLoaded", () => {
    let extractInitializationData = function()
    {
        let data = {
            config: $('#fiserv-commercehub-paypal-form-init-container').data('commercehub-initialization-data'),
            credentialsUrl: $('#fiserv-commercehub-paypal-form-init-container').attr('data-commercehub-credentials'),
        }
        $('#fiserv-commercehub-paypal-form-init-container').remove();
        return data;
    }

    const checkoutStage = $('#fiserv-commercehub-paypal-form-init-container').attr('data-initial-checkout-stage');
    let form = new CommercehubPayPal(extractInitializationData());
    let initialized = false;
    let initializingPromise = null;
    let postInitPaymentChangeDetected = false;

    let initPayPal = async function()
    {
        if(postInitPaymentChangeDetected)
        {
            location.reload();
            return;
        }

        $('#fiserv_commercehub-paypal-button').children().remove();
        await form.initialize();
        initialized = true;

    };

    $(document).on("ajaxSuccess", (ev, xhr) => { 
        if (typeof(xhr.responseJSON) !== 'undefined' &&
            typeof(xhr.responseJSON.action) !== 'undefined' &&
            xhr.responseJSON.action === "CheckoutShippingServices-SubmitShipping" &&
            typeof(xhr.responseJSON.order) !== 'undefined' &&
            typeof(xhr.responseJSON.order.shipping) !== 'undefined' &&
            ($(".payment-information").data("payment-method-id") === "PAYPAL" || $('.paypal-tab.active').length > 0))
        {
            initPayPal();
        }
    });

    const paypalNavItem = $('ul.payment-options li.nav-item[data-method-id=PAYPAL]');

    paypalNavItem.on('click', () => {
        initPayPal();
    });

    $('.payment-summary .edit-button').on('click', () => {
        if($(".payment-information").data("payment-method-id") === "PAYPAL")
            initPayPal();
    })

    let grandTotalUpdated = function()
    {
        if (window.fiservPluginSDKInitRan)
        {
            postInitPaymentChangeDetected = true;
        }

        $('#fiserv_commercehub-paypal-button').children().remove();
        if (initializingPromise)
        {
            // Temporary fix...
            location.reload();
        }
    }

    if (checkoutStage === 'payment' && $(".payment-information").data("payment-method-id") === "PAYPAL")
    {
        initPayPal();
    }

    if ($('.paypal-tab.active').length > 0 && !initialized)
    {
        initPayPal();
    }

    if ($('ul.payment-options li.nav-item').length > 0 && $('ul.payment-options li.nav-item.active').length === 0 && $(".payment-information").data("payment-method-id") === "PAYPAL")
    {
        paypalNavItem.find('a').trigger('click');
        initPayPal();
    }

    new MutationObserver(() => { grandTotalUpdated(); }).observe($('.grand-total-sum')[0], { childList: true });
});
