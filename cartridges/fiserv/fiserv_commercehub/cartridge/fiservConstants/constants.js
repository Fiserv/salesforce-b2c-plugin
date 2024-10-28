"use strict"

module.exports = {
    COMMERCEHUB_CERT_ENV : 'CERT',
    COMMERCEHUB_LIVE_ENV : 'LIVE',
    ENVIRONMENT_URL_PLACEHOLDER : '[CH_ENVIRONMENT_BASE]',
    COMMERCEHUB_LIVE_BASE : "prod.api.fiservapps.com",
    COMMERCEHUB_CERT_BASE : "cert.api.fiservapps.com",
    COMMERCEHUB_SDK_PATH : "ch/sdk/v1/commercehub-client-sdk.js",
    COMMERCEHUB_SALE_ACTION : "SALE",
    COMMERCEHUB_AUTH_ACTION : "AUTH",
    ECOM_ORIGIN : "ECOM",
    ECI_INDICATOR : "CHANNEL_ENCRYPTED",
    POS_CONDITION_CODE : "CARD_NOT_PRESENT_ECOM",
    SESSION_SOURCE_TYPE : "PaymentSession",
    TOKEN_SOURCE_TYPE : "PaymentToken",
    TXN_STATES : {
        AUTHORIZED : "AUTHORIZED",
        CAPTURED: "CAPTURED",
        DECLINED: "DECLINED"
    }
};