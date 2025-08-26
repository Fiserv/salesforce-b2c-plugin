document.addEventListener("DOMContentLoaded", () => {
    let extractInitializationData = function()
    {
        let data = {
            config: $('#fiserv-commercehub-paypal-form-init-container').data('commercehub-initialization-data'),
            credentialsUrl: $('#fiserv-commercehub-paypal-form-init-container').attr('data-commercehub-credentials'),
        }
        $('#fiserv-commercehub-paypal-form-init-container').remove();
        return data;
    }

    const checkoutStage = $('#fiserv-commercehub-paypal-form-init-container').attr('data-initial-checkout-stage');
    let form = new CommercehubPayPal(extractInitializationData());
    let initialized = false;

    let initPayPal = function()
    {
        if (!initialized)
        {
            form.initialize();
            initialized = true;
        }
    };

    // set listener for ajax success of shipping submit action
    // after which we init gift form
    $(document).on("ajaxSuccess", (ev, xhr) => {
        if (typeof(xhr.responseJSON) !== 'undefined' &&
            typeof(xhr.responseJSON.action) !== 'undefined' &&
            xhr.responseJSON.action === "CheckoutShippingServices-SubmitShipping" &&
            typeof(xhr.responseJSON.order) !== 'undefined' &&
            typeof(xhr.responseJSON.order.shipping) !== 'undefined')
        {
            initPayPal();
        }
    });

    $('.payment-summary .edit-button').on('click', () => {
        initPayPal();
    });

    // if payment stage: instantiate gift form
    // if beyond payment stage: return to payment stage
    switch (checkoutStage) {
        case 'payment':
            initPayPal();
            break;
        default:
            break;
    }
});