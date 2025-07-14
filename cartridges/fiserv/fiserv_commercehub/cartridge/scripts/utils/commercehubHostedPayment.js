"use strict"

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

module.exports = 
{ 
    prepareFormSubmission : prepareFormSubmission
}