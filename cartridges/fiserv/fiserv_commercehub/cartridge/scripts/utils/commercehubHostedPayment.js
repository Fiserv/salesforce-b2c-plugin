'use strict';

const Encoding = require("dw/crypto/Encoding");

const fiservCredentials = require("*/cartridge/scripts/credentials/commercehubCredentials");
const fiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");

const secureRandom = new (require("dw/crypto/SecureRandom"));


function collectSubmitData(credentials)
{
    return {
        'submitConfig' : {
            'apiKey' : fiservConfig.getCommerceHubApiKey(),
            'accessToken': credentials['accessToken'],
            'createToken': false,
            'publicKey': credentials['publicKey'],
            'keyId': credentials['keyId'],
            'merchantId': fiservConfig.getCommerceHubMerchantId(),
            'terminalId': fiservConfig.getCommerceHubTerminalId()
        },
        'initConfig' : {
            'cspNonce': Encoding.toBase64(secureRandom.nextBytes(32)),
            'environment': fiservConfig.getCommerceHubApiEnvironment()
        },
        'sessionId' : credentials['sessionId']
    }
}

function prepareFormSubmission(hostURL, credentialsForm)
{
    return collectSubmitData(fiservCredentials.getCommercehubCredentials(hostURL, credentialsForm));
}

module.exports =
{ 
    prepareFormSubmission : prepareFormSubmission
}