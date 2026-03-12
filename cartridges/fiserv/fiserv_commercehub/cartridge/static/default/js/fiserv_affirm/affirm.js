'use strict';

document.addEventListener("DOMContentLoaded", () => {
    let extractInitializationData = function()
    {
        let data = {
            config: $('#fiserv-commercehub-affirm-form-init-container').data('commercehub-initialization-data'),
            credentialsUrl: $('#fiserv-commercehub-affirm-form-init-container').attr('data-commercehub-credentials'),
        }
        $('#fiserv-commercehub-affirm-form-init-container').remove();
        return data;
    }

    const checkoutStage = $('#fiserv-commercehub-affirm-form-init-container').attr('data-initial-checkout-stage');
    let form = new CommercehubAffirm(extractInitializationData());
    let initialized = false;
    let postInitPaymentChangeDetected = false;

    let initAffirm = async function()
    {
        // Temporary fix...
        if(postInitPaymentChangeDetected)
        {
            location.reload();
            return;
        }

        
            await form.initialize();
            initialized = true;
        
    };

    $(document).on("ajaxSuccess", (ev, xhr) => { 
        if (typeof(xhr.responseJSON) !== 'undefined' &&
            typeof(xhr.responseJSON.action) !== 'undefined' &&
            xhr.responseJSON.action === "CheckoutShippingServices-SubmitShipping" &&
            typeof(xhr.responseJSON.order) !== 'undefined' &&
            typeof(xhr.responseJSON.order.shipping) !== 'undefined' &&
            ($(".payment-information").data("payment-method-id") === "AFFIRM" || $('.affirm-tab.active').length > 0))
        {
            initAffirm();
        }
    });

    $('ul.payment-options li.nav-item[data-method-id=AFFIRM]').on('click', () => {
        initAffirm();
    });

    $('.payment-summary .edit-button').on('click', () => {
        if($(".payment-information").data("payment-method-id") === "AFFIRM")
            initAffirm();
    })

    let grandTotalUpdated = function()
    {
        if(window.fiservPluginSDKInitRan)
        {
            postInitPaymentChangeDetected = true;
        }

        $('#fiserv_commercehub-affirm-button').children().remove();
        if(initialized)
        {
            // Temporary fix...
            location.reload();
            return;

            initialized = false;
            if($('.data-checkout-stage').attr('data-checkout-stage') === "payment"
                && $(".payment-information").data("payment-method-id") === "AFFIRM")
                initAffirm();
        }
    }
    if (checkoutStage === 'payment' && $(".payment-information").data("payment-method-id") === "AFFIRM")
    {
        initAffirm();
    }

    if ($('.affirm-tab.active').length > 0 && !initialized)
    {
        initAffirm();
    }

    if ($('ul.payment-options li.nav-item').length > 0 && $('ul.payment-options li.nav-item.active').length === 0 && $(".payment-information").data("payment-method-id") === "AFFIRM")
    {
        $('ul.payment-options li.nav-item[data-method-id=AFFIRM]').find('a').trigger('click');
        initAffirm();
    }
    
    new MutationObserver(() => { grandTotalUpdated(); }).observe($('.grand-total-sum')[0], { childList: true });
});