'use strict';

module.exports = {
    VERSION : '1.1.3',
    COMMERCEHUB_CERT_ENV : 'CERT',
    COMMERCEHUB_LIVE_ENV : 'PROD',
    ENVIRONMENT_URL_PLACEHOLDER : '[CH_ENVIRONMENT_BASE]',
    COMMERCEHUB_LIVE_BASE : "connect.fiservapis.com",
    COMMERCEHUB_CERT_BASE : "connect-cert.fiservapis.com",
    COMMERCEHUB_SDK_URL : "https://commercehub-checkout.fiservapps.com/sdk/3.8.9/checkout.js",
    COMMERCEHUB_SALE_ACTION : "SALE",
    COMMERCEHUB_AUTH_ACTION : "AUTH",
    ECOM_ORIGIN : "ECOM",
    ECI_INDICATOR : "CHANNEL_ENCRYPTED",
    POS_CONDITION_CODE : "CARD_NOT_PRESENT_ECOM",
    SESSION_SOURCE_TYPE : "PaymentSession",
    TOKEN_SOURCE_TYPE : "PaymentToken",
    PROCESSOR_ID_LIST : {
        COMMERCEHUB_PROCESSOR : "FISERV_COMMERCEHUB",
        COMMERCEHUB_ACH_PROCESSOR : "FISERV_COMMERCEHUB_ACH",
        COMMERCEHUB_GIFT_PROCESSOR : "FISERV_COMMERCEHUB_GIFT",
        COMMERCEHUB_PAYPAL_PROCESSOR : "FISERV_COMMERCEHUB_PAYPAL",
        COMMERCEHUB_VENMO_PROCESSOR : "FISERV_COMMERCEHUB_VENMO",
        COMMERCEHUB_APPLEPAY_PROCESSOR : "FISERV_COMMERCEHUB_APPLEPAY",
        COMMERCEHUB_AFFIRM_PROCESSOR : "FISERV_COMMERCEHUB_AFFIRM",
        COMMERCEHUB_SAMSUNGPAY_PROCESSOR : "FISERV_COMMERCEHUB_SAMSUNGPAY",
        COMMERCEHUB_PAZE_PROCESSOR : "FISERV_COMMERCEHUB_PAZE",
    },
    PAYMENT_METHOD_LIST : {
        COMMERCEHUB_CREDIT_PAYMENT_METHOD : "CREDIT_CARD",
        COMMERCEHUB_ACH_PAYMENT_METHOD : "ACH",
        COMMERCEHUB_GIFT_PAYMENT_METHOD : "GIFT_CARD",
        COMMERCEHUB_APPLEPAY_PAYMENT_METHOD : "APPLEPAY",
        COMMERCEHUB_SAMSUNGPAY_PAYMENT_METHOD : "SAMSUNGPAY",
        COMMERCEHUB_PAZE_PAYMENT_METHOD : "PAZE",
    },
    CHARGES_PAYMENT_METHODS : [
        "CREDIT_CARD",
        "ACH",
        "APPLEPAY",
        "SAMSUNGPAY",
        "PAZE"
    ],
    TXN_STATES : {
        AUTHORIZED : "AUTHORIZED",
        CAPTURED: "CAPTURED",
        PROCESSING: "PROCESSING",
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
        ACH_ACCOUNT_NUMBER: ['source', 'check', 'accountNumber'],
        PAYMENT_TOKEN: ['paymentTokens', 0],
        RESPONSE_MESSAGE: ['paymentReceipt', 'processorResponseDetails', 'responseMessage'],
        SOURCE_TYPE: ['source', 'sourceType'],
        PAYPAL_CUSTOMER_ID: ['customer', 'providerCustomerId'],
        GIFT_BALANCES: ['paymentReceipt', 'balances'],
        ERROR_MESSAGE: ['error', [0], 'message']
    },
    ICON_LIST : ['card', 'gear', 'gift', 'money', 'sign', 'token'],
    FORM_ID_LIST : [ 'Payment', 'Tokenization', 'ACH', 'Gift' ],
    DEPENDENCY_LIST : {
        'CommerceHubCreditEnable': [
            'CommerceHubCreditPaymentType',
            'CommerceHub3DSEnable',
            'CommerceHubPayPalFastlaneEnable', // Fastlane is depentdent on Credit/Debit, not PayPal...
        ],
        'CommerceHubTokenization': [
            'CommerceHubStandaloneTokenization',
            'CommerceHubTokenSecurityEnable',
            'CommerceHubForcedBasketTokenization'
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
        ],
        'CommerceHubAffirmEnable': [
            'CommerceHubAffirmPaymentType',
            'AffirmButton'
		],
        'CommerceHubSamsungPayEnable': [
            'CommerceHubSamsungPayPaymentType',
            'SamsungPayButton'
        ],
        'CommerceHubPazeEnable': [
            'CommerceHubPazePaymentType',
            'CommerceHubPazeDisplayName',
            'PazeButton'
        ]
    },
    FORM_DEPENDENCY_LIST : {
        'CardNumberMask': ['CardNumberMaskCharacter', 'CardNumberMaskMode', 'CardNumberMaskLength'],
        'SecurityCodeMask': ['SecurityCodeMaskCharacter', 'SecurityCodeMaskMode'],
        'AccountNumberMask': ['AccountNumberMaskingCharacter', 'AccountNumberMaskingMode', 'AccountNumberMaskLength'],
        'RoutingNumberMask': ['RoutingNumberMaskingCharacter', 'RoutingNumberMaskingMode', 'RoutingNumberMaskLength'],
        'IdValueMask': ['IdValueMaskingCharacter', 'IdValueMaskingMode', 'IdValueMaskLength']
    },
    CONFIG_VALIDATIONS : {
        MANDATORY: [ // A list of absolutely mandatory fields (Excluding select dropdowns...)
            'CommerceHubMerchantID',
            'CommerceHubTerminalID',
            'CommerceHubAPIKey',
            'CommerceHubAPISecret',
            'CommerceHubSessionLifetime',
            'CommerceHubTimeout'
        ],
        INT_CONSTRAINTS : {
            'CommerceHubSessionLifetime': { min: 30, max: 240, message: 'Valid lifetime value required (240 ≥ value ≥ 30)' },
            'CommerceHubTimeout': { min: 5, max: 30, message: 'Valid timeout value required (30 ≥ value ≥ 5)' },
            'CommerceHubPaymentFormCardNumberMaskLength': { min: 0, message: 'Valid mask length required (value ≥ 4)' },
            'CommerceHubTokenizationFormCardNumberMaskLength': { min: 0, message: 'Valid mask length required (value ≥ 4)' }
        },
        CONFIG_REGEX : {
            'CommerceHubMerchantID': { regex: /^[a-zA-Z0-9]{15}$/, message: 'Merchant ID must be 15 alphanumeric characters' },
            'CommerceHubTerminalID': { regex: /^[a-zA-Z0-9]{8}$/, message: 'Terminal ID must be 8 alphanumeric characters' },
            'CommerceHubAPIKey': { regex: /^[a-zA-Z0-9]{1,2048}$/,message: 'API Key must contain a max length of 2048 alphanumeric characters' },
            'CommerceHubAPISecret': { regex: /^[a-zA-Z0-9]{1,2048}$/, message: 'API Secret must contain a max length of 2048 alphanumeric characters' },
            'CommerceHubMerchantPartnerIntegrator': { regex: /^[ a-zA-Z0-9]{1,64}$/, message: 'Merchant Partner Integrator must contain a max length of 64 alphanumeric characters'}
        },
        JSON_LIST : [
            'CommerceHubPaymentFormExpirationMonthOptionLabels',
            'CommerceHubTokenizationFormExpirationMonthOptionLabels',
            'CommerceHubPaymentFormCSS',
            'CommerceHubTokenizationFormCSS',
            'CommerceHubACHFormCSS'
        ]
    },
    CONFIG_DESCRIPTIONS : {
        'CommerceHubSessionLifetime': 'This field identifies the lifetime of applied payment instruments to the basket (Default: 30 minutes)',
        'CommerceHubTimeout': "Default: 30 seconds",
        'CommerceHubMerchantPartnerIntegrator': "This field identifies the integrator of this Salesforce module. It is typically a 3rd party systems integrator or the merchant themselves. This field is referenced for support purposes.",
        'CommerceHubStandaloneTokenization': "Disables the ability for customers to add payment methods from their account page",
        'CommerceHubForcedBasketTokenization': "Creates a useable payment method associated with the basket and order when a customer chooses not to store their card",
    }
};
