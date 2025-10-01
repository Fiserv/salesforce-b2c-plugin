"use strict"

class FiservSDKHelper
{
    static backendCall(backendUrl, successCb, failureCb, data = null)
    {
        $.ajax({
            url: backendUrl,
            cache: false,
            dataType: 'json',
            type: "POST",
            data: data,
            success: function(response) {
                successCb(response);
            },
            error: function(err) {
                failureCb(err)
            }
        });
    }

    static buildInitConfig(credentialsResponse)
    {
        let initConfig = {
            ...credentialsResponse['submitConfig'],
            ...credentialsResponse['initConfig'],
            'sessionId': credentialsResponse['sessionId']
        }

        return initConfig;
    }

    static addressFormList = {};
    static async populateAddress(addressObject, addressFormNames, purpose)
    {
        let createAddressFormFields = function(baseForm, type)
        {
            let baseId = type === 'shipping' ? 'dwfrm_shipping_shippingAddress' : 'dwfrm_billing';
            let fields = {};
            Object.keys(baseForm).forEach((key) => {
                fields[key] = {};
                let formElement = $('[name=' + (baseId + baseForm[key]) + ']');
                if(!formElement.length)
                    return;
                let id = formElement.attr('id');
                if(!id)
                    return;
                fields[key]['elementId'] = id;
            })

            return { fields: fields };
        }
        
        let addressForm = FiservSDKHelper.addressFormList[purpose] ?
            FiservSDKHelper.addressFormList[purpose] :
            await window.fiserv.components.address(createAddressFormFields(addressFormNames, purpose));
        
        FiservSDKHelper.addressFormList[purpose] = addressForm;
        addressForm.populate(addressObject);
    }
}


// Preliminary shared setup call to help with tab navigation...
$('ul.payment-options li.nav-item').on('click', () => {
    $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', false);
});