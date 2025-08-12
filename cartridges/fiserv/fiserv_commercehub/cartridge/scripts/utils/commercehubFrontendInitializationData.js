"use strict"

let Resource = require('dw/web/Resource');
let FiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");

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
                'giftCardLineItemTitle': Resource.msg('display.html.gift.giftListItem', 'display', null),
                'giftCardRemoveText': Resource.msg('display.html.gift.removeGiftListItem', 'display', null)
            }
            break;
        case 'PayPal':
            configData = {
                'buttonsConfig': FiservConfig.buildPayPalButtonsConfig(),
                'chargeType': FiservConfig.getCommerceHubPayPalPaymentType(),
                'customerId': null
            }
            break;
        default:
            configData = {};
            break;
    }
    return configData;
}

function retrieveFrontendInitializationData(formId)
{
    return {
        'environment': FiservConfig.getCommerceHubApiEnvironment(),
        'formCustomization': FiservConfig.getFormConfig(formId),
        'invalidFields': FiservConfig.getInvalidFields(formId),
        'configData': getFrontendConfigData(formId)
    }
}

module.exports = {
    retrieveFrontendInitializationData : retrieveFrontendInitializationData
}