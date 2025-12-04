'use strict';

const fiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");


// Provides the frontend files with config settings needed by the frontend
function getFrontendConfigData(formId)
{
    const Resource = require('dw/web/Resource');

    let configData;
    switch(formId)
    {
        case 'Payment':
            configData = {
                'tokenizeEarly': fiservConfig.getEarlyTokenization(),
                'use3DS': fiservConfig.get3DSEnabled(),
                'fastlaneEnabled': fiservConfig.getCommerceHubPayPalFastlaneEnabled(),
                'captureFailureMessage': Resource.msg('message.error.scc.captureFailCheckout', 'error', null),
                'threeDSFailureMessage': Resource.msg('message.error.scc.threeDSFailCheckout', 'error', null),
                'credentialsFailureMessage': Resource.msg('message.error.generic.credentialsFailure', 'error', null)
            };
            if(configData.fastlaneEnabled)
            {
                configData['fastlaneAddressFormNames'] = fiservConfig.buildAddressFormNamesObject();
            }
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
                'buttonsConfig': fiservConfig.buildPayPalButtonsConfig(),
                'chargeType': fiservConfig.getCommerceHubPayPalPaymentType(),
                'shippingAddressFormNames': fiservConfig.buildAddressFormNamesObject(),
                'paypalFailureMessage': Resource.msg('message.error.paypal.failure', 'error', null),
            }
            break;
            case 'venmo':
            configData = {
                'buttonsConfig': fiservConfig.buildVenmoButtonsConfig(),
                'chargeType': fiservConfig.getCommerceHubVenmoPaymentType(),
                'shippingAddressFormNames': fiservConfig.buildAddressFormNamesObject(),
                'venmoFailureMessage': Resource.msg('message.error.venmo.failure', 'error', null),
            }
            break;
        case 'ApplePay':
            configData = {
                'buttonConfig': fiservConfig.buildApplePayButtonConfig(),
                'billingAddressFormNames': fiservConfig.buildAddressFormNamesObject(),
                'applepayFailureMessage': Resource.msg('message.error.applepay.failure', 'error', null),
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
        'environment': fiservConfig.getCommerceHubApiEnvironment(),
        'formCustomization': fiservConfig.getFormConfig(formId),
        'invalidFields': fiservConfig.getInvalidFields(formId),
        'configData': getFrontendConfigData(formId)
    }
}

module.exports = {
    retrieveFrontendInitializationData : retrieveFrontendInitializationData
}