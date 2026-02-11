'use strict';

const fiservConstants = require('*/cartridge/fiservConstants/constants');

const currentSite = require('dw/system').Site.getCurrent();
const NO_MASKING = 'NO_MASKING';


function getSitePreference(field)
{
    let preference = null;
    if (currentSite && currentSite.getCustomPreferenceValue(field) != null)
    {
        preference = currentSite.getCustomPreferenceValue(field);
    }
    return preference;
}

const commerceHubExport = 
{
    // This is where the General settings start

    getCommerceHubMerchantId()
    {
        return getSitePreference('CommerceHubMerchantID');
    },
 
    getCommerceHubTerminalId()
    {
        return getSitePreference('CommerceHubTerminalID');
    },
  
    getCommerceHubApiKey()
    {
        return getSitePreference('CommerceHubAPIKey');
    },
   
    getCommerceHubApiSecret()
    {
        return getSitePreference('CommerceHubAPISecret');
    },

    getCommerceHubApiEnvironment()
    {
        return getSitePreference('CommerceHubAPIEnvironment').value;
    },

    getCommerceHubLoggingLevel()
    {
        return getSitePreference('CommerceHubLogLevel').value;
    },

    getCommercehubSessionLifetime()
    {
        return getSitePreference('CommerceHubSessionLifetime');
    },

    getCommerceHubTimeout()
    {
        return getSitePreference('CommerceHubTimeout');
    },
    
    getCommerceHubMerchantPartnerIntegrator()
    {
        return getSitePreference('CommerceHubMerchantPartnerIntegrator');
    },

    // This is where the Credit/Debit Cards settings start

    getCommerceHubCreditEnabled()
    {
        return getSitePreference('CommerceHubCreditEnable');
    },

    getCommerceHubCreditPaymentType()
    {
        return getSitePreference('CommerceHubCreditPaymentType').value;
    },

    getCommerceHubTokenization()
    {
        return getSitePreference('CommerceHubTokenization');
    },

    getCommerceHubTokenizationStrategy()
    {
        return getSitePreference('CommerceHubTokenizationStrategy').value === 'true';
    },

    getCommerceHubStandaloneSpa()
    {
        return getSitePreference('CommerceHubStandaloneSPA');
    },

    getEarlyTokenization()
    {
        return getSitePreference('CommerceHubEarlyTokenization');
    },

    getBasketTokenization()
    {
        return getSitePreference('CommerceHubBasketTokenization');
    },

    getEarlyTokenizationGuest()
    {
        return getSitePreference('CommerceHubEarlyTokenizationGuest');
    },

    get3DSEnabled()
    {
        return getSitePreference('CommerceHub3DSEnable');
    },

    getTokenSecurityEnabled()
    {
        return getSitePreference('CommerceHubTokenSecurityEnable');
    },

    // This is where the Gift Card settings start

    getCommerceHubGiftEnabled()
    {
        return getSitePreference('CommerceHubGiftEnable');
    },

    getCommerceHubGiftTitle()
    {
        return getSitePreference('CommerceHubGiftPaymentMethodTitle');
    },

    getCommerceHubGiftPaymentType()
    {
        return getSitePreference('CommerceHubGiftPaymentType').value;
    },

    getCommerceHubGiftSecurityEnabled()
    {
        return getSitePreference('CommerceHubGiftSecurityEnable');
    },

    getCommerceHubGiftMaxCards()
    {
        return getSitePreference('CommerceHubMaxGiftCards').value;
    },

    // This is where the PayPal settings start

    getCommerceHubPayPalEnabled()
    {
        return getSitePreference('CommerceHubPayPalEnable');
    },

    getCommerceHubPayPalFastlaneEnabled()
    {
        return getSitePreference('CommerceHubPayPalFastlaneEnable');
    },

    getCommerceHubPayPalPaymentType()
    {
        return getSitePreference('CommerceHubPayPalPaymentType').value;
    },

    getCommerceHubPayPalVaultingEnabled()
    {
        return getSitePreference('CommerceHubPayPalVaultingEnable');
    },

    // This is where the Venmo settings start

    getCommerceHubVenmoEnabled()
    {
        return getSitePreference('CommerceHubVenmoEnable');
    },

    getCommerceHubVenmoPaymentType()
    {
        return getSitePreference('CommerceHubVenmoPaymentType').value;
    },

    // This is where the Apple Pay settings start

    getCommerceHubApplePayEnabled()
    {
        return getSitePreference('CommerceHubApplePayEnable');
    },

    getCommerceHubApplePayPaymentType()
    {
        return getSitePreference('CommerceHubApplePayPaymentType').value;
    },

    getFormConfig(formId)
    {
        if(!fiservConstants.FORM_ID_LIST.includes(formId))
            return;

        let config = {};
        config['fields'] = this.buildFormFieldsConfig(formId);
        config['css'] = JSON.parse(getSitePreference('CommerceHub' + formId + 'FormCSS') || '{}');
        config['font'] = this.buildFormFontConfig(formId);
        config['contextualCssClassNames'] = {
            valid: "validSdcInput",
            invalid: "invalidSdcInput"
        };
        return config;
    },

    buildFormFieldsConfig(formId)
    {
        let fieldsConfig = {};
        let elementIdPrefix = 'fiserv_commercehub';
        if(formId === "Gift")
        {
            elementIdPrefix += "-gift";
        }

        fieldsConfig['cardNumber'] = {
            'parentElementId': elementIdPrefix + '-card-number',
            'placeholder': getSitePreference('CommerceHub' + formId + 'FormCardNumberPlaceholder'),
            'dynamicPlaceholderCharacter': getSitePreference('CommerceHub' + formId + 'FormCardNumberPlaceholderCharacter').value,
            'enableFormatting': getSitePreference('CommerceHub' + formId + 'FormCardNumberFormat'),
            'masking': {
                'character': getSitePreference('CommerceHub' + formId + 'FormCardNumberMaskCharacter').value,
                'mode': (getSitePreference('CommerceHub' + formId + 'FormCardNumberMask') 
                        ? getSitePreference('CommerceHub' + formId + 'FormCardNumberMaskMode').value : NO_MASKING),
                'shrunkLength': getSitePreference('CommerceHub' + formId + 'FormCardNumberMaskLength')
            }
        }

        if(formId !== "Gift" || this.getCommerceHubGiftSecurityEnabled())
        {
            fieldsConfig['securityCode'] = {
                'parentElementId': elementIdPrefix + '-security-code',
                'placeholder': getSitePreference('CommerceHub' + formId + 'FormSecurityCodePlaceholder'),
                'dynamicPlaceholderCharacter': getSitePreference('CommerceHub' + formId + 'FormSecurityCodePlaceholderCharacter').value,
                'masking': {
                    'character': getSitePreference('CommerceHub' + formId + 'FormSecurityCodeMaskCharacter').value,
                    'mode': (getSitePreference('CommerceHub' + formId + 'FormSecurityCodeMask') 
                            ? getSitePreference('CommerceHub' + formId + 'FormSecurityCodeMaskMode').value : NO_MASKING)
                }
            }
        }

        if(formId !== "Gift")
        {
            fieldsConfig['nameOnCard'] = {
                'parentElementId': elementIdPrefix + '-name-on-card',
                'placeholder': getSitePreference('CommerceHub' + formId + 'FormNameOnCardPlaceholder')
            }

            fieldsConfig['expirationMonth'] = {
                'parentElementId': elementIdPrefix + '-expiration-month',
                'placeholder': getSitePreference('CommerceHub' + formId + 'FormExpirationMonthPlaceholder'),
                'optionLabels': JSON.parse(getSitePreference('CommerceHub' + formId + 'FormExpirationMonthOptionLabels') || '{}')
            }

            fieldsConfig['expirationYear'] = {
                'parentElementId': elementIdPrefix + '-expiration-year',
                'placeholder': getSitePreference('CommerceHub' + formId + 'FormExpirationYearPlaceholder')
            }
        }

        return fieldsConfig;
    },

    buildFormFontConfig(formId)
    {
        let formFontConfig = {
            'data': getSitePreference('CommerceHub' + formId + 'FormFontData'),
            'family': getSitePreference('CommerceHub' + formId + 'FormFontFamily'),
            'format': getSitePreference('CommerceHub' + formId + 'FormFontFormat'),
            'integrity': getSitePreference('CommerceHub' + formId + 'FormFontIntegrity')
        }

        if (!Object.values(formFontConfig).some( v => v != null ))
            return null;

        return formFontConfig;
    },

    getInvalidFields(formId)
    {
        if(!fiservConstants.FORM_ID_LIST.includes(formId))
            return;


        let invalidFields = {
            'cardNumber': getSitePreference('CommerceHub' + formId + 'FormCardNumberInvalidFieldMessage'),
            'nameOnCard': getSitePreference('CommerceHub' + formId + 'FormNameOnCardInvalidFieldMessage'),
            'securityCode': getSitePreference('CommerceHub' + formId + 'FormSecurityCodeInvalidFieldMessage'),
            'expirationMonth': getSitePreference('CommerceHub' + formId + 'FormExpirationMonthInvalidFieldMessage'),
            'expirationYear': getSitePreference('CommerceHub' + formId + 'FormExpirationYearInvalidFieldMessage')
        };

        return invalidFields;
    },

    buildPayPalButtonsConfig()
    {
        let buttonsConfig = {};
        if(this.getCommerceHubPayPalEnabled())
        {
            buttonsConfig['paypal'] = {
                'parentElementId': 'fiserv_commercehub-paypal-button',
                'color': getSitePreference('CommerceHubPayPalButtonColor').value,
                'shape': getSitePreference('CommerceHubPayPalButtonShape').value,
                'label': getSitePreference('CommerceHubPayPalButtonLabel').value
            }
        }

        let dataConfig = {
            'enableVaulting': this.getCommerceHubPayPalVaultingEnabled(),
            'customerConfirmation': 'REVIEW_AND_PAY',
            'buttons': buttonsConfig
        };

        return dataConfig;
    },

    buildVenmoButtonsConfig()
    {
    
        let buttonsConfig = {};
        if(this.getCommerceHubVenmoEnabled())
        {
            buttonsConfig['venmo'] = {
                'parentElementId': 'fiserv_commercehub-venmo-button',
                'color': getSitePreference('CommerceHubVenmoButtonColor').value,
                'shape': getSitePreference('CommerceHubVenmoButtonShape').value
            }
        }
        let dataConfig = {
            'customerConfirmation': 'REVIEW_AND_PAY',
            'buttons': buttonsConfig
        };
        return dataConfig;
    },

    buildApplePayButtonConfig()
    {
        if(!this.getCommerceHubApplePayEnabled())
            return null;

        let buttonConfig = {
            'parentElementId': 'fiserv_commercehub-applepay-button',
            'color': getSitePreference('CommerceHubApplePayButtonColor').value,
            'type': getSitePreference('CommerceHubApplePayButtonLabel').value
        }

        return { 'button': buttonConfig };
    },

    buildAddressFormNamesObject()
    {
        return {
            firstName: "_addressFields_firstName",
            lastName: "_addressFields_lastName",
            street: "_addressFields_address1",
            houseNumberOrName: "_addressFields_address2",
            city: "_addressFields_city",
            stateOrProvince: "_addressFields_states_stateCode",
            postalCode: "_addressFields_postalCode",
            country: "_addressFields_country"
        };
    },
};

module.exports = commerceHubExport;