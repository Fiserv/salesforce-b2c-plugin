"use strict"

let Resource = require('dw/web/Resource');
let creds = require("*/cartridge/scripts/credentials/commercehubCredentials");
let FiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");

function collectSubmitData(credentials)
{
    return {
        'submitConfig' : {
            'apiKey' : FiservConfig.getCommerceHubApiKey(),
            'accessToken': credentials['accessToken'],
            'createToken': false,
            'publicKey': credentials['publicKey'],
            'keyId': credentials['keyId'],
            'merchantId': FiservConfig.getCommerceHubMerchantId(),
            'terminalId': FiservConfig.getCommerceHubTerminalId()
        },
        'sessionId' : credentials['sessionId']
    }
}

function prepareFormSubmission()
{
    return collectSubmitData(creds.getCommercehubCredentials());
}

// Provides the frontend files with config settings needed by the frontend
function getFrontendConfigData(formId)
{
    let configData;
    switch(formId)
    {
        case 'Payment':
            configData = {
                'tokenizeEarly': FiservConfig.getEarlyTokenization(),
                'captureFailureMessage': Resource.msg('message.error.scc.captureFailCheckout', 'error', null)
            };
            break;
        case 'Tokenization':
            configData = {
                'captureFailureMessage': Resource.msg('message.error.scc.captureFailTokenization', 'error', null)
            }
            break;
        case 'Gift':
            configData = {
                'captureFailureMessage': Resource.msg('message.error.scc.captureFailGift', 'error', null),
            }
            break;
        default:
            configData = {};
            break;
    }
    return configData;
}

function collectInitializationData(formId)
{
    return {
        'environment': FiservConfig.getCommerceHubApiEnvironment(),
        'formCustomization': FiservConfig.getFormConfig(formId),
        'invalidFields': FiservConfig.getInvalidFields(formId),
        'configData': getFrontendConfigData(formId)
    }
}

function retrieveFormInitializationData(formId)
{
    return collectInitializationData(formId);
}

module.exports = 
{ 
    prepareFormSubmission : prepareFormSubmission,
    retrieveFormInitializationData : retrieveFormInitializationData
}