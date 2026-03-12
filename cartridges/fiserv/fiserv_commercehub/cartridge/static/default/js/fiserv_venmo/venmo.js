'use strict';

document.addEventListener("DOMContentLoaded", () => {
    let extractInitializationData = function()
    {
        let data = {
            config: $('#fiserv-commercehub-venmo-form-init-container').data('commercehub-initialization-data'),
            credentialsUrl: $('#fiserv-commercehub-venmo-form-init-container').attr('data-commercehub-credentials'),
        }
        $('#fiserv-commercehub-venmo-form-init-container').remove();
        return data;
    }

    const checkoutStage = $('#fiserv-commercehub-venmo-form-init-container').attr('data-initial-checkout-stage');
    let form = new CommercehubVenmo(extractInitializationData());
    let initialized = false;
    let initializingPromise = null;
    let postInitPaymentChangeDetected = false;

    let initVenmo = async function()
    {
        if(postInitPaymentChangeDetected)
        {
            location.reload();
            return;
        }

        $('#fiserv_commercehub-venmo-button').children().remove();
        await form.initialize();
        initialized = true;
    };

    $(document).on("ajaxSuccess", (ev, xhr) => {
        if (typeof(xhr.responseJSON) !== 'undefined' &&
            typeof(xhr.responseJSON.action) !== 'undefined' &&
            xhr.responseJSON.action === "CheckoutShippingServices-SubmitShipping" &&
            typeof(xhr.responseJSON.order) !== 'undefined' &&
            typeof(xhr.responseJSON.order.shipping) !== 'undefined' &&
            ($(".payment-information").data("payment-method-id") === "VENMO" || $('.venmo-tab.active').length > 0))
        {
            initVenmo();
        }
    });

     const venmoNavItem = $('ul.payment-options li.nav-item[data-method-id=VENMO]');


    venmoNavItem.on('click', () => {
        initVenmo();
    });

    $('.payment-summary .edit-button').on('click', () => {
        if($(".payment-information").data("payment-method-id") === "VENMO")
            initVenmo();
    })

    let grandTotalUpdated = function()
    {
        if(window.fiservPluginSDKInitRan)
        {
            postInitPaymentChangeDetected = true;
        }

        $('#fiserv_commercehub-venmo-button').children().remove();
        if(initializingPromise)
        {
            // Temporary fix...
            location.reload();
        }
    }
    if (checkoutStage === 'payment' && $(".payment-information").data("payment-method-id") === "VENMO")
    {
        initVenmo();
    }

    if ($('.venmo-tab.active').length > 0 && !initialized)
    {
        initVenmo();
    }

    if ($('ul.payment-options li.nav-item').length > 0 && $('ul.payment-options li.nav-item.active').length === 0 && $(".payment-information").data("payment-method-id") === "VENMO")
    {
        venmoNavItem.find('a').trigger('click');
        initVenmo();
    }

    new MutationObserver(() => { grandTotalUpdated(); }).observe($('.grand-total-sum')[0], { childList: true });
});