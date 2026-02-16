'use strict';

const fiservLogs = require('*/cartridge/scripts/utils/commercehubLogs');


function getBaseUrl()
{
    const URLUtils = require('dw/web/URLUtils');

    const _regex = /^((http|https):\/\/){0,1}(www\.){0,1}(([a-zA-Z0-9]+(\-|\.))){1,}[a-zA-Z]{2,}/;
    let checkoutUrl = URLUtils.https('Checkout-Begin').toString();
    let domain = checkoutUrl.match(_regex);
    
    if (domain == null || typeof(domain[0]) === 'undefined')
    {
        fiservLogs.logError(2, "Unable to determine store base URL: ".concat(checkoutUrl).concat(" Fiserv CommerceHub credentials request failed."));
        throw new Error("Fiserv CommerceHub credentials request failed");
    } 
    return domain[0] 
}

function validateCredentialsResponse(jsonResponse)
{
    return typeof(jsonResponse) !== 'undefined' &&
        typeof(jsonResponse['keyId']) !== 'undefined' &&
        typeof(jsonResponse['accessToken']) !== 'undefined' &&
        typeof(jsonResponse['publicKey']) !== 'undefined' &&
        typeof(jsonResponse['sessionId']) !== 'undefined' &&
        typeof(jsonResponse['symmetricEncryptionAlgorithm']) !== 'undefined';
}

function getCommercehubCredentials(hostURL, credentialsForm)
{
    const fiservServices = require('*/cartridge/scripts/utils/commercehubServices');
    const fiservRequestBuilder = require('*/cartridge/scripts/requests/request_builder');

    fiservLogs.logInfo(1, 'Intitating Credentials Request');
    let credsService = fiservServices.getService('CommercehubCredentials');
    if (credsService == null)
        throw new Error("Could not create Fiserv service: CommerceHubCredentials");

    let payload = fiservRequestBuilder.buildCredentialsRequest(hostURL, getBaseUrl(), credentialsForm);

    let parsedResponse = null;
    try
    {
        parsedResponse = fiservServices.callService(credsService, payload);
    }
    catch(error)
    {
        fiservLogs.logInfo(1, 'Credentials request failure');
        throw error;
    }

    if (!validateCredentialsResponse(parsedResponse))
    {
        fiservLogs.logError(2, 'CommerceHub credentails response failed validation');
        throw new Error("Unable to retreive payment authorization credentails.")
    }

    fiservLogs.logInfo(1, 'Credentials Request Successful');
    return parsedResponse;
}

module.exports = 
{
    getCommercehubCredentials : getCommercehubCredentials
}