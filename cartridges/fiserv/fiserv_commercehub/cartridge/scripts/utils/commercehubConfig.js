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

    get3DSEnabled()
    {
        return getSitePreference('CommerceHub3DSEnable');
    },

    getVerificationEnabled()
    {
        return getSitePreference('CommerceHubVerificationEnable');
    },

    // This is where the Tokenization settings start

    getCommerceHubTokenization()
    {
        return getSitePreference('CommerceHubTokenization');
    },

    getCommerceHubStandaloneTokenization()
    {
        return !getSitePreference('CommerceHubStandaloneTokenization'); // To align with the display in the config page, this value is negated
    },

    getTokenSecurityEnabled()
    {
        return getSitePreference('CommerceHubTokenSecurityEnable');
    },

    getForcedBasketTokenization()
    {
        return getSitePreference('CommerceHubForcedBasketTokenization');
    },

    // This is where the ACH settings start

    getCommerceHubACHEnabled()
    {
        return getSitePreference('CommerceHubACHEnable');
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

    // This is where the Affirm settngs start

    getCommerceHubAffirmEnabled()
    {
        return getSitePreference('CommerceHubAffirmEnable');
    },

    getCommerceHubAffirmPaymentType()
    {
        return getSitePreference('CommerceHubAffirmPaymentType').value;
    },

    // This is where the Samsung Pay settings start
    
    getCommerceHubSamsungPayEnabled()
    {
        return getSitePreference('CommerceHubSamsungPayEnable');
    },

    getCommerceHubSamsungPayPaymentType()
    {
        return getSitePreference('CommerceHubSamsungPayPaymentType').value;
    },


    // This is where the Paze settings start

    getCommerceHubPazeEnabled()
    {
        return getSitePreference('CommerceHubPazeEnable');
    },

    getCommerceHubPazePaymentType()
    {
        return getSitePreference('CommerceHubPazePaymentType').value;
    },

    getCommerceHubPazeDisplayName()
    {
        return getSitePreference('CommerceHubPazeDisplayName') || "PAZE";
    },

    // This is where frontend config object building start

    getFormConfig(formId)
    {
        if(!fiservConstants.FORM_ID_LIST.includes(formId))
            return;

        let config = {};
        config['fields'] = formId !== "ACH" ? this.buildFormFieldsConfig(formId) : this.buildACHFormFieldsConfig();
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

    buildACHFormFieldsConfig()
    {
        let fieldsConfig = {};
        let elementIdPrefix = 'fiserv_commercehub-ach';

        fieldsConfig['accountNumber'] = {
            'parentElementId': elementIdPrefix + '-account-number',
            'placeholder': getSitePreference('CommerceHubACHFormAccountNumberPlaceholder'),
            'dynamicPlaceholderCharacter': getSitePreference('CommerceHubACHFormAccountNumberPlaceholderCharacter').value,
            'masking': {
                'character': getSitePreference('CommerceHubACHFormAccountNumberMaskingCharacter').value,
                'mode': (getSitePreference('CommerceHubACHFormAccountNumberMask') 
                        ? getSitePreference('CommerceHubACHFormAccountNumberMaskingMode').value : NO_MASKING),
                'shrunkLength': getSitePreference('CommerceHubACHFormAccountNumberMaskLength')
            }
        };
    
        fieldsConfig['routingNumber'] = {
            'parentElementId': elementIdPrefix + '-routing-number',
            'placeholder': getSitePreference('CommerceHubACHFormRoutingNumberPlaceholder'),
            'dynamicPlaceholderCharacter': getSitePreference('CommerceHubACHFormRoutingNumberPlaceholderCharacter').value,
            'masking': {
                'character': getSitePreference('CommerceHubACHFormRoutingNumberMaskingCharacter').value,
                'mode': (getSitePreference('CommerceHubACHFormRoutingNumberMask') 
                        ? getSitePreference('CommerceHubACHFormRoutingNumberMaskingMode').value : NO_MASKING),
                'shrunkLength': getSitePreference('CommerceHubACHFormRoutingNumberMaskLength')
            }
        };
    
        fieldsConfig['idValue'] = {
            'parentElementId': elementIdPrefix + '-id-value',
            'placeholder': getSitePreference('CommerceHubACHFormIdValuePlaceholder'),
            'dynamicPlaceholderCharacter': getSitePreference('CommerceHubACHFormIdValuePlaceholderCharacter').value
        };
    
        fieldsConfig['businessName'] = {
            'parentElementId': elementIdPrefix + '-business-name',
            'placeholder': getSitePreference('CommerceHubACHFormBusinessNamePlaceholder')
        };
    
        fieldsConfig['idType'] = {
            'parentElementId': elementIdPrefix + '-id-type'
        };
    
        fieldsConfig['driverLicenseState'] = {
            'parentElementId': elementIdPrefix + '-driver-license-state'
        };
    
        fieldsConfig['accountType'] = {
            'parentElementId': elementIdPrefix + '-account-type'
        };
    
        fieldsConfig['checkType'] = {
            'parentElementId': elementIdPrefix + '-check-type'
        };
    
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

    getACHInvalidFields()
    {
        let invalidFields = {
            'accountNumber': getSitePreference('CommerceHubACHFormAccountNumberInvalidFieldMessage'),
            'routingNumber': getSitePreference('CommerceHubACHFormRoutingNumberInvalidFieldMessage'),
            'idValue': getSitePreference('CommerceHubACHFormIdValueInvalidFieldMessage'),
            'businessName': getSitePreference('CommerceHubACHFormBusinessNameInvalidFieldMessage'),
            'idType': getSitePreference('CommerceHubACHFormIdTypeInvalidFieldMessage'),
            'driverLicenseState': getSitePreference('CommerceHubACHFormDriverLicenseStateInvalidFieldMessage'),
            'accountType': getSitePreference('CommerceHubACHFormAccountTypeInvalidFieldMessage'),
            'checkType': getSitePreference('CommerceHubACHFormCheckTypeInvalidFieldMessage')
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

    buildAffirmButtonConfig()
    {
        let buttonConfig;
        if(this.getCommerceHubAffirmEnabled())
        {
            buttonConfig = {
                'parentElementId': 'fiserv_commercehub-affirm-button',
                'color': getSitePreference('CommerceHubAffirmButtonColor').value
            }
        }

        return buttonConfig;
    },

     buildSamsungPayButtonConfig()
     {
        if(!this.getCommerceHubSamsungPayEnabled())
            return null;

        let buttonConfig = {
            'parentElementId': 'fiserv_commercehub-samsungpay-button',
            'color': getSitePreference('CommerceHubSamsungPayButtonColor').value
        }

        return { 'button': buttonConfig };
     },

      buildPazeButtonsConfig()
    {
        let buttonConfig;
        if(this.getCommerceHubPazeEnabled())
        {
            buttonConfig = {
                'parentElementId': 'fiserv_commercehub-paze-button'
            }
        }

        return buttonConfig;
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
