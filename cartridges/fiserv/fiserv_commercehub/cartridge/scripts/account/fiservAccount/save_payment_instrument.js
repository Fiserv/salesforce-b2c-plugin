'use strict';

const BasketMgr = require('dw/order/BasketMgr');
const CustomerMgr = require('dw/customer/CustomerMgr');
const Resource = require('dw/web/Resource');

const fiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");
const fiservConstants = require('*/cartridge/fiservConstants/constants');
const fiservHelper = require('*/cartridge/scripts/utils/fiservHelpers/primaryHelper');
const fiservLogs = require("*/cartridge/scripts/utils/commercehubLogs");


function canTokenize(customer) 
{
    return fiservConfig.getCommerceHubTokenization() && isValidCustomer(customer);
}

function isValidCustomer(customer) 
{
    return customer && customer.authenticated && customer.registered;
}

function shouldSavePaymentInstrument(customerNo, paymentInstrument)
{
    return (fiservConfig.getForcedBasketTokenization() || paymentInstrument.paymentTransaction.custom.tokenizeCard) &&
        customerNo &&
        canTokenize(CustomerMgr.getCustomerByCustomerNumber(customerNo));
}

function wasTokenizationSuccessful(chResponse)
{
    let token = fiservHelper.secureTraversal(chResponse, fiservConstants.RESPONSE_PATHS.PAYMENT_TOKEN);
    return token &&
        typeof(token.tokenData) !== "undefined" &&
        token.tokenResponseDescription === "SUCCESS";
}

function createMaskedCardNumber(last4)
{
    return last4.padStart(16, '*');
}

function validCardSource(chResponse)
{
    let card = fiservHelper.secureTraversal(chResponse, fiservConstants.RESPONSE_PATHS.CARD_SOURCE);
    return card &&
        typeof(card.last4) !== "undefined" &&
        typeof(card.expirationMonth) !== "undefined" &&
        typeof(card.expirationYear) !== "undefined";
}

function isDuplicateCard(profile, chResponse, isBasket)
{
    // Don't need to null check for token data as response was already a success
    let tokenData = chResponse.paymentTokens[0].tokenData;
    let expMonth = Number(chResponse.source.card.expirationMonth);
    let expYear = Number(chResponse.source.card.expirationYear);

    let paymentInstruments = null;
    if(typeof(profile.getWallet()) === "undefined" ||
        typeof(paymentInstruments = profile.getWallet().getPaymentInstruments()) === "undefined" ||
        paymentInstruments.length === 0
    ) {
        return false;
    }

    for(let i in paymentInstruments) {
        if(isBasket && paymentInstruments[i].custom.forcedTokenization)
        {
            continue;
        }

        if(paymentInstruments[i].getCreditCardToken() === tokenData &&
            paymentInstruments[i].getCreditCardExpirationMonth() === expMonth &&
            paymentInstruments[i].getCreditCardExpirationYear() === expYear
        ) {
            return paymentInstruments[i];
        }
    };
    return false;
}

/**
 * Save the credit card information to login account if save card option is selected
 * @param {dw.customer.Profile} profile - the customer's profile
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument - the payment instrument associated with the order
 * @param {Object} chResponse - Charges Response from Commerce Hub
 */
function createCustomerPaymentInstrument(profile, cardType, chResponse, isBasket, forcedTokenization, orderNo)
{
    const PaymentInstrument = require('dw/order/PaymentInstrument');

    if(isBasket)
    {
        return attachBasketTokenToBasket(chResponse, cardType, orderNo);
    }

    let storedPaymentInstrument = profile.getWallet().createPaymentInstrument(PaymentInstrument.METHOD_CREDIT_CARD);
    let name = chResponse.source.card.nameOnCard ? chResponse.source.card.nameOnCard : profile.firstName.concat(" ").concat(profile.lastName);
    storedPaymentInstrument.setCreditCardHolder(
        name
    );
    storedPaymentInstrument.setCreditCardNumber(
        createMaskedCardNumber(chResponse.source.card.last4)
    );
    storedPaymentInstrument.setCreditCardType(
        cardType
    );
    storedPaymentInstrument.setCreditCardExpirationMonth(
        parseInt(chResponse.source.card.expirationMonth)
    );
    storedPaymentInstrument.setCreditCardExpirationYear(
        parseInt(chResponse.source.card.expirationYear)
    );

    storedPaymentInstrument.setCreditCardToken(chResponse.paymentTokens[0].tokenData);

    // custom attributes
    storedPaymentInstrument.custom.commercehubCardType = cardType;
    storedPaymentInstrument.custom.commercehubCardIndicator = fiservHelper.secureTraversal(chResponse, fiservConstants.RESPONSE_PATHS.CARD_INDICATOR) ||
        fiservHelper.secureTraversal(chResponse, fiservConstants.RESPONSE_PATHS.CARD_INDICATOR_TOKEN);
    storedPaymentInstrument.custom.commercehubTokenSource = chResponse.paymentTokens[0].tokenSource;
    storedPaymentInstrument.custom.commercehubTokenResponseCode = chResponse.paymentTokens[0].tokenResponseCode;
    storedPaymentInstrument.custom.commercehubTokenResponseDescription = chResponse.paymentTokens[0].tokenResponseDescription;
    storedPaymentInstrument.custom.forcedTokenization = Boolean(forcedTokenization);
    
    if(forcedTokenization)
    {
        fiservLogs.logInfo(1, "New forced token stored in customer profile", orderNo);
    }
    else
    {
        fiservLogs.logInfo(1, "New token stored in customer profile", orderNo);
    }

    return storedPaymentInstrument;
}

function attachBasketTokenToBasket(chResponse, cardType, orderNo)
{
    const UUIDUtils = require("dw/util/UUIDUtils");

    let basket = BasketMgr.getCurrentBasket();
    if(!basket)
    {
        throw new Error(Resource.msg('message.error.tokenization.failed', 'error', null));
    }

    let storedPaymentInstrument = {
        name: chResponse.source.card.nameOnCard ? chResponse.source.card.nameOnCard : Resource.msg('display.html.token.guest.default', 'display', null),
        cardNumber: createMaskedCardNumber(chResponse.source.card.last4),
        cardType: cardType,
        commercehubCardType: cardType,
        expirationMonth: parseInt(chResponse.source.card.expirationMonth),
        expirationYear: parseInt(chResponse.source.card.expirationYear),
        cardIndicator: fiservHelper.secureTraversal(chResponse, fiservConstants.RESPONSE_PATHS.CARD_INDICATOR) ||
            fiservHelper.secureTraversal(chResponse, fiservConstants.RESPONSE_PATHS.CARD_INDICATOR_TOKEN),
        tokenData: chResponse.paymentTokens[0].tokenData,
        tokenSource: chResponse.paymentTokens[0].tokenSource,
        UUID: UUIDUtils.createUUID()
    }

    basket.custom.commercehubBasketToken = JSON.stringify(storedPaymentInstrument);

    fiservLogs.logInfo(1, "New basket token attached to basket", orderNo);

    return storedPaymentInstrument;
}

function savePaymentInstrument(customerNo, paymentInstrument, chResponse, orderNo)
{
    try {
        if (shouldSavePaymentInstrument(customerNo, paymentInstrument))
        {
            // customer isn't null here--already checked in shouldSavePaymentInstrument()
            let customer = CustomerMgr.getCustomerByCustomerNumber(customerNo);
            saveCard(
                customer.getProfile(),
                paymentInstrument.getCreditCardType(),
                chResponse,
                false,
                !paymentInstrument.paymentTransaction.custom.tokenizeCard,
                orderNo
            );
        }
    } catch (_er) {
        fiservLogs.logError(2, "Save Payment Instrument handling failed with: ".concat(_er.toString()), orderNo);
    }
}

function saveTokenizedCardWallet(customerNo, cardType, chResponse)
{
    if (!canTokenize(CustomerMgr.getCustomerByCustomerNumber(customerNo)))
    {
        throw new Error(Resource.msg('message.error.tokenization.invalidState', 'error', null));
    }
    
    // customer isn't null here--already checked in canTokenize()
    let customer = CustomerMgr.getCustomerByCustomerNumber(customerNo);
    return saveCard(customer.getProfile(), cardType, chResponse);
}

function saveTokenizedCardBasket(customerNo, cardType, chResponse)
{
    let profile = null;
    if(customerNo)
    {
        profile = CustomerMgr.getCustomerByCustomerNumber(customerNo).getProfile();
    }

    // Passes in null for the profile in the case that it is a guest basket token
    return saveCard(profile, cardType, chResponse, true);
}

// A null profile indicates that we are in a guest early tokenization flow
function saveCard(profile, cardType, chResponse, isBasket, forcedTokenization, orderNo)
{
    if(!cardType)
    {
        fiservLogs.logError(2, "No card type passed in for the saved payment", orderNo);
        throw new Error(Resource.msg('message.error.tokenization.failed', 'error', null));
    }

    if (!wasTokenizationSuccessful(chResponse))
    {
        fiservLogs.logError(2, "Failed tokenization by Commerce Hub", orderNo);
        throw new Error(Resource.msg('message.error.tokenization.failed', 'error', null));
    }

    if (!validCardSource(chResponse))
    {
        fiservLogs.logError(2, "Unable to locate payment card source in Commerce Hub response", orderNo);
        throw new Error(Resource.msg('message.error.tokenization.failed', 'error', null));
    }

    let basket = BasketMgr.getCurrentBasket();

    if(!isBasket && !forcedTokenization && basket && basket.custom.commercehubBasketToken)
    {
        let basketToken = JSON.parse(basket.custom.commercehubBasketToken);
        let tokenData = chResponse.paymentTokens[0].tokenData;
        let expMonth = Number(chResponse.source.card.expirationMonth);
        let expYear = Number(chResponse.source.card.expirationYear);

        if(basketToken.tokenData === tokenData && basketToken.expirationMonth === expMonth && basketToken.expirationYear === expYear)
        {
            basket.custom.commercehubBasketToken = null;
        }
    }

    let duplicate = null;
    if(profile && (duplicate = isDuplicateCard(profile, chResponse, isBasket)))
    {
        // Updated and return duplicate card if new request was not forced...
        if(duplicate.custom.forcedTokenization && !forcedTokenization)
        {
            duplicate.custom.forcedTokenization = false;
            fiservLogs.logInfo(1, "Forced token made visible in user profile", orderNo);
            return duplicate;
        }

        if(isBasket && basket)
        {
            basket.custom.commercehubBasketToken = null;
        }

        // Gonna choose to not throw an error here as there should be no issue with no new token being created
        fiservLogs.logInfo(1, "Duplicate card not stored.", orderNo);
        return { duplicate: duplicate, errorMessage: Resource.msg('message.error.tokenization.exists', 'error', null) };
    }

    return createCustomerPaymentInstrument(profile, cardType, chResponse, isBasket, forcedTokenization, orderNo)
}

module.exports = 
{
    savePaymentInstrument : savePaymentInstrument,
    saveTokenizedCardWallet : saveTokenizedCardWallet,
    saveTokenizedCardBasket : saveTokenizedCardBasket
}