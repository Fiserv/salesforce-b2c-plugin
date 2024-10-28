"use strict";

let FiservServices = require('*/cartridge/scripts/utils/commercehubServices');
let FiservLogs = require('*/cartridge/scripts/utils/commercehubLogs');
let commerceHubConfig = require('*/cartridge/scripts/utils/commercehubConfig');
let URLUtils = require('dw/web/URLUtils');


function getBaseUrl()
{
    const _regex = /^((http|https):\/\/){0,1}(www\.){0,1}(([a-zA-Z0-9]+(\-|\.))){1,}[a-zA-Z]{2,}/;
    let checkoutUrl = URLUtils.https('Checkout-Begin').toString();
    let domain = checkoutUrl.match(_regex);
    
    if (domain == null || typeof(domain[0]) === 'undefined')
    {
        FiservLogs.error_log("Unable to determine store base URL: ".concat(checkoutUrl).concat(" Fiserv CommerceHub credentials request failed."));
        throw new Error("Fiserv CommerceHub credentials request failed");
    } 
    return domain[0] 
}

function getCredentialsPayload()
{
    let baseUrl = getBaseUrl();
    let payload = {
        'domains' : [
            { 'url': baseUrl }
        ],
        'merchantDetails' : {
            'merchantId' : commerceHubConfig.getCommerceHubMerchantId() 
        }
    }

    return payload;
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

function getCommercehubCredentials()
{
    let credsService = FiservServices.getService('CommercehubCredentials');
    if (credsService == null)
        throw new Error("Could not create Fiserv service: CommerceHubCredentials");

    let payload = getCredentialsPayload();

    let response = FiservServices.callService(credsService, payload);
    let parsedResponse = JSON.parse(response);

    if (!validateCredentialsResponse(parsedResponse))
    {
        FiservLogs.error_log('CommerceHub credentails response failed validation: '.concat(response));
        throw new Error("Unable to retreive payment authorization credentails.")
    }

    return parsedResponse;
}

module.exports = 
{
    getCommercehubCredentials : getCommercehubCredentials
}