'use strict';

document.addEventListener("DOMContentLoaded", () => {
    let extractInitializationData = function()
    {
        let data = {
            config: $('#fiserv-commercehub-samsungpay-form-init-container').data('commercehub-initialization-data'),
            credentialsUrl: $('#fiserv-commercehub-samsungpay-form-init-container').attr('data-commercehub-credentials'),
            locale: $('#fiserv-commercehub-samsungpay-form-init-container').attr('data-locale')
        }
        $('#fiserv-commercehub-samsungpay-form-init-container').remove();
        return data;
    }

    //const checkoutStage = $('#fiserv-commercehub-samsungpay-form-init-container').attr('data-initial-checkout-stage');
    let form = new CommercehubSamsungPay(extractInitializationData());
    let initialized = false;
    let initializingPromise = null;
    let postInitPaymentChangeDetected = false;

    let initSamsungPay = async function()
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

        $('#fiserv_commercehub-samsungpay-button').children().remove();
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
            $(".payment-information").data("payment-method-id") === "SAMSUNGPAY")
        {
            initSamsungPay();
        }
    });

    const samsungPayNavItem = $('ul.payment-options li.nav-item[data-method-id=SAMSUNGPAY]');
    if (samsungPayNavItem.hasClass('active')) {
        initSamsungPay();
    } else if ($('ul.payment-options li.nav-item').length > 0 && $('ul.payment-options li.nav-item.active').length === 0) {
        samsungPayNavItem.find('a').one('shown.bs.tab', function () {
            initSamsungPay();
        });
        $('ul.payment-options li.nav-item:first').find('a').trigger('click');
    }

    samsungPayNavItem.on('click', () => {
        initSamsungPay();
    });

    $('.payment-summary .edit-button').on('click', () => {
        if($(".payment-information").data("payment-method-id") === "SAMSUNGPAY")
            initSamsungPay();
    })

    let grandTotalUpdated = function()
    {
        if(window.fiservPluginSDKInitRan)
        {
            postInitPaymentChangeDetected = true;
        }

        $('#fiserv_commercehub-samsungpay-button').children().remove();
        if(initialized)
        {
            // Temporary fix...
            location.reload();
            return;

            initialized = false;
            if($('.data-checkout-stage').attr('data-checkout-stage') === "payment"
                && $(".payment-information").data("payment-method-id") === "SAMSUNGPAY")
                initSamsungPay();
        }
    }
    new MutationObserver(() => { grandTotalUpdated(); }).observe($('.grand-total-sum')[0], { childList: true });
});
