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

    //const checkoutStage = $('#fiserv-commercehub-paypal-form-init-container').attr('data-initial-checkout-stage');
    let form = new CommercehubPayPal(extractInitializationData());
    let initialized = false;
    let initializingPromise = null;
    let postInitPaymentChangeDetected = false;

    let initPayPal = async function()
    {
        // Temporary fix...
        if(postInitPaymentChangeDetected)
        {
            location.reload();
            return;
        }

        if (initialized || initializingPromise)
        {
            return;
        }

        $('#fiserv_commercehub-paypal-button').children().remove();
        initializingPromise = form.initialize();
        await initializingPromise;
        initialized = true;
        initializingPromise = null;
    };

    $(document).on("ajaxSuccess", (ev, xhr) => { 
        if (typeof(xhr.responseJSON) !== 'undefined' &&
            typeof(xhr.responseJSON.action) !== 'undefined' &&
            xhr.responseJSON.action === "CheckoutShippingServices-SubmitShipping" &&
            typeof(xhr.responseJSON.order) !== 'undefined' &&
            typeof(xhr.responseJSON.order.shipping) !== 'undefined' &&
            $(".payment-information").data("payment-method-id") === "PAYPAL")
        {
            initPayPal();
        }
    });

    const paypalNavItem = $('ul.payment-options li.nav-item[data-method-id=PAYPAL]');

    if (paypalNavItem.hasClass('active')) {
        initPayPal();
    } else if ($('ul.payment-options li.nav-item').length > 0 && $('ul.payment-options li.nav-item.active').length === 0) {
        paypalNavItem.find('a').one('shown.bs.tab', function () {
            initPayPal();
        });
        $('ul.payment-options li.nav-item:first').find('a').trigger('click');
    }

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
        if (initPromise)
        {
            // Temporary fix...
            location.reload();
        }
    }
    new MutationObserver(() => { grandTotalUpdated(); }).observe($('.grand-total-sum')[0], { childList: true });
});
