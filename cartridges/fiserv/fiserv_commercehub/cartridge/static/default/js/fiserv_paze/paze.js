'use strict';

document.addEventListener("DOMContentLoaded", () => {
    const extractInitializationData = function()
    {
        let data = {
            config: $('#fiserv-commercehub-paze-form-init-container').data('commercehub-initialization-data'),
            credentialsUrl: $('#fiserv-commercehub-paze-form-init-container').attr('data-commercehub-credentials'),
            logoUrl: $('#fiserv-commercehub-paze-form-init-container').data('commercehub-logo-url'),
        }
        $('#fiserv-commercehub-paze-form-init-container').remove();
        return data;
    }

    //const checkoutStage = $('#fiserv-commercehub-paze-form-init-container').attr('data-initial-checkout-stage');
    let form = new CommercehubPaze(extractInitializationData());
    let initialized = false;
    let postInitPaymentChangeDetected = false;

    let initPaze = async function()
    {
        console.log("Initializing PAZE");
        // Temporary fix...
        if(postInitPaymentChangeDetected)
        {
            location.reload();
            return;
        }

        // Ensure the PAZE tab pane is visible
        $('#paze-content').addClass('active show');
        $('.tab-pane').not('#paze-content').removeClass('active show');
        console.log("PAZE tab pane activated");

        $('#fiserv_commercehub-paze-button').children().remove();
        await form.initialize();
        initialized = true;
    };

    // Call initialize on page load if PAZE is already selected
    if ($(".payment-information").data("payment-method-id") === "PAZE")
    {
        initPaze();
    }

    $(document).on("ajaxSuccess", (ev, xhr) => {
        if (typeof(xhr.responseJSON) !== 'undefined' &&
            typeof(xhr.responseJSON.action) !== 'undefined' &&
            xhr.responseJSON.action === "CheckoutShippingServices-SubmitShipping" &&
            typeof(xhr.responseJSON.order) !== 'undefined' &&
            typeof(xhr.responseJSON.order.shipping) !== 'undefined' &&
            $(".payment-information").data("payment-method-id") === "PAZE")
        {
            initPaze();
        }
    });

    if ($('ul.payment-options li.nav-item[data-method-id=PAZE]').length > 0 && $('ul.payment-options li.nav-item.active').length === 0)
    {
         $('ul.payment-options li.nav-item:first').find('a').trigger('click');
            if ($('ul.payment-options li.nav-item[data-method-id=PAZE]').hasClass('active'))
                initPaze();
    }

    $('ul.payment-options li.nav-item[data-method-id=PAZE]').on('click', () => {
        initPaze();
    });

    $('.payment-summary .edit-button').on('click', () => {
        if($(".payment-information").data("payment-method-id") === "PAZE")
            initPaze();
    })

    let grandTotalUpdated = function()
    {
        if(window.fiservPluginSDKInitRan)
        {
            postInitPaymentChangeDetected = true;
        }

        $('#fiserv_commercehub-paze-button').children().remove();
        if(initialized)
        {
            // Temporary fix...
            location.reload();
            return;

            initialized = false;
            if($('.data-checkout-stage').attr('data-checkout-stage') === "payment"
                && $(".payment-information").data("payment-method-id") === "PAZE")
                initPaze();
        }
    }
    new MutationObserver(() => { grandTotalUpdated(); }).observe($('.grand-total-sum')[0], { childList: true });
});
