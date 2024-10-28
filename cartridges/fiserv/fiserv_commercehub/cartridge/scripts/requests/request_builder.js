"use strict"

const FiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");
let constants = require('*/cartridge/fiservConstants/constants');

function buildMerchantDetailsObject()
{
    let merchantDetails = {};
    merchantDetails["merchantId"] = FiservConfig.getCommerceHubMerchantId();
    merchantDetails["terminalId"] = FiservConfig.getCommerceHubTerminalId();

    return merchantDetails;
}

function buildTransactionInteractionObject()
{
    let txnInteraction = {};
    txnInteraction["origin"] = constants.ECOM_ORIGIN;
    txnInteraction["eciIndicator"] = constants.ECI_INDICATOR;
    txnInteraction["posConditionCode"] = constants.POS_CONDITION_CODE;

    return txnInteraction;
}

function buildTransactionDetailsObject(capture, tokenize, orderNo)
{
    let txnDetails = {};
    txnDetails["captureFlag"] = capture;
    txnDetails["createToken"] = tokenize;
    txnDetails["accountVerification"] = false;
    txnDetails["merchantOrderId"] = orderNo;
    
    return txnDetails;
}

function buildSourceObject(paymentInstrument)
{
    return paymentInstrument.creditCardToken ? buildTokenSourceObject(paymentInstrument) : buildSessionSourceObject(paymentInstrument.paymentTransaction.custom.commercehubSessionId);
}

function buildTokenSourceObject(paymentInstrument)
{
    let source = {};
    source["sourceType"] = constants.TOKEN_SOURCE_TYPE;
    source["tokenData"] = paymentInstrument.creditCardToken;
    source["tokenSource"] = paymentInstrument.custom.commercehubTokenSource;
    source["declineDuplicates"] = true;

    source["card"] = {
        // month must be two digits
        "expirationMonth" : paymentInstrument.custom.expireMonth.padStart(2, '0'),
        "expirationYear" : paymentInstrument.custom.expireYear
    }

    return source;
}

function buildSessionSourceObject(sessionId)
{
    let source = {};
    source["sourceType"] = constants.SESSION_SOURCE_TYPE;
    source["sessionId"] = sessionId;
    
    return source;
}

function buildAmountObject(paymentInstrument)
{
    let amount = {};
    amount["total"] = paymentInstrument.paymentTransaction.amount.getValue();
    amount["currency"] = paymentInstrument.paymentTransaction.amount.getCurrencyCode();

    return amount;
}

function buildSaleRequest(orderNo, paymentInstrument)
{
    let req = {};
    let tokenize = false;
    if (FiservConfig.getCommerceHubTokenization())
    {
        tokenize = paymentInstrument.paymentTransaction.custom.tokenizeCard;
    }
    req["amount"] = buildAmountObject(paymentInstrument);
    req["source"] = buildSourceObject(paymentInstrument);
    req["transactionDetails"] = buildTransactionDetailsObject(true, tokenize, orderNo);
    req["transactionInteraction"] = buildTransactionInteractionObject();
    req["merchantDetails"] = buildMerchantDetailsObject();

    return req; 
}

function buildAuthRequest(orderNo, paymentInstrument)
{
    let req = {};
    let tokenize = false;
    if (FiservConfig.getCommerceHubTokenization())
    {
        tokenize = paymentInstrument.paymentTransaction.custom.tokenizeCard;
    }
    req["amount"] = buildAmountObject(paymentInstrument);
    req["source"] = buildSourceObject(paymentInstrument);
    req["transactionDetails"] = buildTransactionDetailsObject(false, tokenize, orderNo);
    req["transactionInteraction"] = buildTransactionInteractionObject();
    req["merchantDetails"] = buildMerchantDetailsObject();

    return req;
}

function buildPrimaryRequest(orderNo, paymentInstrument)
{
    //let _action = FiservConfig.getCommerceHubPaymentType();
    //let paymentAction = _action != null ? _action.toString() : "undefined";

    let paymentAction = paymentInstrument.paymentTransaction.custom.paymentAction;

    switch (paymentAction) 
    {
        case constants.COMMERCEHUB_AUTH_ACTION:
            return buildAuthRequest(orderNo, paymentInstrument);
        case constants.COMMERCEHUB_SALE_ACTION:
            return buildSaleRequest(orderNo, paymentInstrument);
        default:
            return {};
    }
}

function buildTokenRequest(sessionId)
{
    let req = {};
    req['source'] = buildSessionSourceObject(sessionId);
    req["merchantDetails"] = buildMerchantDetailsObject();

    return req;
}

module.exports = 
{
    buildPrimaryRequest : buildPrimaryRequest,
    buildTokenRequest : buildTokenRequest
}