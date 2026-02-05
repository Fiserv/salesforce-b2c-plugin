'use strict';

const server = require('server');

const csrfProtection = require('*/cartridge/scripts/middleware/csrf');
const fiservConstants = require('*/cartridge/fiservConstants/constants');

const currentSite = require('dw/system').Site.getCurrent();


// Instantiating Preferences
const chPreferenceDescriptions = retrieveCommerceHubPreferences();
const breakDelimiter = "___br___"
var configList;
var simplifiedPreferences;
if(chPreferenceDescriptions != null)
{
    configList = buildConfigList(chPreferenceDescriptions);
    simplifiedPreferences = stripExcessInfo(chPreferenceDescriptions);
}

function retrieveCommerceHubPreferences()
{
    let configList = null;
    Object.values(fiservConstants.PROCESSOR_ID_LIST).forEach((processorID) =>
    {
        let chAttributeGroup = currentSite.getPreferences().describe().getAttributeGroup(processorID);
        if(!chAttributeGroup)
            return;
    
        let partialConfigList = chAttributeGroup.getAttributeDefinitions().toArray();
        if(!partialConfigList)
            return;

        if(!configList)
        {
            configList = partialConfigList;
        }
        else
        {
            configList = configList.concat(partialConfigList);
        }
    });

    if(!configList)
        return null;

    let idConfigList = {};
    
    configList.forEach(configDefinition =>
    {
        let id = configDefinition.ID;

        if(idConfigList[id])
        {
            return;
        }

        idConfigList[id] = {};
        idConfigList[id]['id'] = id;
        idConfigList[id]['valueType'] = configDefinition.valueTypeCode;
        idConfigList[id]['mandatory'] = fiservConstants.CONFIG_VALIDATIONS.MANDATORY.includes(id);

        let displayName = configDefinition.displayName;
        displayName = displayName.replace(/^(((CommerceHub((Gift)|(PayPal)|(Venmo)|(ApplePay))?)|(((Payment)|(Tokenization)|(Gift)) Form)|(Card Number)|(Name On Card)|(Security Code)|(Expiration ((Month)|(Year)))|(Font)|(Field)) )*/, "");
        idConfigList[id]['displayName'] = displayName;
        if(fiservConstants.CONFIG_DESCRIPTIONS[id])
        {
            idConfigList[id]['description'] = fiservConstants.CONFIG_DESCRIPTIONS[id];
        }

        let currentValue = currentSite.getCustomPreferenceValue(id);
        idConfigList[id]['currentValue'] = currentValue != null ? (currentValue.value != null ? currentValue.value : currentValue) : '';

        idConfigList[id]['defaultValue'] = null;
        if(configDefinition.defaultValue != null)
        idConfigList[id]['defaultValue'] = { 
            'value': configDefinition.defaultValue.value,
            'displayValue': configDefinition.defaultValue.displayValue
        };

        // Deal with potential values array
        if(configDefinition.values == null) 
        {
            idConfigList[id]['values'] = null;
        }
        else
        {
            idConfigList[id]['values'] = [];
            let valuesList = configDefinition.values.toArray();
            for(let i = 0; i < valuesList.length; i++)
            {
                let valueOption = {};
                valueOption['value'] = valuesList[i].value;
                valueOption['displayValue'] = valuesList[i].displayValue;
                idConfigList[id]['values'].push(valueOption);
            }
        }
    });

    const dependencyList = fiservConstants.DEPENDENCY_LIST;
    for(let dependency in dependencyList)
    {
        dependencyList[dependency].forEach((key) =>
        {
            if(!idConfigList[key])
            {
                if(idConfigList[dependency]['nonInputDependencies'] === undefined)
                    idConfigList[dependency]['nonInputDependencies'] = [];
                idConfigList[dependency]['nonInputDependencies'].push(key);
                return;
            }

            if(idConfigList[key]['dependencies'] === undefined)
                idConfigList[key]['dependencies'] = [];
            idConfigList[key]['dependencies'].push(dependency);
        });
    }

    const formDependencyList = fiservConstants.FORM_DEPENDENCY_LIST;
    for(let dependency in formDependencyList)
    {
        formDependencyList[dependency].forEach((key) =>
        {
            fiservConstants.FORM_ID_LIST.forEach((formId) =>
            {
                let keyId = 'CommerceHub' + formId + 'Form' + key;
                let dependencyId = 'CommerceHub' + formId + 'Form' + dependency;
                if(idConfigList[keyId]['dependencies'] === undefined)
                    idConfigList[keyId]['dependencies'] = [];
                idConfigList[keyId]['dependencies'].push(dependencyId);
            });
        });
    }

    return idConfigList;
}

function getPreferenceDescription(field)
{
    let preference = null;
    if (chPreferenceDescriptions && chPreferenceDescriptions[field])
    {
        preference = chPreferenceDescriptions[field];
    }
    return preference;
}

function getFormDescriptions(chPreferenceDescriptions, formId)
{
    // Needs to be an array in order to iterate over it in ISML...
    let form = [];
    let prefix = 'CommerceHub' + formId + 'Form';

    form.push({
        'label': 'Card Number',
        'id': formId + 'CardNumber',
        'items': [
            getPreferenceDescription(prefix + 'CardNumberPlaceholder'),
            getPreferenceDescription(prefix + 'CardNumberPlaceholderCharacter'),
            getPreferenceDescription(prefix + 'CardNumberFormat'),
            getPreferenceDescription(prefix + 'CardNumberMask'),
            getPreferenceDescription(prefix + 'CardNumberMaskCharacter'),
            getPreferenceDescription(prefix + 'CardNumberMaskMode'),
            getPreferenceDescription(prefix + 'CardNumberMaskLength'),
            getPreferenceDescription(prefix + 'CardNumberInvalidFieldMessage')
        ]
    });

    form.push({
        'label': 'Name On Card',
        'id': formId + 'NameOnCard',
        'items': [
            getPreferenceDescription(prefix + 'NameOnCardPlaceholder'),
            getPreferenceDescription(prefix + 'NameOnCardInvalidFieldMessage')
        ]
    });

    form.push({
        'label': 'Security Code',
        'id': formId + 'SecurityCode',
        'items': [
            getPreferenceDescription(prefix + 'SecurityCodePlaceholder'),
            getPreferenceDescription(prefix + 'SecurityCodePlaceholderCharacter'),
            getPreferenceDescription(prefix + 'SecurityCodeMask'),
            getPreferenceDescription(prefix + 'SecurityCodeMaskCharacter'),
            getPreferenceDescription(prefix + 'SecurityCodeMaskMode'),
            getPreferenceDescription(prefix + 'SecurityCodeInvalidFieldMessage')
        ]
    });

    form.push({
        'label': 'Expiration Month',
        'id': formId + 'ExpirationMonth',
        'items': [
            getPreferenceDescription(prefix + 'ExpirationMonthPlaceholder'),
            getPreferenceDescription(prefix + 'ExpirationMonthOptionLabels'),
            getPreferenceDescription(prefix + 'ExpirationMonthInvalidFieldMessage')
        ]
    });

    form.push({
        'label': 'Expiration Year',
        'id': formId + 'ExpirationYear',
        'items': [
            getPreferenceDescription(prefix + 'ExpirationYearPlaceholder'),
            getPreferenceDescription(prefix + 'ExpirationYearInvalidFieldMessage')
        ]
    });

    form.push({
        'label': 'CSS',
        'id': formId + 'CSS',
        'items': [
            getPreferenceDescription(prefix + 'CSS')
        ]
    });

    form.push({
        'label': 'Font',
        'id': formId + 'Font',
        'items': [
            getPreferenceDescription(prefix + 'FontData'),
            getPreferenceDescription(prefix + 'FontFamily'),
            getPreferenceDescription(prefix + 'FontFormat'),
            getPreferenceDescription(prefix + 'FontIntegrity')
        ]
    });

    for(let i = form.length - 1; i >= 0; i--)
    {
        // Remove null arrays
        form[i].items = form[i].items.filter(function (item) { return item; });
        if(form[i].items.length === 0)
        {
            form.splice(i, 1);
        }
    }
    
    return form;
}

function buildConfigList(chPreferenceDescriptions)
{
    // Needs to be an array in order to iterate over it in ISML...
    let configList = [];

    configList.push({
        'label': 'Commerce Hub Gateway General Settings',
        'id': 'CommerceHubGatewayGeneralSettings',
        'items': [
            getPreferenceDescription('CommerceHubMerchantID'),
            getPreferenceDescription('CommerceHubTerminalID'),
            getPreferenceDescription('CommerceHubAPIKey'),
            getPreferenceDescription('CommerceHubAPISecret'),
            getPreferenceDescription('CommerceHubAPIEnvironment'),
            getPreferenceDescription('CommerceHubLogLevel'),
            getPreferenceDescription('CommerceHubSessionLifetime'),
            getPreferenceDescription('CommerceHubTimeout'),
            getPreferenceDescription('CommerceHubMerchantPartnerIntegrator')
        ]
    });

    configList.push({
        'label': 'Payment Acceptance Settings',
        'id': 'PaymentAcceptanceSettings',
        'items': [
            getPreferenceDescription('CommerceHubAcceptedCurrency'),
            getPreferenceDescription('CommerceHubAcceptedCountries')
        ]
    });

    configList.push({
        'label': 'Credit/Debit Cards',
        'id': 'CreditDebitCards',
        'items': [
            getPreferenceDescription('CommerceHubCreditEnable'),
            getPreferenceDescription('CommerceHubCreditPaymentType'),
            getPreferenceDescription('CommerceHub3DSEnable')
        ],
        'subform': {
            'label': 'Tokenization Options',
            'id': 'Tokenization',
            'items': [
                getPreferenceDescription('CommerceHubTokenization'),
                getPreferenceDescription('CommerceHubTokenizationStrategy'),
                getPreferenceDescription('CommerceHubStandaloneSPA'),
                getPreferenceDescription('CommerceHubTokenSecurityEnable'),
                getPreferenceDescription('CommerceHubEarlyTokenization'),
                getPreferenceDescription('CommerceHubBasketTokenization'),
            ]
        }
    });

    configList.push({
        'label': 'Gift Cards',
        'id': 'GiftCards',
        'items': [
            getPreferenceDescription('CommerceHubGiftEnable'),
            getPreferenceDescription('CommerceHubGiftPaymentMethodTitle'),
            getPreferenceDescription('CommerceHubGiftPaymentType'),
            getPreferenceDescription('CommerceHubGiftSecurityEnable'),
            getPreferenceDescription('CommerceHubMaxGiftCards')
        ]
    });

    configList.push({
        'label': 'PayPal',
        'id': 'PayPal',
        'items': [
            getPreferenceDescription('CommerceHubPayPalEnable'),
            getPreferenceDescription('CommerceHubPayPalFastlaneEnable'),
            getPreferenceDescription('CommerceHubPayPalPaymentType'),
            getPreferenceDescription('CommerceHubPayPalVaultingEnable')
        ],
        'subform': {
            'label': 'PayPal Button Customization',
            'id': 'PayPalButton',
            'items': [
                getPreferenceDescription('CommerceHubPayPalButtonColor'),
                getPreferenceDescription('CommerceHubPayPalButtonShape'),
                getPreferenceDescription('CommerceHubPayPalButtonLabel')
            ]
        }
    });

    configList.push({
        'label': 'Venmo',
        'id': 'Venmo',
        'items': [
            getPreferenceDescription('CommerceHubVenmoEnable'),
            getPreferenceDescription('CommerceHubVenmoPaymentType')
        ],
        'subform': {
            'label': 'Venmo Button Customization',
            'id': 'VenmoButton',
            'items': [
                getPreferenceDescription('CommerceHubVenmoButtonShape'),
                getPreferenceDescription('CommerceHubVenmoButtonColor'),
            ]
        }
    });

    configList.push({
        'label': 'Apple Pay',
        'id': 'ApplePay',
        'items': [
            getPreferenceDescription('CommerceHubApplePayEnable'),
            getPreferenceDescription('CommerceHubApplePayPaymentType')
        ],
        'subform': {
            'label': 'Apple Pay Button Customization',
            'id': 'ApplePayButton',
            'items': [
                getPreferenceDescription('CommerceHubApplePayButtonColor'),
                getPreferenceDescription('CommerceHubApplePayButtonLabel')
            ]
        }
    });

    let formList = []
    fiservConstants.FORM_ID_LIST.forEach(formId =>
    {
        formList.push({
            'label': formId + " Form",
            'id': formId + "Form",
            'items': getFormDescriptions(chPreferenceDescriptions, formId)
        });
    });
    configList.push({
        'label': 'Form Customization',
        'id': 'FormCustomization',
        'forms': formList
    });

    return configList;
}

// This isn't technically necessary, but I want to do this to prevent sending excess information to the frontend...
function stripExcessInfo(preferences)
{
    let simplifiedList = {};

    for (let key in preferences)
    {
        simplifiedList[key] = {};
        
        if(preferences[key].valueType !== 13)
        {
            simplifiedList[key]['currentValue'] = preferences[key].currentValue;
        }
        else
        {
            simplifiedList[key]['currentValue'] = preferences[key].currentValue === '' ? '' : '******';
        }
        simplifiedList[key]['defaultValue'] = preferences[key].defaultValue;
        if(preferences[key].dependencies !== undefined)
        {
            simplifiedList[key]['dependencies'] = preferences[key].dependencies;
        }
        if(preferences[key].nonInputDependencies !== undefined)
        {
            simplifiedList[key]['nonInputDependencies'] = preferences[key].nonInputDependencies;
        }
    }

    return simplifiedList;
}

/**
 * Renders the BM template
 */
server.get('Config', csrfProtection.validateAjaxRequest, function (req, res, next)
{
    res.render('/extensions/fiservCommerceHubConfigPage', { ConfigList: configList, SimplifiedPreferences: simplifiedPreferences });
    next();
});

/**
 * Allows users to save config changes
 */
server.post('SaveChanges', csrfProtection.validateAjaxRequest, server.middleware.https, function (req, res, next)
{
    const Transaction = require('dw/system/Transaction');

    let form = req.form;
    let error = false;
    let errorString = '[ ';
    let errorList = {};
    let success = false;
    let successString = '[ ';
    for(let configId in form)
    {
        let displayName = chPreferenceDescriptions[configId]['displayName'];
        let id = chPreferenceDescriptions[configId]['id'];
        id = id.match(/((Payment)|(Tokenization)).*((CardNumber)|(NameOnCard)|(SecurityCode)|(Expiration((Month)|(Year)))|(Font))/);
        if(id != null)
        {
            id = id[0].replace(/([A-Z])/g, ' $1').trim();
            displayName = '(' + id + ') ' + displayName;
        }
        try
        {
            Transaction.begin();
            
            let configValue = form[configId];
            let currentValue = currentSite.getCustomPreferenceValue(configId);
            if(currentValue !== null && typeof(currentValue) === 'boolean')
            {
                configValue = configValue === 'true' ? true : false;
            }
            else if(currentValue !== null && (typeof(currentValue) === 'number'
                || typeof(currentValue.value) === 'number'))
            {
                if(configValue === '\0')
                {
                    throw new Error("Value must be a valid integer");
                }

                configValue = Number(configValue);

                let intRestraint = fiservConstants.CONFIG_VALIDATIONS.INT_CONSTRAINTS[configId];
                if(intRestraint && ((intRestraint.max && configValue > intRestraint.max) || (intRestraint.min && configValue < intRestraint.min)))
                {
                    throw new Error(intRestraint.message);
                }
            }
            
            if(configValue === '\0')
            {
                if(chPreferenceDescriptions[configId].mandatory)
                {
                    throw new Error('Cannot set mandatory field as empty');
                }
                configValue = '';
            }

            const validationRegex = fiservConstants.CONFIG_VALIDATIONS.CONFIG_REGEX;
            if(validationRegex[configId] !== undefined && configValue.match(validationRegex[configId].regex) === null)
            {
                throw new Error(validationRegex[configId].message);
            }

            if(configValue !== '' && fiservConstants.CONFIG_VALIDATIONS.JSON_LIST.includes(configId))
            {
                try
                {
                    JSON.parse(configValue);
                }
                catch (error)
                {
                    throw new Error('Field must contain valid JSON');
                }
            }
            currentSite.setCustomPreferenceValue(configId, configValue);

            successString = successString + displayName + ', ';
            success = true;
            Transaction.commit();
        }
        catch (_er)
        {
            Transaction.rollback();
            error = true;
            errorList[configId] = _er.message;
            errorString = errorString + displayName + ', ';
        }
    }

    successString = successString != '' ? successString.replace(/\,(?=[^,]*$)/, '') : successString;
    errorString = errorString != '' ? errorString.replace(/\,(?=[^,]*$)/, '') : errorString;
    let resJson = {};
    if(!error)
    {
        resJson = {
            success: true,
            successMessage: 'Successfully saved config settings for...' + breakDelimiter + successString + ' ]'
        };
    }
    else if(error && success)
    {
        res.setStatusCode(400);
        resJson = {
            success: true,
            error: true,
            errorList: errorList,
            successMessage: 'Successfully saved config settings for...' + breakDelimiter + successString + ' ]',
            errorMessage: 'Config settings only partially saved...' + breakDelimiter + 'Failures: ' + errorString + ' ]'
        };
    }
    else
    {
        res.setStatusCode(400);
        resJson = {
            error: true,
            errorList: errorList,
            errorMessage: 'Failed to save config settings for...' + breakDelimiter + errorString + ' ]'
        };
    }

    // Check if mandatory fields are set...
    let warn = false;
    let warnList = [];
    let warnString = '[ ';
    for(let i = 0; i < fiservConstants.CONFIG_VALIDATIONS.MANDATORY.length; i++)
    {
        let id = fiservConstants.CONFIG_VALIDATIONS.MANDATORY[i];
        let displayName = chPreferenceDescriptions[id]['displayName'];
        if(currentSite.getCustomPreferenceValue(id) === null)
        {
            warn = true;
            warnString = warnString + displayName + ', ';
            if(!form[id])
            {
                warnList.push(id);
            }
        }
    }

    warnString = warnString != '' ? warnString.replace(/\,(?=[^,]*$)/, '') : warnString;
    if(warn)
    {
        resJson['warn'] = true;
        resJson['warnList'] = warnList;
        resJson['warnMessage'] = 'Mandatory fields have not been set. You will not be able to process payments' + breakDelimiter + warnString + ' ]';
    }
    
    res.json(resJson);
    next();
});

module.exports = server.exports()