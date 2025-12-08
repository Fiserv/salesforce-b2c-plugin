'use strict';

class FiservFastlaneInitializer
{
    static watermarkInsertions = [];

    static async initFastlane(credentialsUrl, formAdapter, formConfig)
    {
        let ajaxSuccessAlreadyAdded = false;
        let authValues, billingPhone, fastlaneGuestCheckout = true; // Values kept up here to update in the billing event

        let createAddressObject = function(addr, name)
        {
            return {
                firstName: name.firstName,
                lastName: name.lastName,
                street: addr.addressLine1,
                houseNumberOrName: addr.addressLine2,
                city: addr.adminArea2,
                stateOrProvince: addr.adminArea1,
                postalCode: addr.postalCode,
                country: addr.countryCode
            };
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

        let toggleSubmitButton = function(state)
        {
            $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', state);
        }

        $.spinner().start();
        if($('.tab-pane.active').find('input[name=dwfrm_billing_paymentMethod]').val() === 'CREDIT_CARD')
        {
            toggleSubmitButton(true);
        }

        await new Promise((resolve, reject) => {
            FiservSDKHelper.backendCall(credentialsUrl, resolve, reject);
        })
        .then(async (credentialsResponse) => {
            await window.fiserv.init(FiservSDKHelper.buildInitConfig(credentialsResponse));
            window.fiservPluginSDKInitRan = true;

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

                // Disable multi-ship for Fastlane auto flow (in case someone got to that point...)
                let multiShipButton = $('#multiShipCheck');
                if(multiShipButton.length && multiShipButton.is(':checked'))
                    multiShipButton.trigger('click');


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
                        FiservSDKHelper.populateAddress(shippingObject, formConfig.configData.fastlaneAddressFormNames, 'shipping');

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
                                    FiservSDKHelper.populateAddress(billingObject, formConfig.configData.fastlaneAddressFormNames, 'billing');
                                    let fastlaneOption = FiservSDKHelper.createAddressOption(billingObject, 'fastlaneBillingSelectOption', 'billingAddressSelector');
                                    fastlaneOption.attr('data-phone', billingPhone);
                                    fastlaneOption.prop('selected', true);
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
                FiservFastlaneInitializer.resetFastlane(formConfig, formAdapter);
            });

            $(document).on("ajaxSuccess", (ev, xhr) => {
                if (typeof(xhr.responseJSON) !== 'undefined' &&
                    typeof(xhr.responseJSON.action) !== 'undefined' &&
                    xhr.responseJSON.action === "CheckoutShippingServices-SubmitShipping" &&
                    typeof(xhr.responseJSON.order) !== 'undefined' &&
                    typeof(xhr.responseJSON.order.shipping) !== 'undefined' &&
                    $('.tab-pane.active').find('input[name=dwfrm_billing_paymentMethod]').val() === 'CREDIT_CARD' &&
                    fastlaneGuestCheckout)
                {
                    formAdapter.resetForm();
                    FiservFastlaneInitializer.clearValidation();
                    toggleSubmitButton(true);
                }
            });

            $.spinner().stop();
        }).catch((error) => {
            console.log("Failed to instantiate Fastlane")
            $.spinner().stop();
        });
    }

    static async resetFastlane(formConfig, formAdapter)
    {
        formAdapter.resetForm();
        $('#fastlane-re-enable-form-button').addClass('checkout-hidden');

        FiservFastlaneInitializer.watermarkInsertions.forEach((id) => {
            $('#' + id).find('paypal-watermark').remove();
        });
        FiservFastlaneInitializer.watermarkInsertions = [];

        FiservFastlaneInitializer.clearValidation()
    }

    static clearValidation()
    {
        $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
        $('#sdc-card-brand-icon').removeClass().addClass('sdc-card-brand-icon');
        $('#sdc-card-number-frame, #sdc-card-name-frame, #sdc-security-code-frame, #sdc-exp-month-frame, #sdc-exp-year-frame')
            .removeClass('sdc-valid-field sdc-error-field sdc-focused-field');
        $('#sdc-card-number-invalid-message, #sdc-card-name-invalid-message, #sdc-security-code-invalid-message, #sdc-exp-month-invalid-message, #sdc-exp-year-invalid-message')
            .addClass('sdc-hidden');
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