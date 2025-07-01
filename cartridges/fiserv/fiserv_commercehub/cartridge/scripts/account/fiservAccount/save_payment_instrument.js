let Resource = require('dw/web/Resource');
let CustomerMgr = require('dw/customer/CustomerMgr');
let PaymentInstrument = require('dw/order/PaymentInstrument');
const FiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");
const FiservLogs = require("*/cartridge/scripts/utils/commercehubLogs");
let fiservHelper = require('*/cartridge/scripts/utils/fiservHelper');
let constants = require('*/cartridge/fiservConstants/constants');

function canTokenize(customer) 
{
    return FiservConfig.getCommerceHubTokenization() && isValidCustomer(customer);
}

function isValidCustomer(customer) 
{
    return customer && customer.authenticated && customer.registered;
}

function shouldSavePaymentInstrument(customerNo, paymentInstrument)
{
    return (FiservConfig.getCommerceHubTokenizationStrategy() || paymentInstrument.paymentTransaction.custom.tokenizeCard) &&
        customerNo &&
        canTokenize(CustomerMgr.getCustomerByCustomerNumber(customerNo));
}

function wasTokenizationSuccessful(chResponse)
{
    let token = fiservHelper.secureTraversal(chResponse, constants.RESPONSE_PATHS.PAYMENT_TOKEN);
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
    let card = fiservHelper.secureTraversal(chResponse, constants.RESPONSE_PATHS.CARD_SOURCE);
    return card &&
        typeof(card.last4) !== "undefined" &&
        typeof(card.expirationMonth) !== "undefined" &&
        typeof(card.expirationYear) !== "undefined";
}

function isDuplicateCard(profile, chResponse)
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
function createCustomerPaymentInstrument(profile, cardType, chResponse, forcedTokenization, orderNo)
{
    var storedPaymentInstrument = profile.getWallet().createPaymentInstrument(PaymentInstrument.METHOD_CREDIT_CARD);

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
    storedPaymentInstrument.custom.forcedTokenization = Boolean(forcedTokenization);
    storedPaymentInstrument.custom.commercehubCardType = fiservHelper.secureTraversal(chResponse, constants.RESPONSE_PATHS.CARD_TYPE) ||
        fiservHelper.secureTraversal(chResponse, constants.RESPONSE_PATHS.CARD_TYPE_TOKEN);
    storedPaymentInstrument.custom.commercehubCardIndicator = fiservHelper.secureTraversal(chResponse, constants.RESPONSE_PATHS.CARD_INDICATOR) ||
        fiservHelper.secureTraversal(chResponse, constants.RESPONSE_PATHS.CARD_INDICATOR_TOKEN);
    storedPaymentInstrument.custom.commercehubTokenSource = chResponse.paymentTokens[0].tokenSource;
    storedPaymentInstrument.custom.commercehubTokenResponseCode = chResponse.paymentTokens[0].tokenResponseCode;
    storedPaymentInstrument.custom.commercehubTokenResponseDescription = chResponse.paymentTokens[0].tokenResponseDescription;

    if(Boolean(forcedTokenization))
    {
        FiservLogs.logInfo(1, "New forced token stored", orderNo);
    }
    else
    {
        FiservLogs.logInfo(1, "New token stored", orderNo);
    }

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
                !paymentInstrument.paymentTransaction.custom.tokenizeCard,
                orderNo
            );
        }
    } catch (_er) {
        FiservLogs.logError(2, "Save Payment Instrument handling failed with: ".concat(_er.toString()), orderNo);
    }
}

function saveTokenizedCard(customerNo, cardType, chResponse)
{
        if (!canTokenize(CustomerMgr.getCustomerByCustomerNumber(customerNo)))
        {
            throw new Error(Resource.msg('message.error.tokenization.invalidState', 'error', null));
        }
        
        // customer isn't null here--already checked in canTokenize()
        let customer = CustomerMgr.getCustomerByCustomerNumber(customerNo);
        return saveCard(customer.getProfile(), cardType, chResponse)
}

function saveCard(profile, cardType, chResponse, forcedTokenization, orderNo)
{
    if (!wasTokenizationSuccessful(chResponse))
    {
        FiservLogs.logError(2, "Failed tokenization by Commerce Hub", orderNo);
        throw new Error(Resource.msg('message.error.tokenization.failed', 'error', null));
    }

    if (!validCardSource(chResponse))
    {
        FiservLogs.logError(2, "Unable to locate payment card source in Commerce Hub response", orderNo);
        throw new Error(Resource.msg('message.error.tokenization.failed', 'error', null));
    }

    let duplicate = null;
    if(duplicate = isDuplicateCard(profile, chResponse))
    {
        // Updated and return duplicate card if new request was not forced...
        if(duplicate.custom.forcedTokenization && !Boolean(forcedTokenization))
        {
            duplicate.custom.forcedTokenization = false;
            FiservLogs.logInfo(1, "Forced token made visible in user profile", orderNo);
            return duplicate;
        }

        // Gonna choose to not throw an error here as there should be no issue with no new token being created
        FiservLogs.logInfo(1, "Duplicate card not stored.", orderNo);
        return { duplicate: duplicate, errorMessage: Resource.msg('message.error.tokenization.exists', 'error', null) };
    }

    return createCustomerPaymentInstrument(profile, cardType, chResponse, forcedTokenization, orderNo)
}

module.exports = 
{
    savePaymentInstrument : savePaymentInstrument,
    saveTokenizedCard : saveTokenizedCard
}