'use strict';

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
            success: function(response)
            {
                successCb(response);
            },
            error: function(err)
            {
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
        let addressForm = FiservSDKHelper.addressFormList[purpose] ?
            FiservSDKHelper.addressFormList[purpose] :
            await window.fiserv.components.address(FiservSDKHelper.createAddressFormFields(addressFormNames, purpose));
        
        FiservSDKHelper.addressFormList[purpose] = addressForm;
        addressForm.populate(addressObject);
    }

    static async retrieveAddress(addressFormNames, purpose)
    {
        let addressForm = FiservSDKHelper.addressFormList[purpose] ?
            FiservSDKHelper.addressFormList[purpose] :
            await window.fiserv.components.address(FiservSDKHelper.createAddressFormFields(addressFormNames, purpose));
        
        FiservSDKHelper.addressFormList[purpose] = addressForm;
        return addressForm.getData();
    }

    static createAddressFormFields(baseForm, type)
    {
        let baseId = type === 'shipping' ? 'dwfrm_shipping_shippingAddress' : 'dwfrm_billing';
        let fields = {};
        Object.keys(baseForm).forEach((key) =>
        {
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

    // Method used to create an address field dropdown option
    static createAddressOption(addressObject, optionId, dropdownId)
    {
        let optionQuery = $('#' + optionId);
        if(optionQuery.length)
            optionQuery.remove();

        let optionText = '';
        for(let key in addressObject)
        {
            if(key === 'country')
                continue;
            if(optionText !== '')
                optionText += ' ';
            optionText += addressObject[key];
        }

        return $('<option>')
            .appendTo($('#' + dropdownId))
            .attr('id', optionId)
            .attr('data-first-name', addressObject.firstName)
            .attr('data-last-name', addressObject.lastName)
            .attr('data-address1', addressObject.street)
            .attr('data-address2', addressObject.houseNumberOrName)
            .attr('data-city', addressObject.city)
            .attr('data-state-code', addressObject.stateOrProvince)
            .attr('data-country-code', addressObject.country)
            .attr('data-postal-code', addressObject.postalCode)
            .attr('data-phone', '')
            .attr('value', optionId)
            .text(optionText);
    }
}


// Preliminary shared setup call to help with tab navigation...
$('ul.payment-options li.nav-item').on('click', () =>
{
    $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', false);
});