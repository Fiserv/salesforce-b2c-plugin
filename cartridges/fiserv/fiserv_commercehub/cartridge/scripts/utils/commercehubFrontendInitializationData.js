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
                'basketTokenization': (fiservConfig.getCommerceHubTokenization() && fiservConfig.getForcedBasketTokenization()),
                'use3DS': fiservConfig.get3DSEnabled(),
                'fastlaneEnabled': fiservConfig.getCommerceHubPayPalFastlaneEnabled(),
                'verificationEnabled': fiservConfig.getVerificationEnabled(),
                'cvvEnabled': fiservConfig.getTokenSecurityEnabled(),
                'captureFailureMessage': Resource.msg('message.error.scc.captureFailCheckout', 'error', null),
                'threeDSFailureMessage': Resource.msg('message.error.scc.threeDSFailCheckout', 'error', null),
                'credentialsFailureMessage': Resource.msg('message.error.generic.credentialsFailure', 'error', null)
            };
            if(configData.fastlaneEnabled)
            {
                configData['fastlaneAddressFormNames'] = fiservConfig.buildAddressFormNamesObject();
            }
            if(configData.cvvEnabled)
            {
                configData['cvvValidationFailureMessage'] = Resource.msg('message.error.cvv.failure', 'error', null);
            }
            break;
        case 'Tokenization':
            configData = {
                'verificationEnabled': fiservConfig.getVerificationEnabled(),
                'captureFailureMessage': Resource.msg('message.error.scc.captureFailTokenization', 'error', null)
            }
            break;
        case 'ACH':
            configData = {
                'captureFailureMessage': Resource.msg('message.error.ach.captureFailCheckout', 'error', null),
                'legalFetchFailureMessage': Resource.msg('message.error.ach.legalFetchFailure', 'error', null),
                'billingAddressFormNames': fiservConfig.buildAddressFormNamesObject()
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
        case 'Venmo':
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
        case 'Affirm':
            configData = {
                'buttonConfig': fiservConfig.buildAffirmButtonConfig(),
                'chargeType': fiservConfig.getCommerceHubAffirmPaymentType(),
                'affirmFailureMessage': Resource.msg('message.error.affirm.failure', 'error', null),
            }
            break;
        case 'SamsungPay':
            configData = {
                'buttonConfig': fiservConfig.buildSamsungPayButtonConfig(),
                'samsungpayFailureMessage': Resource.msg('message.error.samsungpay.failure', 'error', null),
            }
            break;
        case 'Paze':
            configData = {
                displayName: fiservConfig.getCommerceHubPazeDisplayName(),
                'buttonConfig': fiservConfig.buildPazeButtonsConfig(),
                'pazeFailureMessage': Resource.msg('message.error.paze.failure', 'error', null),
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
        'invalidFields': formId !== 'ACH' ? fiservConfig.getInvalidFields(formId) : fiservConfig.getACHInvalidFields(),
        'configData': getFrontendConfigData(formId)
    }
}

module.exports = {
    retrieveFrontendInitializationData : retrieveFrontendInitializationData
}
