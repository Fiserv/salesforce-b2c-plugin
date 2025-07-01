'use strict';

let server = require('server');
const dwSystem = require('dw/system');
const csrfProtection = require('*/cartridge/scripts/middleware/csrf');
const Transaction = require('dw/system/Transaction');
const currentSite = dwSystem.Site.getCurrent();

// Additional assisting variables.
const constants = require('*/cartridge/fiservConstants/constants');
const formIdList = constants.FORM_ID_LIST;
const dependencyList = constants.DEPENDENCY_LIST;
const formDependencyList = constants.FORM_DEPENDENCY_LIST;
const validationRegex = constants.CONFIG_VALIDATIONS.CONFIG_REGEX;
const jsonList = constants.CONFIG_VALIDATIONS.JSON_LIST;

// Instantiating Preferences
const chPreferenceDescriptions = retrieveCommerceHubPreferences();
var configList;
var simplifiedPreferences;
if(chPreferenceDescriptions != null)
{
    configList = buildConfigList(chPreferenceDescriptions);
    simplifiedPreferences = stripExcessInfo(chPreferenceDescriptions);
}

function retrieveCommerceHubPreferences()
{
    let chAttributeGroupCH = currentSite.getPreferences().describe().getAttributeGroup(constants.COMMERCEHUB_PROCESSOR);
    let configListCH = [];
    if(chAttributeGroupCH)
    {
        configListCH = chAttributeGroupCH.getAttributeDefinitions().toArray();
    }

    let chAttributeGroupCHGift = currentSite.getPreferences().describe().getAttributeGroup(constants.COMMERCEHUB_GIFT_PROCESSOR);
    let configListCHGift = [];
    if(chAttributeGroupCHGift)
    {
        configListCHGift = chAttributeGroupCHGift.getAttributeDefinitions().toArray();
    }

    // Return null if neither groups present...
    if(!chAttributeGroupCH && !chAttributeGroupCHGift)
    {
        return null;
    }

    let configList = configListCH.concat(configListCHGift);
    let idConfigList = {};
    
    configList.forEach(configDefinition => {
        let id = configDefinition.ID;

        if(idConfigList[id])
        {
            return;
        }

        idConfigList[id] = {};
        idConfigList[id]['id'] = id;
        idConfigList[id]['valueType'] = configDefinition.valueTypeCode;
        idConfigList[id]['mandatory'] = constants.CONFIG_VALIDATIONS.MANDATORY.includes(id);

        let displayName = configDefinition.displayName;
        displayName = displayName.replace(/^(((CommerceHub(Gift)?)|(((Payment)|(Tokenization)|(Gift)) Form)|(Card Number)|(Name On Card)|(Security Code)|(Expiration ((Month)|(Year)))|(Font)|(Field)) )*/, "");
        idConfigList[id]['displayName'] = displayName;
        if(constants.CONFIG_DESCRIPTIONS[id])
        {
            idConfigList[id]['description'] = constants.CONFIG_DESCRIPTIONS[id];
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

    for(let dependency in dependencyList)
    {
        dependencyList[dependency].forEach((key) => {
            if(idConfigList[key]['dependencies'] === undefined)
                idConfigList[key]['dependencies'] = [];
            idConfigList[key]['dependencies'].push({
                'id': dependency,
                'displayName': idConfigList[dependency].displayName
            });
        });
    }

    for(let dependency in formDependencyList)
    {
        formDependencyList[dependency].forEach((key) => {
            formIdList.forEach((formId) => {
                let keyId = 'CommerceHub' + formId + 'Form' + key;
                let dependencyId = 'CommerceHub' + formId + 'Form' + dependency;
                if(idConfigList[keyId]['dependencies'] === undefined)
                    idConfigList[keyId]['dependencies'] = [];
                idConfigList[keyId]['dependencies'].push({
                    'id': dependencyId,
                    'displayName': idConfigList[dependencyId].displayName
                });
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
            getPreferenceDescription('CommerceHubMerchantPartnerIntegrator'),
            getPreferenceDescription('CommerceHubTimeout')
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
            getPreferenceDescription('CommerceHubCreditPaymentMethodTitle'),
            getPreferenceDescription('CommerceHubCreditPaymentType'),
            getPreferenceDescription('CommerceHubTokenization'),
            getPreferenceDescription('CommerceHubTokenizationStrategy'),
            getPreferenceDescription('CommerceHubStandaloneSPA'),
            getPreferenceDescription('CommerceHubEarlyTokenization'),
            getPreferenceDescription('CommerceHubCreditPrivacyStatement')
        ]
    });

    configList.push({
        'label': 'Gift Cards',
        'id': 'GiftCards',
        'items': [
            getPreferenceDescription('CommerceHubGiftEnable'),
            getPreferenceDescription('CommerceHubGiftPaymentMethodTitle'),
            getPreferenceDescription('CommerceHubGiftPaymentType'),
            getPreferenceDescription('CommerceHubGiftSecurityEnable'),
            getPreferenceDescription('CommerceHubMaxGiftCards'),
            getPreferenceDescription('CommerceHubGiftPrivacyStatement')
        ]
    });

    let formList = []
    formIdList.forEach(formId => {
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
    var simplifiedList = {};

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
    }

    return simplifiedList;
}

/**
 * Renders the BM template
 */
server.get('Config', csrfProtection.validateAjaxRequest, function (req, res, next) {
    res.render('/extensions/fiservCommerceHubConfigPage', { ConfigList: configList, SimplifiedPreferences: simplifiedPreferences });
    next();
});

/**
 * Allows users to save config changes
 */
server.post('SaveChanges', csrfProtection.validateAjaxRequest, server.middleware.https, function (req, res, next) {
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
        try {
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

                let intRestraint = constants.CONFIG_VALIDATIONS.INT_CONSTRAINTS[configId];
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
            if(validationRegex[configId] !== undefined && configValue.match(validationRegex[configId].regex) === null)
            {
                throw new Error(validationRegex[configId].message);
            }
            if(configValue !== '' && jsonList.includes(configId))
            {
                try {
                    JSON.parse(configValue);
                } catch (error) {
                    throw new Error('Field must contain valid JSON');
                }
            }
            currentSite.setCustomPreferenceValue(configId, configValue);

            successString = successString + displayName + ', ';
            success = true;
            Transaction.commit();
        } catch (_er) {
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
            successMessage: 'Successfully saved config settings for...<br>' + successString + ' ]'
        };
    }
    else if(error && success)
    {
        res.setStatusCode(400);
        resJson = {
            success: true,
            error: true,
            errorList: errorList,
            successMessage: 'Successfully saved config settings for...<br>' + successString + ' ]',
            errorMessage: 'Config settings only partially saved...<br>Failures: ' + errorString + ' ]'
        };
    }
    else
    {
        res.setStatusCode(400);
        resJson = {
            error: true,
            errorList: errorList,
            errorMessage: 'Failed to save config settings for...<br>' + errorString + ' ]'
        };
    }

    // Check if mandatory fields are set...
    let warn = false;
    let warnList = [];
    let warnString = '[ ';
    for(let i = 0; i < constants.CONFIG_VALIDATIONS.MANDATORY.length; i++)
    {
        let id = constants.CONFIG_VALIDATIONS.MANDATORY[i];
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
        resJson['warnMessage'] = 'Mandatory fields have not been set. You will not be able to process payments<br>' + warnString + ' ]';
    }
    
    res.json(resJson);
    next();
});

module.exports = server.exports()