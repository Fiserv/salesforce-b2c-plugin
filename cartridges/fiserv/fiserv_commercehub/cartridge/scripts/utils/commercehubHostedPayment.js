"use strict"

let Resource = require('dw/web/Resource');
let creds = require("*/cartridge/scripts/credentials/commercehubCredentials");
let FiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");
let secureRandom = new dw.crypto.SecureRandom;
let encoder = dw.crypto.Encoding;

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
        'initConfig' : {
            'cspNonce': encoder.toBase64(secureRandom.nextBytes(32)),
            'environment': FiservConfig.getCommerceHubApiEnvironment()
        },
        'sessionId' : credentials['sessionId']
    }
}

function prepareFormSubmission(is3DS)
{
    return collectSubmitData(creds.getCommercehubCredentials(is3DS));
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
                'use3DS': FiservConfig.get3DSEnabled(),
                'captureFailureMessage': Resource.msg('message.error.scc.captureFailCheckout', 'error', null),
                'threeDSFailureMessage': Resource.msg('message.error.scc.threeDSFailCheckout', 'error', null)
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