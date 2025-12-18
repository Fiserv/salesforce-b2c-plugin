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
    let postInitPaymentChangeDetected = false;

    let initVenmo = async function()
    {
        // Temporary fix...
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
            $(".payment-information").data("payment-method-id") === "VENMO")
        {
            initVenmo();
        }
    });

    $('ul.payment-options li.nav-item[data-method-id=VENMO]').on('click', () => {
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