'use strict';

document.addEventListener("DOMContentLoaded", () => {
    let extractInitializationData = function()
    {
        let data = {
            config: $('#fiserv-commercehub-ach-form-init-container').data('commercehub-initialization-data'),
            credentialsUrl: $('#fiserv-commercehub-ach-form-init-container').attr('data-commercehub-credentials')
        }
        $('#fiserv-commercehub-ach-form-init-container').remove();
        return data;
    }

    //const checkoutStage = $('#fiserv-commercehub-ach-form-init-container').attr('data-initial-checkout-stage');
    let form = new CommercehubACH(extractInitializationData());
    let initialized = false;

    let initACH = async function()
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
            $(".payment-information").data("payment-method-id") === "ACH")
        {
            initACH();
        }
    });

    if ($('ul.payment-options li.nav-item[data-method-id=ACH]').length > 0 && $('ul.payment-options li.nav-item.active').length === 0)
    {
         $('ul.payment-options li.nav-item:first').find('a').trigger('click');
            if ($('ul.payment-options li.nav-item[data-method-id=ACH]').hasClass('active'))
                initACH();
    }

    $('ul.payment-options li.nav-item[data-method-id=ACH]').on('click', () => {
        initACH();
    });

    $('.payment-summary .edit-button').on('click', () => {
        if($(".payment-information").data("payment-method-id") === "ACH")
            initACH();
    })
});