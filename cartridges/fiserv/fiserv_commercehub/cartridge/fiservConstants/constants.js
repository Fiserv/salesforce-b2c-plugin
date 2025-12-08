'use strict';

module.exports = {
    VERSION : '1.1.1',
    COMMERCEHUB_CERT_ENV : 'CERT',
    COMMERCEHUB_LIVE_ENV : 'PROD',
    ENVIRONMENT_URL_PLACEHOLDER : '[CH_ENVIRONMENT_BASE]',
    COMMERCEHUB_LIVE_BASE : "connect.fiservapis.com",
    COMMERCEHUB_CERT_BASE : "connect-cert.fiservapis.com",
    COMMERCEHUB_SDK_URL : "https://commercehub-secure-data-capture.fiservapps.com/3.6.13/checkout.js",
    COMMERCEHUB_SALE_ACTION : "SALE",
    COMMERCEHUB_AUTH_ACTION : "AUTH",
    ECOM_ORIGIN : "ECOM",
    ECI_INDICATOR : "CHANNEL_ENCRYPTED",
    POS_CONDITION_CODE : "CARD_NOT_PRESENT_ECOM",
    SESSION_SOURCE_TYPE : "PaymentSession",
    TOKEN_SOURCE_TYPE : "PaymentToken",
    PROCESSOR_ID_LIST : {
        COMMERCEHUB_PROCESSOR : "FISERV_COMMERCEHUB",
        COMMERCEHUB_GIFT_PROCESSOR : "FISERV_COMMERCEHUB_GIFT",
        COMMERCEHUB_PAYPAL_PROCESSOR : "FISERV_COMMERCEHUB_PAYPAL",
        COMMERCEHUB_VENMO_PROCESSOR : "FISERV_COMMERCEHUB_VENMO",
        COMMERCEHUB_APPLEPAY_PROCESSOR : "FISERV_COMMERCEHUB_APPLEPAY",
    },
    PAYMENT_METHOD_LIST : {
        COMMERCEHUB_GIFT_PAYMENT_METHOD : "GIFT_CARD",
        COMMERCEHUB_PAYPAL_PAYMENT_METHOD : "PAYPAL",
        COMMERCEHUB_VENMO_PAYMENT_METHOD : "VENMO",
        COMMERCEHUB_APPLEPAY_PAYMENT_METHOD : "APPLEPAY",
    },
    TXN_STATES : {
        AUTHORIZED : "AUTHORIZED",
        CAPTURED: "CAPTURED",
        DECLINED: "DECLINED"
    },
    RESPONSE_PATHS : {
        TRANSACTION_ID: ['gatewayResponse', 'transactionProcessingDetails', 'transactionId'],
        TRANSACTION_STATE: ['gatewayResponse', 'transactionState'],
        CARD_TYPE: ['cardDetails', 'detailedCardProduct'],
        CARD_TYPE_TOKEN: ['cardDetails', 0, 'detailedCardProduct'],
        CARD_INDICATOR: ['cardDetails', 'detailedCardIndicator'],
        CARD_INDICATOR_TOKEN: ['cardDetails', 0, 'detailedCardIndicator'],
        CARD_SOURCE: ['source', 'card'],
        LAST_FOUR: ['source', 'card', 'last4'],
        EXP_MONTH: ['source', 'card', 'expirationMonth'],
        EXP_YEAR: ['source', 'card', 'expirationYear'],
        PAYMENT_TOKEN: ['paymentTokens', 0],
        RESPONSE_MESSAGE: ['paymentReceipt', 'processorResponseDetails', 'responseMessage'],
        SOURCE_TYPE: ['source', 'sourceType'],
        PAYPAL_CUSTOMER_ID: ['customer', 'providerCustomerId'],
        GIFT_BALANCES: ['paymentReceipt', 'balances'],
        ERROR_MESSAGE: ['error', [0], 'message']
    },
    ICON_LIST : ['card', 'gear', 'gift', 'money', 'sign', 'token'],
    FORM_ID_LIST : [ 'Payment', 'Tokenization', 'Gift' ],
    DEPENDENCY_LIST : { 
        'CommerceHubCreditEnable': [
            'CommerceHubCreditPaymentType',
            'CommerceHubTokenization',
            'CommerceHubTokenizationStrategy',
            'CommerceHubStandaloneSPA',
            'CommerceHubEarlyTokenization',
            'CommerceHub3DSEnable',
            'CommerceHubPayPalFastlaneEnable' // Fastlane is depentdent on Credit/Debit, not PayPal...
        ],
        'CommerceHubTokenization': [
            'CommerceHubTokenizationStrategy',
            'CommerceHubStandaloneSPA',
            'CommerceHubEarlyTokenization'
        ],
        'CommerceHubGiftEnable': [
            'CommerceHubGiftPaymentMethodTitle',
            'CommerceHubGiftPaymentType',
            'CommerceHubGiftSecurityEnable',
            'CommerceHubMaxGiftCards'
        ],
        'CommerceHubPayPalEnable': [
            'CommerceHubPayPalPaymentType',
            'CommerceHubPayPalVaultingEnable',
            'PayPalButton'
        ],
        'CommerceHubVenmoEnable': [
            'CommerceHubVenmoPaymentType',
            'VenmoButton'
        ],
        'CommerceHubApplePayEnable': [
            'CommerceHubApplePayPaymentType',
            'ApplePayButton'
        ]
    },
    FORM_DEPENDENCY_LIST : {
        'CardNumberMask': ['CardNumberMaskCharacter', 'CardNumberMaskMode', 'CardNumberMaskLength'],
        'SecurityCodeMask': ['SecurityCodeMaskCharacter', 'SecurityCodeMaskMode']
    },
    CONFIG_VALIDATIONS : {
        MANDATORY: [ // A list of absolutely mandatory fields (Excluding select dropdowns...)
            'CommerceHubMerchantID',
            'CommerceHubTerminalID',
            'CommerceHubAPIKey',
            'CommerceHubAPISecret',
            'CommerceHubTimeout'
        ],
        INT_CONSTRAINTS : {
            'CommerceHubTimeout': { min: 5, max: 30, message: 'Valid timeout value required (30 ≥ value ≥ 5)' },
            'CommerceHubPaymentFormCardNumberMaskLength': { min: 0, message: 'Valid mask length required (value ≥ 4)' },
            'CommerceHubTokenizationFormCardNumberMaskLength': { min: 0, message: 'Valid mask length required (value ≥ 4)' }
        },
        CONFIG_REGEX : {
            'CommerceHubMerchantID': { regex: /^\d{15}$/, message: 'Merchant ID must be 15 digits' },
            'CommerceHubTerminalID': { regex: /^\d{8}$/, message: 'Terminal ID must be 8 digits' },
            'CommerceHubAPIKey': { regex: /^[a-zA-Z0-9]{1,2048}$/,message: 'API Key must contain a max length of 2048 alphanumeric characters' },
            'CommerceHubAPISecret': { regex: /^[a-zA-Z0-9]{1,2048}$/, message: 'API Secret must contain a max length of 2048 alphanumeric characters' },
            'CommerceHubMerchantPartnerIntegrator': { regex: /^[ a-zA-Z0-9]{1,64}$/, message: 'Merchant Partner Integrator must contain a max length of 64 alphanumeric characters'}
        },
        JSON_LIST : [
            'CommerceHubPaymentFormExpirationMonthOptionLabels',
            'CommerceHubTokenizationFormExpirationMonthOptionLabels',
            'CommerceHubPaymentFormCSS',
            'CommerceHubTokenizationFormCSS'
        ]
    },
    CONFIG_DESCRIPTIONS : {
        'CommerceHubMerchantPartnerIntegrator': "This field identifies the integrator of this Salesforce module. It is typically a 3rd party systems integrator or the merchant themselves. This field is referenced for support purposes.",
        'CommerceHubTimeout': "Default: 30 seconds",
        'CommerceHubTokenizationStrategy': "Enable this option to tokenize all payment cards submitted at checkout, regardless of consumer choice.",
        'CommerceHubStandaloneSPA': "Enable this toggle to allow customer to tokenize a card outside of the checkout flow"
    }
};
