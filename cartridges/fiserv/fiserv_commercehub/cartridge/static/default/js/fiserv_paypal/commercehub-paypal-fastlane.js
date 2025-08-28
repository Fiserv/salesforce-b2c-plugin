"use strict"

class FiservFastlaneInitializer
{
    static async initFastlane(credentialsUrl, formAdapter, formConfig)
    {
        $.spinner().start();
        await new Promise((resolve, reject) => {
            FiservSDKHelper.backendCall(credentialsUrl, resolve, reject);
        })
        .then(async (credentialsResponse) => {
            await window.fiserv.init(FiservSDKHelper.buildInitConfig(credentialsResponse));

            let paypal = await window.fiserv.components.paypal();
            let fastlane = await paypal.fastlane();

            let emailWatermarkId = 'fastlane-email-watermark';
            $('<div id="' + emailWatermarkId + '"></div>').insertAfter('input[name=dwfrm_coCustomer_email]');
            fastlane.renderWatermark(emailWatermarkId);

            let fastlaneObject = {
                paypalFastlane: {
                    component: fastlane,
                    consent: {
                        parentElementId: emailWatermarkId
                    },
                    watermark: {
                        parentElementId: emailWatermarkId
                    }
                }
            };

            formAdapter.initSdk(formConfig, null, fastlaneObject)
            
            $('.submit-customer').on('click', async () => {
                $.spinner().start();
                await fastlane.authenticate({
                    email: $('input[name=dwfrm_coCustomer_email]').val()
                }).then((authResponse) => {
                    formAdapter.setFastlaneAuthResponse(authResponse);
                    $.spinner().stop();
                }).catch((e) => {
                    console.log(e);
                    $.spinner().stop();
                });
            });

            $.spinner().stop();
        }).catch((error) => {
            console.log("Failed to instantiate Fastlane")
            $.spinner().stop();
        });
    }

    static setCardInfoFromFastlane(authResp)
    {
        let authValues = authResp[Object.getOwnPropertySymbols(authResp)[0]]
        let card = authValues.profile.card.paymentSource.card;
        // Setting hardcoded for now, will change later
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