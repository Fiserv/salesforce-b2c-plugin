'use strict';

document.addEventListener("DOMContentLoaded", () => {
    let extractInitializationData = function()
    {
        let data = {
            config: $('#fiserv-commercehub-applepay-form-init-container').data('commercehub-initialization-data'),
            credentialsUrl: $('#fiserv-commercehub-applepay-form-init-container').attr('data-commercehub-credentials'),
            locale: $('#fiserv-commercehub-applepay-form-init-container').attr('data-locale')
        }
        $('#fiserv-commercehub-applepay-form-init-container').remove();
        return data;
    }

    const checkoutStage = $('#fiserv-commercehub-applepay-form-init-container').attr('data-initial-checkout-stage');
    let form = new CommercehubApplePay(extractInitializationData());
    let initialized = false;
    let postInitPaymentChangeDetected = false;

    let initApplePay = async function()
    {
        // Temporary fix...
        if(postInitPaymentChangeDetected)
        {
            location.reload();
            return;
        }

        if (!initialized)
        {
            await form.initialize();
            initialized = true;
        }
    };

    $(document).on("ajaxSuccess", (ev, xhr) => { 
        if (typeof(xhr.responseJSON) !== 'undefined' &&
            typeof(xhr.responseJSON.action) !== 'undefined' &&
            xhr.responseJSON.action === "CheckoutShippingServices-SubmitShipping" &&
            typeof(xhr.responseJSON.order) !== 'undefined' &&
            typeof(xhr.responseJSON.order.shipping) !== 'undefined' &&
            ($(".payment-information").data("payment-method-id") === "APPLEPAY" || $('.applepay-tab.active').length > 0))
        {
            initApplePay();
        }
    });


    $('ul.payment-options li.nav-item[data-method-id=APPLEPAY]').on('click', () => {
        initApplePay();
    });

    $('.payment-summary .edit-button').on('click', () => {
        if($(".payment-information").data("payment-method-id") === "APPLEPAY")
            initApplePay();
    })

    let grandTotalUpdated = function()
    {
        if(window.fiservPluginSDKInitRan)
        {
            postInitPaymentChangeDetected = true;
        }

        $('#fiserv_commercehub-applepay-button').children().remove();
        if(initialized)
        {
            // Temporary fix...
            location.reload();
            return;

            initialized = false;
            if($('.data-checkout-stage').attr('data-checkout-stage') === "payment"
                && $(".payment-information").data("payment-method-id") === "APPLEPAY")
                initApplePay();
        }
    }
    new MutationObserver(() => { grandTotalUpdated(); }).observe($('.grand-total-sum')[0], { childList: true });

    if (checkoutStage === 'payment' && $(".payment-information").data("payment-method-id") === "APPLEPAY")
    {
        initApplePay();
    }

    // if Apple Pay tab is active on load (first APM when credit card is disabled), initialize
    if ($('.applepay-tab.active').length > 0 && !initialized)
    {
        initApplePay();
    }

    // if no tab is active on load (e.g., single APM), trigger Apple Pay tab click and initialize
    if ($('ul.payment-options li.nav-item').length > 0 && $('ul.payment-options li.nav-item.active').length === 0 && $(".payment-information").data("payment-method-id") === "APPLEPAY")
    {
        $('ul.payment-options li.nav-item[data-method-id=APPLEPAY]').find('a').trigger('click');
        initApplePay();
    }
});
