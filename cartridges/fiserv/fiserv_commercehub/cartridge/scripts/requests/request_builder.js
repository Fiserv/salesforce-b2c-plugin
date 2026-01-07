'use strict';

const BasketMgr = require('dw/order/BasketMgr');
const OrderMgr = require('dw/order/OrderMgr');
const Resource = require('dw/web/Resource');
const UUIDUtils = require("dw/util/UUIDUtils");

const fiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");
const fiservConstants = require('*/cartridge/fiservConstants/constants');
const fiservLogs = require("*/cartridge/scripts/utils/commercehubLogs");

let orderNo = null;
let showBuilders = true;


function buildMerchantDetailsObject()
{
    let merchantDetails = {};
    merchantDetails["merchantId"] = fiservConfig.getCommerceHubMerchantId();
    merchantDetails["terminalId"] = fiservConfig.getCommerceHubTerminalId();
    merchantDetails["merchantPartner"] = buildMerchantPartnerField();

    if(showBuilders)
        fiservLogs.logDebug(3, "Merchant Details Data Builder:\n" + JSON.stringify(merchantDetails,null,2), orderNo);
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
    merchantPartner["versionNumber"] = fiservConstants.VERSION;
    merchantPartner["integrator"] = fiservConfig.getCommerceHubMerchantPartnerIntegrator();

    return merchantPartner;
}

function buildTransactionInteractionObject()
{
    let txnInteraction = {};
    txnInteraction["origin"] = fiservConstants.ECOM_ORIGIN;
    txnInteraction["eciIndicator"] = fiservConstants.ECI_INDICATOR;
    txnInteraction["posConditionCode"] = fiservConstants.POS_CONDITION_CODE;

    if(showBuilders)
        fiservLogs.logDebug(3, "Transaction Interaction Data Builder:\n" + JSON.stringify(txnInteraction,null,2), orderNo);
    return txnInteraction;
}

function buildChargesTransactionDetailsObject(capture, tokenize)
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
    txnDetails["merchantTransactionId"] = UUIDUtils.createUUID();

    if(showBuilders)
        fiservLogs.logDebug(3, "Transaction Details Data Builder:\n" + JSON.stringify(txnDetails,null,2), orderNo);
    return txnDetails;
}

function buildSourceObject(paymentInstrument)
{
    return paymentInstrument.creditCardToken ? buildTokenSourceObject(paymentInstrument) : buildSessionSourceObject(paymentInstrument.paymentTransaction.custom.commercehubSessionId);
}

function buildTokenSourceObject(paymentInstrument)
{
    let source = {};
    source["sourceType"] = fiservConstants.TOKEN_SOURCE_TYPE;
    source["tokenData"] = paymentInstrument.creditCardToken;
    source["tokenSource"] = paymentInstrument.custom.commercehubTokenSource;
    source["declineDuplicates"] = true;

    source["card"] = {
        // month must be two digits
        "expirationMonth": paymentInstrument.creditCardExpirationMonth.toString().padStart(2, '0'),
        "expirationYear": paymentInstrument.creditCardExpirationYear.toString()
    }

    if(showBuilders)
        fiservLogs.logDebug(3, "Token Source Data Builder:\n" + JSON.stringify(source,null,2), orderNo);
    return source;
}

function buildSessionSourceObject(sessionId)
{
    let source = {};
    source["sourceType"] = fiservConstants.SESSION_SOURCE_TYPE;
    source["sessionId"] = sessionId;

    if(showBuilders)
        fiservLogs.logDebug(3, "Session Source Data Builder:\n" + JSON.stringify(source,null,2), orderNo);
    return source;
}

function buildAmountObject(paymentInstrument)
{
    let amount = {};
    amount["total"] = paymentInstrument.paymentTransaction.amount.getValue();
    amount["currency"] = paymentInstrument.paymentTransaction.amount.getCurrencyCode();

    if(showBuilders)
        fiservLogs.logDebug(3, "Amount Data Builder:\n" + JSON.stringify(amount,null,2), orderNo);
    return amount;
}

function buildAmountObjectFromBasket(basketObject) {
    const fiservGiftHelper = require('*/cartridge/scripts/utils/fiservHelpers/giftHelper');
    
    let amount = {}
    amount['total'] = fiservGiftHelper.retreiveNonGiftChargeAmount(basketObject);
    amount['currency'] = basketObject.getCurrencyCode();

    if(showBuilders)
        fiservLogs.logDebug(3, "Amount Data Builder:\n" + JSON.stringify(amount,null,2), orderNo);
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
        fiservLogs.logDebug(3, "Billing Address Data Builder:\n" + JSON.stringify(billingAddress,null,2), orderNo);
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
        fiservLogs.logDebug(3, "Customer Data Builder:\n" + JSON.stringify(customer,null,2), orderNo);
    return customer;
}

function build3DSObject(paymentInstrument)
{
    let additionalData3DS = {};

    additionalData3DS['authenticationTransactionId'] = paymentInstrument.paymentTransaction.custom.commercehub3DSAuthenitcationId;

    if(showBuilders)
        fiservLogs.logDebug(3, "3DS Data Builder:\n" + JSON.stringify(additionalData3DS,null,2), orderNo);
    return additionalData3DS;
}

function buildPrimaryPaymentChargesRequest(paymentInstrument, paymentAction)
{
    if(paymentInstrument.creditCardToken)
    {
        fiservLogs.logInfo(1, 'Initiating Token ' + paymentAction[0] + paymentAction.substring(1).toLowerCase() + ' Transaction', orderNo);
    }
    else
    {
        fiservLogs.logInfo(1, 'Initiating Session ' + paymentAction[0] + paymentAction.substring(1).toLowerCase() + ' Transaction', orderNo);
    }

    let req = {};
    let tokenize = false;
    if(fiservConfig.getCommerceHubTokenization() && !paymentInstrument.creditCardToken)
    {
        if(fiservConfig.getCommerceHubTokenizationStrategy())
        {
            tokenize = true;
        }
        else if(!fiservConfig.getEarlyTokenization())
        {
            tokenize = paymentInstrument.paymentTransaction.custom.tokenizeCard;
        }
    }

    req["amount"] = buildAmountObject(paymentInstrument);
    req["source"] = buildSourceObject(paymentInstrument);
    req["transactionDetails"] = buildChargesTransactionDetailsObject(paymentAction === fiservConstants.COMMERCEHUB_SALE_ACTION, tokenize);
    req["transactionInteraction"] = buildTransactionInteractionObject();
    req["merchantDetails"] = buildMerchantDetailsObject();
    let order = OrderMgr.getOrder(orderNo)
    req["billingAddress"] = buildBillingAddressObject(order.getBillingAddress());
    req["customer"] = buildCustomerObject(order);

    if(fiservConfig.get3DSEnabled())
    {
        req['additionalData3DS'] = build3DSObject(paymentInstrument);
    }

    return req;
}

function buildGiftChargesRequest(paymentInstrument, paymentAction)
{
    fiservLogs.logInfo(1, 'Initiating Gift Card ' + paymentAction[0] + paymentAction.substring(1).toLowerCase() + ' Transaction', orderNo);

    let req = {};

    req["amount"] = buildAmountObject(paymentInstrument);
    req["source"] = buildSourceObject(paymentInstrument);
    req["transactionDetails"] = buildChargesTransactionDetailsObject(paymentAction === fiservConstants.COMMERCEHUB_SALE_ACTION, null);
    req["transactionInteraction"] = buildTransactionInteractionObject();
    req["merchantDetails"] = buildMerchantDetailsObject();
    let order = OrderMgr.getOrder(orderNo)
    req["billingAddress"] = buildBillingAddressObject(order.getBillingAddress());
    req["customer"] = buildCustomerObject(order);

    return req;
}

function buildChargesRequest(orderNumber, paymentInstrument)
{
    orderNo = orderNumber;
    let paymentAction = paymentInstrument.paymentTransaction.custom.paymentAction;
    if(paymentAction === fiservConstants.COMMERCEHUB_AUTH_ACTION || paymentAction === fiservConstants.COMMERCEHUB_SALE_ACTION)
    {
        if(paymentInstrument.paymentMethod === paymentInstrument.METHOD_CREDIT_CARD || paymentInstrument.paymentMethod === fiservConstants.PAYMENT_METHOD_LIST.COMMERCEHUB_APPLEPAY_PAYMENT_METHOD)
            return buildPrimaryPaymentChargesRequest(paymentInstrument, paymentAction);
        else if(paymentInstrument.paymentMethod === fiservConstants.PAYMENT_METHOD_LIST.COMMERCEHUB_GIFT_PAYMENT_METHOD)
            return buildGiftChargesRequest(paymentInstrument, paymentAction);
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
    fiservLogs.logInfo(1, 'Initiating Card Tokenization', orderNo);
    let req = {};
    req['source'] = buildSessionSourceObject(sessionId);
    req["merchantDetails"] = buildMerchantDetailsObject();

    return req;
}

function buildBalanceInquiryRequest(sessionId, currencyCode)
{
    fiservLogs.logInfo(1, 'Initiating Balance Inquiry');
    let req = {};
    req['balance'] = {
        'currency': currencyCode
    };
    fiservLogs.logDebug(3, "Balance Data Builder:\n" + JSON.stringify(req["balance"],null,2), orderNo);
    req['source'] = buildSessionSourceObject(sessionId);
    req['merchantDetails'] = buildMerchantDetailsObject();
    if(fiservConfig.getCommerceHubGiftSecurityEnabled())
    {
        req['additionalDataCommon'] = {
            "additionalData": {
                "securityCodeType": "SCV"
            }
        };
        fiservLogs.logDebug(3, "Additional Data Common Data Builder:\n" + JSON.stringify(req["additionalDataCommon"],null,2), orderNo);
    }

    return req;
}

function buildCancelPayload(orderNumber, transactionId)
{
    orderNo = orderNumber;
    fiservLogs.logInfo(1, 'Initiating Cancel Transaction for Transaction ID: ' + transactionId, orderNo);
    let req = {};
    req["referenceTransactionDetails"] = {
        "referenceTransactionId": transactionId
    };
    fiservLogs.logDebug(3, "Reference Transaction Details Data Builder:\n" + JSON.stringify(req["referenceTransactionDetails"],null,2), orderNo);
    req["transactionDetails"] = {
        merchantTransactionId: UUIDUtils.createUUID()
    };
    fiservLogs.logDebug(3, "Transaction Details Data Builder:\n" + JSON.stringify(req["transactionDetails"],null,2), orderNo);
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
    fiservLogs.logDebug(3, "Reference Transaction Details Data Builder:\n" + JSON.stringify(req["referenceTransactionDetails"],null,2), orderNo);
    req["merchantDetails"] = buildMerchantDetailsObject();

    return req;
}

function buildOrdersTransactionDetailsObject(paymentAction)
{
    let txnDetails = {};
    txnDetails["operationType"] = paymentAction === fiservConstants.COMMERCEHUB_AUTH_ACTION ? "AUTHORIZE" : "CAPTURE";
    txnDetails["accountVerification"] = false;
    txnDetails["merchantOrderId"] = orderNo;
    txnDetails["merchantTransactionId"] = UUIDUtils.createUUID();

    if(showBuilders)
        fiservLogs.logDebug(3, "Transaction Details Data Builder:\n" + JSON.stringify(txnDetails,null,2), orderNo);
    return txnDetails;
}

function buildOrderRequest(orderNumber, paymentInstrument)
{
    orderNo = orderNumber;
    let paymentAction = paymentInstrument.paymentTransaction.custom.paymentAction;
    if(paymentAction === fiservConstants.COMMERCEHUB_AUTH_ACTION || paymentAction === fiservConstants.COMMERCEHUB_SALE_ACTION)
    {
        fiservLogs.logInfo(1, 'Initiating Order ' + paymentAction[0] + paymentAction.substring(1).toLowerCase() + ' Transaction', orderNo);
        let req = {};

        req["transactionDetails"] = buildOrdersTransactionDetailsObject(paymentAction);
        req["referenceTransactionDetails"] = {
            "referenceOrderId": paymentInstrument.paymentTransaction.custom.commercehubOrderId
        };
        req["merchantDetails"] = buildMerchantDetailsObject();

        return req;
    }
    else
    {
        return {};
    }
}

function buildCredentialsRequest(hostURL, baseUrl, credentialsForm)
{
    showBuilders = false;

    let payload = {
        'domains' : [
            { 'url': baseUrl }
        ],
        'merchantDetails' : {
            'merchantId' : fiservConfig.getCommerceHubMerchantId(),
            'terminalId' : fiservConfig.getCommerceHubTerminalId()
        },
        'checkoutInteractions': {
            'expiresInMinutes': fiservConfig.getCommercehubSessionLifetime()
        }
    };

    let requestPurpose;
    if(credentialsForm)
        requestPurpose = credentialsForm.requestPurpose;
    if(requestPurpose !== "STANDALONE")
    {
        let basket = BasketMgr.getCurrentBasket();
        if(!basket)
        {
            throw new Error(Resource.msg('message.error.generic.credentialsFailure', 'error', null));
        }
        payload['amount'] = buildAmountObjectFromBasket(basket);
        payload['billingAddress'] = buildBillingAddressObject(basket.getBillingAddress());
        payload['customer'] = buildCustomerObject(basket);
        if(fiservConfig.get3DSEnabled() && fiservConfig.getCommerceHubTokenization() && credentialsForm.threeDSToken)
        {
            let pi;
            let profile = basket.getCustomer().getProfile();
            if(profile)
            {
                let paymentInstruments = profile.getWallet().getPaymentInstruments();
                for(let i in paymentInstruments)
                {
                    if(paymentInstruments[i].UUID === credentialsForm.threeDSToken)
                    {
                        pi = paymentInstruments[i];
                        break;
                    }
                }
            }
            else if(fiservConfig.getEarlyTokenization() && fiservConfig.getEarlyTokenizationGuest() && basket.custom.commercehubGuestToken)
            {
                let guestPI = JSON.parse(basket.custom.commercehubGuestToken);
                if(guestPI.UUID === credentialsForm.threeDSToken)
                {
                    pi = {
                        creditCardToken: guestPI.tokenData,
                        creditCardExpirationMonth: guestPI.expirationMonth,
                        creditCardExpirationYear: guestPI.expirationYear,
                        custom: {
                            commercehubTokenSource: guestPI.tokenSource
                        }
                    }
                }
            }

            if(!pi)
            {
                throw new Error(Resource.msg('message.error.scc.threeDSFailCheckout', 'error', null));
            }
            
            payload['source'] = buildTokenSourceObject(pi);
        }
        if(fiservConfig.getCommerceHubPayPalEnabled() && fiservConfig.getCommerceHubPayPalVaultingEnabled() && basket.customer.profile)
        {
            payload['providerCredentials'] = [
                {
                    "credentialType": "PAYPAL",
                    "attributes": [
                        {
                            "key": "customerId",
                            "value": basket.customer.profile.custom.commercehubCustomerId
                        }
                    ]
                }
            ]
        }
        if(fiservConfig.getCommerceHubApplePayEnabled())
        {
            let orderData = {};
            let basket = BasketMgr.getCurrentBasket();
            let site = require('dw/system/Site').getCurrent();
            if(basket)
            {
                let itemDetails = [];
                let itemCount = 0;
                basket.getAllProductLineItems().toArray().forEach((item) => {
                    itemCount += item.quantityValue;

                    let itemData = {
                        itemNumber: item.position,
                        itemType: "PRODUCT",
                        itemName: item.productName,
                        itemDescription: item.lineItemText,
                        quantity: item.quantityValue,
                        amountComponents: {
                            unitPrice: item.basePrice.value,
                            shippingAmount: 0,
                            taxAmounts: [
                                {
                                    taxType: item.taxClassID,
                                    taxAmount: item.tax.value
                                }
                            ],
                        }
                    }
                    itemDetails.push(itemData)
                });

                let shippingData = {
                    itemNumber: basket.getAllProductLineItems().toArray().length + 1,
                    itemType: "SHIPPING",
                    itemName: Resource.msg('label.order.shipping.cost', 'confirmation', null),
                    itemDescription: Resource.msg('label.order.shipping.cost', 'confirmation', null),
                    quantity: 1,
                    amountComponents: {
                        unitPrice: basket.shippingTotalPrice.value,
                        shippingAmount: 0,
                        taxAmounts: [
                            {
                                taxType: Resource.msg('label.order.sales.tax', 'confirmation', null),
                                taxAmount: basket.shippingTotalTax.value
                            }
                        ],
                    }
                };
                itemDetails.push(shippingData);

                orderData['itemCount'] = itemCount;
                orderData['itemDetails'] = itemDetails;
                orderData['orderDate'] = basket.getCreationDate().toISOString().substring(0,10);
            }
            payload['orderData'] = orderData;

            payload["dynamicDescriptors"] = {
                "merchantName": site.name,
                "address": {
                    "country": site.preferences.custom.countryCode.value
                }
            }

            payload["additionalDataCommon"] = {
                "additionalData": {
                    "ecomURL": hostURL
                }
            }
        }
    }

    return payload;
}

module.exports =
{
    buildCredentialsRequest : buildCredentialsRequest,
    buildChargesRequest : buildChargesRequest,
    buildTokenRequest : buildTokenRequest,
    buildBalanceInquiryRequest : buildBalanceInquiryRequest,
    buildCancelPayload : buildCancelPayload,
    buildRecoveryPayload : buildRecoveryPayload,
    buildOrderRequest : buildOrderRequest
}