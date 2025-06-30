const dwSystem = require('dw/system');
const currentSite = dwSystem.Site.getCurrent();
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

    getCommerceHubMerchantPartnerIntegrator()
    {
        return getSitePreference('CommerceHubMerchantPartnerIntegrator');
    },

    getCommerceHubTimeout()
    {
        return getSitePreference('CommerceHubTimeout');
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

    getCreditPrivacyStatementEnabled()
    {
        return getSitePreference('CommerceHubCreditPrivacyStatement');
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

    getGiftPrivacyStatementEnabled()
    {
        return getSitePreference('CommerceHubGiftPrivacyStatement');
    },

    getFormConfig(formId)
    {
        let config = {};
        config['fields'] = this.buildFormFieldsConfig(formId);
        config['css'] = JSON.parse(getSitePreference('CommerceHub' + formId + 'FormCSS') || '{}');
        config['font'] = this.buildFormFontConfig(formId);
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

        return formFontConfig;
    },

    getInvalidFields(formId)
    {
        let invalidFields = {
            'cardNumber': getSitePreference('CommerceHub' + formId + 'FormCardNumberInvalidFieldMessage'),
            'nameOnCard': getSitePreference('CommerceHub' + formId + 'FormNameOnCardInvalidFieldMessage'),
            'securityCode': getSitePreference('CommerceHub' + formId + 'FormSecurityCodeInvalidFieldMessage'),
            'expirationMonth': getSitePreference('CommerceHub' + formId + 'FormExpirationMonthInvalidFieldMessage'),
            'expirationYear': getSitePreference('CommerceHub' + formId + 'FormExpirationYearInvalidFieldMessage')
        };

        return invalidFields;
    }
};

module.exports = commerceHubExport;