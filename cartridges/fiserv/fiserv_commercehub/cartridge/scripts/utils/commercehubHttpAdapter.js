"use strict"

let FiservConfig = require('*/cartridge/scripts/utils/commercehubConfig');
let FiservLogs = require('*/cartridge/scripts/utils/commercehubLogs');
const hmac = require('dw/crypto/Mac');
const encoding = require('dw/crypto/Encoding');

function getNonce(timestamp)
{
    return timestamp + Math.floor(Math.random() * 100000000000)
}

function createSignature(apiKey, payload, timestamp, nonce, orderNo)
{
    let apiSecret = FiservConfig.getCommerceHubApiSecret();
    if (apiSecret == null)
    {
        FiservLogs.logError(2, "Unable to determine CommerceHub API Secret", orderNo);
        throw new Error("Unable to determine CommerceHub API Secret");
    }

    let rawSignature = apiKey.concat(nonce).concat(timestamp).concat(JSON.stringify(payload));
    let hash = new hmac(hmac.HMAC_SHA_256);
    let computedHash = hash.digest(rawSignature, apiSecret);
    return encoding.toBase64(computedHash);
}

function populateService(service, payload, nonce, orderNo)
{
    let apiKey = FiservConfig.getCommerceHubApiKey();
    let timestamp = Date.now();
    nonce = nonce ? nonce : getNonce(timestamp);

    if (apiKey == null)
    {
        FiservLogs.logError(2, "Unable to determine CommerceHub API Key", orderNo);
        throw new Error("Unable to determine CommerceHub API Key");
    }

    service.addHeader('Api-Key', apiKey);
    service.addHeader('Content-Type', 'application/json');
    service.addHeader('Content-Length', JSON.stringify(payload).length);
    service.addHeader('Authorization', createSignature(apiKey, payload, timestamp, nonce, orderNo));
    service.addHeader('Client-Request-Id', nonce);
    service.addHeader('Timestamp', timestamp);
    service.addHeader('Auth-Token-Type', 'HMAC');

    return { service: service, clientRequestId: nonce };
}

module.exports = 
{ 
    populateService : populateService 
}