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

    let form = new CommercehubVenmo(extractInitializationData());
    let initialized = false;
    let initializingPromise = null;
    let postInitPaymentChangeDetected = false;

    let initVenmo = async function()
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
        
        $('#fiserv_commercehub-venmo-button').children().remove();
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
            $(".payment-information").data("payment-method-id") === "VENMO")
        {
            initVenmo();
        }
    });

     const venmoNavItem = $('ul.payment-options li.nav-item[data-method-id=VENMO]');

    if (venmoNavItem.hasClass('active')) {
        initVenmo();
    } else if ($('ul.payment-options li.nav-item').length > 0 && $('ul.payment-options li.nav-item.active').length === 0) {
        venmoNavItem.find('a').one('shown.bs.tab', function () {
            initVenmo();
        });
        $('ul.payment-options li.nav-item:first').find('a').trigger('click');
    }

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
        if(initialized)
        {
            // Temporary fix...
            location.reload();
            return;

            initialized = false;
            if($('.data-checkout-stage').attr('data-checkout-stage') === "payment"
                && $(".payment-information").data("payment-method-id") === "VENMO")
                initVenmo();
        }
    }
    new MutationObserver(() => { grandTotalUpdated(); }).observe($('.grand-total-sum')[0], { childList: true });
});