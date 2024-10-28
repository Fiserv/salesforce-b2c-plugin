"use strict"

let commercehubConfig = require('*/cartridge/scripts/utils/commercehubConfig');
let constants = require('*/cartridge/fiservConstants/constants');

function createSdkUrl(environment)
{
    if (environment === constants.COMMERCEHUB_LIVE_ENV)
        return "https://".concat(constants.COMMERCEHUB_LIVE_BASE).concat('/').concat(constants.COMMERCEHUB_SDK_PATH)

    return "https://".concat(constants.COMMERCEHUB_CERT_BASE).concat('/').concat(constants.COMMERCEHUB_SDK_PATH)
}

function validSessionId(sessionId)
{
    let guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    return typeof(sessionId) !== "undefined" &&
        sessionId.match(guidRegex)
}

function canTokenize()
{
    return commercehubConfig.getCommerceHubTokenization();
}

function getCommercehubSDK()
{
    let env = commercehubConfig.getCommerceHubApiEnvironment();
    env = env != null ? env : constants.COMMERCEHUB_CERT_ENV;
    return createSdkUrl(env);
}

function getB2cCardType(cardType) {
    switch (cardType.value.toLowerCase()) {
        case 'visa':
            return 'Visa';
        case 'mastercard':
            return 'Master Card';
        case 'amex':
            return 'Amex';
        case 'discover':
            return 'Discover';
        case 'maestro':
        case 'maestrouk':
            return 'Maestro';
        case 'diners':
            return 'Diners';
        case 'jcb':
            return 'JCB';
    }
    throw new Error('Unable to determine Salesforce B2C card type for: '.concat(cardType));
  }

module.exports =
{
    getCommercehubSDK : getCommercehubSDK,
    canTokenize : canTokenize,
    getB2cCardType : getB2cCardType,
    validSessionId : validSessionId
}