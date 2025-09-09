"use strict"

class FiservFastlaneInitializer
{
    static watermarkInsertions = [];

    static async initFastlane(credentialsUrl, formAdapter, formConfig)
    {
        let addressFormList = {};
        let ajaxSuccessAlreadyAdded = false;
        let authValues, billingPhone, fastlaneGuestCheckout; // Values kept up here to update in the billing event

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

        let createAddressObject = function(addr, name)
        {
            return {
                firstName: name.firstName,
                lastName: name.lastName,
                street: addr.addressLine1,
                city: addr.adminArea2,
                stateOrProvince: addr.adminArea1,
                postalCode: addr.postalCode,
                country: addr.countryCode
            };
        }

        let populateAddress = async function(addressObject, purpose)
        {
            let addressForm = addressFormList[purpose] ?
                addressFormList[purpose] :
                await window.fiserv.components.address(createAddressFormFields(formConfig.configData.fastlaneAddressFormNames, purpose));
            
            addressFormList[purpose] = addressForm;
            addressForm.populate(addressObject);
        }

        let insertWatermarkElementManual = function(fastlane, jQueryElement, id)
        {
            if(!$('#' + id).length)
                jQueryElement.before('<div id="' + id + '"></div>');
            fastlane.renderWatermark(id);
        }

        let insertWatermarkBeforeElement = function(fastlane, elementClass, watermarkId)
        {
            let element = $('.' + elementClass);
            if(element.length)
            {
                insertWatermarkElementManual(fastlane, element, watermarkId);
                FiservFastlaneInitializer.watermarkInsertions.push(watermarkId);
            }
        }

        $.spinner().start();
        await new Promise((resolve, reject) => {
            FiservSDKHelper.backendCall(credentialsUrl, resolve, reject);
        })
        .then(async (credentialsResponse) => {
            await window.fiserv.init(FiservSDKHelper.buildInitConfig(credentialsResponse));

            let paypal = await window.fiserv.components.paypal();
            let fastlane = await paypal.fastlane();

            insertWatermarkElementManual(fastlane, $('input[name=dwfrm_coCustomer_email]'), 'fastlane-email-watermark');

            let fastlaneObject = {
                component: fastlane,
                consent: {
                    parentElementId: "paypal-fastlane-payment-form-consent"
                },
                watermark: {
                    parentElementId: "paypal-fastlane-payment-form-watermark"
                }
            };

            formAdapter.initSdk(formConfig, null, fastlaneObject)
            
            $('.submit-customer').on('click', async () => {
                $.spinner().start();
                await fastlane.authenticate({
                    email: $('input[name=dwfrm_coCustomer_email]').val()
                }).then(async (authResponse) => {
                    fastlaneGuestCheckout = authResponse.isGuestCheckout;
                    if(!fastlaneGuestCheckout) {
                        authValues = authResponse[Object.getOwnPropertySymbols(authResponse)[0]];

                        let paymentFieldWatermarkId = 'paypal-fastlane-payment-form-watermark';
                        fastlane.renderWatermark(paymentFieldWatermarkId);
                        FiservFastlaneInitializer.watermarkInsertions.push(paymentFieldWatermarkId);
                        
                        let shippingResponse = authValues.profile.shippingAddress;
                        let shippingObject = createAddressObject(shippingResponse.address, shippingResponse.name);
                        populateAddress(shippingObject, 'shipping');

                        insertWatermarkBeforeElement(fastlane, 'shipping-address-block', 'fastlane-shipping-address-watermark');
                        insertWatermarkBeforeElement(fastlane, 'billing-address', 'fastlane-billing-address-watermark');

                        let shippingPhone = shippingResponse.phoneNumber?.nationalNumber;
                        billingPhone = authValues.profile.phones ? authValues.profile.phones[0]?.nationalNumber : null;
                        if(shippingPhone || billingPhone)
                        {
                            if(!shippingPhone)
                                shippingPhone = billingPhone;
                            if(!billingPhone)
                                billingPhone = shippingPhone;

                            $('[name=dwfrm_shipping_shippingAddress_addressFields_phone').val(shippingPhone);
                        }

                        // Fill out billing address form only after shipping has been submitted...
                        if(!ajaxSuccessAlreadyAdded)
                        {
                            $(document).on("ajaxSuccess", (ev, xhr) => { 
                                if (typeof(xhr.responseJSON) !== 'undefined' &&
                                    typeof(xhr.responseJSON.action) !== 'undefined' &&
                                    xhr.responseJSON.action === "CheckoutShippingServices-SubmitShipping" &&
                                    typeof(xhr.responseJSON.order) !== 'undefined' &&
                                    typeof(xhr.responseJSON.order.shipping) !== 'undefined')
                                {
                                    if(fastlaneGuestCheckout)
                                        return;
                                    let billingBase = authValues.profile;
                                    let billingObject = createAddressObject(billingBase.card.paymentSource.card.billingAddress, billingBase.name);
                                    $('.address-selector-block').find('.btn-add-new').trigger('click');
                                    populateAddress(billingObject, 'billing');
                                    $('[name=dwfrm_billing_contactInfoFields_phone').val(billingPhone);
                                }
                            });
                            ajaxSuccessAlreadyAdded = true;
                        }

                        $('#fastlane-re-enable-form-button').removeClass('checkout-hidden');

                        formAdapter.setFastlaneAuthResponse(authResponse);
                    }
                    $.spinner().stop();
                }).catch((e) => {
                    console.log(e);
                    $.spinner().stop();
                });
            });

            $('.customer-summary .edit-button, #fastlane-re-enable-form-button').on('click', (e) => {
                FiservFastlaneInitializer.resetFastlane(formConfig, formAdapter, fastlaneObject);
            });

            $.spinner().stop();
        }).catch((error) => {
            console.log("Failed to instantiate Fastlane")
            $.spinner().stop();
        });
    }

    static async resetFastlane(formConfig, formAdapter, fastlaneObject)
    {
        formAdapter.destroyIframe('card');
        formAdapter.initSdk(formConfig, null, fastlaneObject);
        $('#fastlane-re-enable-form-button').addClass('checkout-hidden');

        FiservFastlaneInitializer.watermarkInsertions.forEach((id) => {
            $('#' + id).find('paypal-watermark').remove();
        });
        FiservFastlaneInitializer.watermarkInsertions = [];
    }

    static setCardInfoFromFastlane(authResp)
    {
        let authValues = authResp[Object.getOwnPropertySymbols(authResp)[0]]
        let card = authValues.profile.card.paymentSource.card;
        
        $('#cardType').val(card.brand.toLowerCase());
        $('#cardNumber').val(card.lastDigits.padStart(16, '*'));
        let expMon = card.expiry.substr(5);
        $("#expirationMonthValue").attr("value", expMon);
        $("#expirationMonth").val(expMon);
        let expYear = card.expiry.substr(2, 2);
        $("#expirationYearValue").attr("value", expYear);
        $("#expirationYear").val(expYear);
    }
}