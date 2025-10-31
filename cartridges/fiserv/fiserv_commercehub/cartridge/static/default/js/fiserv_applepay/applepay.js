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

    //const checkoutStage = $('#fiserv-commercehub-applepay-form-init-container').attr('data-initial-checkout-stage');
    let form = new CommercehubApplePay(extractInitializationData());
    let initialized = false;

    let initApplePay = async function()
    {
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
            $(".payment-information").data("payment-method-id") === "APPLEPAY")
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

    let grandTotalUpdated = function(context)
    {
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
});