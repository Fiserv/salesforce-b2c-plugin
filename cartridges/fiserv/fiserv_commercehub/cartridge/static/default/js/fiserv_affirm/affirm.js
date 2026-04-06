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
    const paymentAmountBlockId = $('#fiserv-commercehub-affirm-form-init-container').attr('data-payment-amount-block');
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

        if (!initialized)
        {
            await form.initialize();
            initialized = true;
        }
    };

    if(checkoutStage)
    {
        $(document).on("ajaxSuccess", (ev, xhr) => { 
            if (typeof(xhr.responseJSON) !== 'undefined' &&
                typeof(xhr.responseJSON.action) !== 'undefined' &&
                xhr.responseJSON.action === "CheckoutShippingServices-SubmitShipping" &&
                typeof(xhr.responseJSON.order) !== 'undefined' &&
                typeof(xhr.responseJSON.order.shipping) !== 'undefined' &&
                $(".payment-information").data("payment-method-id") === "AFFIRM")
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
    }
    else
    {
        initAffirm();
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
        new MutationObserver(() => { grandTotalUpdated(); }).observe($(paymentAmountBlockId)[0], { childList: true });
    }
});