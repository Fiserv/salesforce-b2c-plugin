"use strict"

const FiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");
let constants = require('*/cartridge/fiservConstants/constants');
const FiservLogs = require("*/cartridge/scripts/utils/commercehubLogs");
let FiservHelper = require('*/cartridge/scripts/utils/fiservHelper');
let uuidUtils = require("dw/util/UUIDUtils");
let OrderMgr = require('dw/order/OrderMgr');
let BasketMgr = require('dw/order/BasketMgr');
let orderNo = null;
let showBuilders = true;

function buildMerchantDetailsObject()
{
    let merchantDetails = {};
    merchantDetails["merchantId"] = FiservConfig.getCommerceHubMerchantId();
    merchantDetails["terminalId"] = FiservConfig.getCommerceHubTerminalId();
    merchantDetails["merchantPartner"] = buildMerchantPartnerField();

    if(showBuilders)
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

    if(showBuilders)
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
    
    if(showBuilders)
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

    if(showBuilders)
        FiservLogs.logDebug(3, "Token Source Data Builder:\n" + JSON.stringify(source,null,2), orderNo);
    return source;
}

function buildSessionSourceObject(sessionId)
{
    let source = {};
    source["sourceType"] = constants.SESSION_SOURCE_TYPE;
    source["sessionId"] = sessionId;
    
    if(showBuilders)
        FiservLogs.logDebug(3, "Session Source Data Builder:\n" + JSON.stringify(source,null,2), orderNo);
    return source;
}

function buildAmountObject(paymentInstrument)
{
    let amount = {};
    amount["total"] = paymentInstrument.paymentTransaction.amount.getValue();
    amount["currency"] = paymentInstrument.paymentTransaction.amount.getCurrencyCode();

    if(showBuilders)
        FiservLogs.logDebug(3, "Amount Data Builder:\n" + JSON.stringify(amount,null,2), orderNo);
    return amount;
}

function buildAmountObjectFromBasket(basketObject) {
    let amount = {}
    amount['total'] = FiservHelper.retreiveNonGiftChargeAmount(basketObject);
    amount['currency'] = basketObject.getCurrencyCode();

    if(showBuilders)
        FiservLogs.logDebug(3, "Amount Data Builder:\n" + JSON.stringify(amount,null,2), orderNo);
    return amount;
}

function buildBillingAddressObject(billingAddressObject)
{
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

    if(showBuilders)
        FiservLogs.logDebug(3, "Billing Address Data Builder:\n" + JSON.stringify(billingAddress,null,2), orderNo);
    return billingAddress;
}

function buildCustomerObject(cartInfoContainer)
{
    let customer = {};
    customer["email"] = cartInfoContainer.customerEmail;

    let customerObject = cartInfoContainer.getCustomer();
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

    if(showBuilders)
        FiservLogs.logDebug(3, "Customer Data Builder:\n" + JSON.stringify(customer,null,2), orderNo);
    return customer;
}

function build3DSObject(paymentInstrument)
{
    let additionalData3DS = {};

    additionalData3DS['authenticationTransactionId'] = paymentInstrument.paymentTransaction.custom.commercehub3DSAuthenitcationId;
    
    if(showBuilders)
        FiservLogs.logDebug(3, "3DS Data Builder:\n" + JSON.stringify(additionalData3DS,null,2), orderNo);
    return additionalData3DS;
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
    let order = OrderMgr.getOrder(orderNo)
    req["billingAddress"] = buildBillingAddressObject(order.getBillingAddress());
    req["customer"] = buildCustomerObject(order);

    if(FiservConfig.get3DSEnabled() && !paymentInstrument.creditCardToken)
    {
        req['additionalData3DS'] = build3DSObject(paymentInstrument);
    }

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
    let order = OrderMgr.getOrder(orderNo)
    req["billingAddress"] = buildBillingAddressObject(order.getBillingAddress());
    req["customer"] = buildCustomerObject(order);

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

function buildCredentialsRequest(baseUrl, is3DS)
{
    showBuilders = false;

    let payload = {
        'domains' : [
            { 'url': baseUrl }
        ],
        'merchantDetails' : {
            'merchantId' : FiservConfig.getCommerceHubMerchantId()
        }
    };

    if(is3DS) {
        let basket = BasketMgr.getCurrentBasket();
        payload['amount'] = buildAmountObjectFromBasket(basket);
        payload['billingAddress'] = buildBillingAddressObject(basket.getBillingAddress());
        payload['customer'] = buildCustomerObject(basket);
        payload['transactionDetails'] = {
            'authentication3DS': true
        };
    }

    return payload;
}

module.exports = 
{
    buildCredentialsRequest : buildCredentialsRequest,
    buildPrimaryRequest : buildPrimaryRequest,
    buildTokenRequest : buildTokenRequest,
    buildBalanceInquiryRequest : buildBalanceInquiryRequest,
    buildCancelPayload : buildCancelPayload,
    buildRecoveryPayload : buildRecoveryPayload
}