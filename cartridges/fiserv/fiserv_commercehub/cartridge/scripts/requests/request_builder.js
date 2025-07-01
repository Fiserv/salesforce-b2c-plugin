"use strict"

const FiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");
let constants = require('*/cartridge/fiservConstants/constants');
const FiservLogs = require("*/cartridge/scripts/utils/commercehubLogs");
let uuidUtils = require("dw/util/UUIDUtils");
let OrderMgr = require('dw/order/OrderMgr');
let orderNo = null;

function buildMerchantDetailsObject()
{
    let merchantDetails = {};
    merchantDetails["merchantId"] = FiservConfig.getCommerceHubMerchantId();
    merchantDetails["terminalId"] = FiservConfig.getCommerceHubTerminalId();
    merchantDetails["merchantPartner"] = buildMerchantPartnerField();

    FiservLogs.logDebug(3, "Merchant Details Data Builder:\n" + JSON.stringify(merchantDetails,null,2), orderNo);
    return merchantDetails;
}

function buildMerchantPartnerField()
{
    let merchantPartner = {};
    merchantPartner["id"] = "CSC909";
    merchantPartner["legacyTppId"] = "CSC909";
    merchantPartner["type"] = "PLUGIN";
    merchantPartner["name"] = "Salesforce";
    merchantPartner["productName"] = "Salesforce B2C Commerce";
    merchantPartner["versionNumber"] = constants.VERSION;
    merchantPartner["integrator"] = FiservConfig.getCommerceHubMerchantPartnerIntegrator();

    return merchantPartner;
}

function buildTransactionInteractionObject()
{
    let txnInteraction = {};
    txnInteraction["origin"] = constants.ECOM_ORIGIN;
    txnInteraction["eciIndicator"] = constants.ECI_INDICATOR;
    txnInteraction["posConditionCode"] = constants.POS_CONDITION_CODE;

    FiservLogs.logDebug(3, "Transaction Interaction Data Builder:\n" + JSON.stringify(txnInteraction,null,2), orderNo);
    return txnInteraction;
}

function buildTransactionDetailsObject(capture, tokenize)
{
    let txnDetails = {};
    txnDetails["captureFlag"] = capture;
    // null tokenize variable represents gift card (because we aren't tokenizing them...)
    if(tokenize !== null)
    {
        txnDetails["createToken"] = tokenize;
    }
    txnDetails["accountVerification"] = false;
    txnDetails["merchantOrderId"] = orderNo;
    txnDetails["merchantTransactionId"] = uuidUtils.createUUID();
    
    FiservLogs.logDebug(3, "Transaction Details Data Builder:\n" + JSON.stringify(txnDetails,null,2), orderNo);
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

    FiservLogs.logDebug(3, "Token Source Data Builder:\n" + JSON.stringify(source,null,2), orderNo);
    return source;
}

function buildSessionSourceObject(sessionId)
{
    let source = {};
    source["sourceType"] = constants.SESSION_SOURCE_TYPE;
    source["sessionId"] = sessionId;
    
    FiservLogs.logDebug(3, "Session Source Data Builder:\n" + JSON.stringify(source,null,2), orderNo);
    return source;
}

function buildAmountObject(paymentInstrument)
{
    let amount = {};
    amount["total"] = paymentInstrument.paymentTransaction.amount.getValue();
    amount["currency"] = paymentInstrument.paymentTransaction.amount.getCurrencyCode();

    FiservLogs.logDebug(3, "Amount Data Builder:\n" + JSON.stringify(amount,null,2), orderNo);
    return amount;
}

function buildBillingAddressObject()
{
    let billingAddressObject = OrderMgr.getOrder(orderNo).getBillingAddress();
    if(!billingAddressObject)
        return;

    let address = {};
    address["street"] = billingAddressObject.address1;
    address["city"] = billingAddressObject.city;
    address["stateOrProvince"] = billingAddressObject.stateCode;
    address["postalCode"] = billingAddressObject.postalCode;
    address["stateOrProvince"] = billingAddressObject.stateCode;
    address["country"] = billingAddressObject.countryCode.value;

    let billingAddress = {};
    billingAddress["firstName"] = billingAddressObject.firstName;
    billingAddress["lastName"] = billingAddressObject.lastName;
    billingAddress["address"] = address;
    billingAddress["phone"] = {
        "phoneNumber": billingAddressObject.phone
    };

    FiservLogs.logDebug(3, "Billing Address Data Builder:\n" + JSON.stringify(billingAddress,null,2), orderNo);
    return billingAddress;
}

function buildCustomerObject()
{
    let customer = {};
    let order = OrderMgr.getOrder(orderNo);
    customer["email"] = order.customerEmail;

    let customerObject = order.getCustomer();
    let profileObject;
    if(customerObject && (profileObject = customerObject.getProfile()))
    {
        customer["merchantCustomerId"] = profileObject.customerNo;
        customer["firstName"] = profileObject.firstName;
        customer["lastName"] = profileObject.lastName;

        let phone = [];
        if(profileObject.phoneBusiness)
            phone.push({ "phoneNumber": profileObject.phoneBusiness, "type": "WORK" });
        if(profileObject.phoneHome)
            phone.push({ "phoneNumber": profileObject.phoneHome, "type": "HOME" });
        if(profileObject.phoneMobile)
            phone.push({ "phoneNumber": profileObject.phoneMobile, "type": "MOBILE" });
        customer["phone"] = phone;
    }

    FiservLogs.logDebug(3, "Customer Data Builder:\n" + JSON.stringify(customer,null,2), orderNo);
    return customer;
}

function buildCardRequest(paymentInstrument, paymentAction)
{
    if(paymentInstrument.creditCardToken)
    {
        FiservLogs.logInfo(1, 'Initiating Token ' + paymentAction[0] + paymentAction.substring(1).toLowerCase() + ' Transaction', orderNo);
    }
    else
    {
        FiservLogs.logInfo(1, 'Initiating Session ' + paymentAction[0] + paymentAction.substring(1).toLowerCase() + ' Transaction', orderNo);
    }

    let req = {};
    let tokenize = false;
    if (FiservConfig.getCommerceHubTokenization() && !paymentInstrument.creditCardToken)
    {
        if(FiservConfig.getCommerceHubTokenizationStrategy())
        {
            tokenize = true;
        }
        else if(!FiservConfig.getEarlyTokenization())
        {
            tokenize = paymentInstrument.paymentTransaction.custom.tokenizeCard;
        }
    }

    req["amount"] = buildAmountObject(paymentInstrument);
    req["source"] = buildSourceObject(paymentInstrument);
    req["transactionDetails"] = buildTransactionDetailsObject(paymentAction === constants.COMMERCEHUB_SALE_ACTION, tokenize);
    req["transactionInteraction"] = buildTransactionInteractionObject();
    req["merchantDetails"] = buildMerchantDetailsObject();
    req["billingAddress"] = buildBillingAddressObject();
    req["customer"] = buildCustomerObject();

    return req;
}

function buildGiftRequest(paymentInstrument, paymentAction)
{
    FiservLogs.logInfo(1, 'Initiating Gift Card ' + paymentAction[0] + paymentAction.substring(1).toLowerCase() + ' Transaction', orderNo);

    let req = {};

    req["amount"] = buildAmountObject(paymentInstrument);
    req["source"] = buildSourceObject(paymentInstrument);
    req["transactionDetails"] = buildTransactionDetailsObject(paymentAction === constants.COMMERCEHUB_SALE_ACTION, null);
    req["transactionInteraction"] = buildTransactionInteractionObject();
    req["merchantDetails"] = buildMerchantDetailsObject();
    req["billingAddress"] = buildBillingAddressObject();
    req["customer"] = buildCustomerObject();

    return req;
}

function buildPrimaryRequest(orderNumber, paymentInstrument)
{
    orderNo = orderNumber;
    let paymentAction = paymentInstrument.paymentTransaction.custom.paymentAction;
    if(paymentAction === constants.COMMERCEHUB_AUTH_ACTION || paymentAction === constants.COMMERCEHUB_SALE_ACTION)
    {
        if(paymentInstrument.paymentMethod === paymentInstrument.METHOD_CREDIT_CARD)
            return buildCardRequest(paymentInstrument, paymentAction);
        else if(paymentInstrument.paymentMethod === constants.COMMERCEHUB_GIFT_PAYMENT_METHOD)
            return buildGiftRequest(paymentInstrument, paymentAction);
        else
            return {};
    }
    else
    {
        return {};
    }
}

function buildTokenRequest(sessionId)
{
    FiservLogs.logInfo(1, 'Initiating Card Tokenization', orderNo);
    let req = {};
    req['source'] = buildSessionSourceObject(sessionId);
    req["merchantDetails"] = buildMerchantDetailsObject();

    return req;
}

function buildBalanceInquiryRequest(sessionId)
{
    FiservLogs.logInfo(1, 'Initiating Balance Inquiry');
    let req = {};
    req['source'] = buildSessionSourceObject(sessionId);
    req['merchantDetails'] = buildMerchantDetailsObject();
    if(FiservConfig.getCommerceHubGiftSecurityEnabled())
    {
        req['additionalDataCommon'] = {
            "additionalData": {
                "securityCodeType": "SCV"
            }
        };
        FiservLogs.logDebug(3, "Additional Data Common Data Builder:\n" + JSON.stringify(req["additionalDataCommon"],null,2), orderNo);
    }

    return req;
}

function buildCancelPayload(orderNumber, transactionId)
{
    orderNo = orderNumber;
    FiservLogs.logInfo(1, 'Initiating Cancel Transaction for Transaction ID: ' + transactionId, orderNo);
    let req = {};
    req["referenceTransactionDetails"] = {
        "referenceTransactionId": transactionId
    };
    FiservLogs.logDebug(3, "Reference Transaction Details Data Builder:\n" + JSON.stringify(req["referenceTransactionDetails"],null,2), orderNo);
    req["transactionDetails"] = {
        merchantTransactionId: uuidUtils.createUUID()
    };
    FiservLogs.logDebug(3, "Transaction Details Data Builder:\n" + JSON.stringify(req["transactionDetails"],null,2), orderNo);
    req["merchantDetails"] = buildMerchantDetailsObject();

    return req;
}

function buildRecoveryPayload(orderNumber, merchantTransactionId)
{
    orderNo = orderNumber;
    
    let req = {};
    req["referenceTransactionDetails"] = {
        "referenceMerchantTransactionId": merchantTransactionId
    };
    FiservLogs.logDebug(3, "Reference Transaction Details Data Builder:\n" + JSON.stringify(req["referenceTransactionDetails"],null,2), orderNo);
    req["merchantDetails"] = buildMerchantDetailsObject();

    return req;
}

module.exports = 
{
    buildPrimaryRequest : buildPrimaryRequest,
    buildTokenRequest : buildTokenRequest,
    buildBalanceInquiryRequest : buildBalanceInquiryRequest,
    buildCancelPayload : buildCancelPayload,
    buildRecoveryPayload : buildRecoveryPayload
}