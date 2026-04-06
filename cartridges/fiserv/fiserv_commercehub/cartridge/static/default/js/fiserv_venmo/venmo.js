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
    const paymentAmountBlockId = $('#fiserv-commercehub-venmo-form-init-container').attr('data-payment-amount-block');
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

    if(checkoutStage)
    {
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

        if ($('ul.payment-options li.nav-item[data-method-id=VENMO]').length > 0 && $('ul.payment-options li.nav-item.active').length === 0) 
        {
            $('ul.payment-options li.nav-item:first').find('a').trigger('click');
            if ($('ul.payment-options li.nav-item[data-method-id=VENMO]').hasClass('active')) 
                initVenmo();
        }

        $('ul.payment-options li.nav-item[data-method-id=VENMO]').on('click', () => {
            initVenmo();
        });

        $('.payment-summary .edit-button').on('click', () => {
            if($(".payment-information").data("payment-method-id") === "VENMO")
                initVenmo();
        })
    }
    else
    {
        initVenmo();
    }

    // This event should only be applied when there is a field we can observe that represents the order total.
    if(paymentAmountBlockId)
    {
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
        new MutationObserver(() => { grandTotalUpdated(); }).observe($(paymentAmountBlockId)[0], { childList: true });
    }
});