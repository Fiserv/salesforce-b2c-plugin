let CustomerMgr = require('dw/customer/CustomerMgr');
let PaymentInstrument = require('dw/order/PaymentInstrument');
const FiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");
const FiservLogs = require("*/cartridge/scripts/utils/commercehubLogs");

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
    return paymentInstrument.paymentTransaction.custom.tokenizeCard && 
        customerNo &&
        canTokenize(CustomerMgr.getCustomerByCustomerNumber(customerNo));
}

function wasTokenizationSuccessful(chResponse)
{
    return typeof(chResponse.paymentTokens) !== "undefined" &&
        typeof(chResponse.paymentTokens[0]) !== "undefined" &&
        typeof(chResponse.paymentTokens[0].tokenData) !== "undefined" &&
        chResponse.paymentTokens[0].tokenResponseDescription === "SUCCESS";
}

function createMaskedCardNumber(last4)
{
    return last4.padStart(16, '*');
}

function validCardSource(chResponse)
{
    return typeof(chResponse.source) !== "undefined" && 
        typeof(chResponse.source.card) !== "undefined" && 
        typeof(chResponse.source.card.last4) !== "undefined" &&
        typeof(chResponse.source.card.expirationMonth) !== "undefined" &&
        typeof(chResponse.source.card.expirationYear) !== "undefined";
}

/**
 * Save the credit card information to login account if save card option is selected
 * @param {dw.customer.Profile} profile - the customer's profile
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument - the payment instrument associated with the order
 * @param {Object} chResponse - Charges Response from Commerce Hub
 */
function createCustomerPaymentInstrument(profile, cardType, chResponse)
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
    storedPaymentInstrument.custom.commercehubTokenSource = chResponse.paymentTokens[0].tokenSource;
    storedPaymentInstrument.custom.commercehubTokenResponseCode = chResponse.paymentTokens[0].tokenResponseCode;
    storedPaymentInstrument.custom.commercehubTokenResponseDescription = chResponse.paymentTokens[0].tokenResponseDescription;

    return storedPaymentInstrument;
}

function savePaymentInstrument(customerNo, paymentInstrument, chResponse)
{
    try {
        if (shouldSavePaymentInstrument(customerNo, paymentInstrument))
        {
            // customer isn't null here--already checked in shouldSavePaymentInstrument()
            let customer = CustomerMgr.getCustomerByCustomerNumber(customerNo);
            saveCard(customer.getProfile(), paymentInstrument.getCreditCardType(), chResponse)
        }
    } catch (_er) {
        FiservLogs.error_log("Save Payment Instrument handling failed with: ".concat(_er.toString()));
    }
}

function saveTokenizedCard(customerNo, cardType, chResponse)
{
        if (!canTokenize(CustomerMgr.getCustomerByCustomerNumber(customerNo)))
        {
            throw new Error("Cannot save tokenized card because of configuration or customer status.");
        }
        
        // customer isn't null here--already checked in canTokenize()
        let customer = CustomerMgr.getCustomerByCustomerNumber(customerNo);
        saveCard(customer.getProfile(), cardType, chResponse)

}

function saveCard(profile, cardType, chResponse)
{
    if (!wasTokenizationSuccessful(chResponse))
    {
        FiservLogs.error_log("Failed tokenization by Commerce Hub");
        throw new Error("Commerce Hub tokenization failed.");
    }

    if (!validCardSource(chResponse))
    {
        FiservLogs.error_log("Unable to locate payment card source in Commerce Hub response");
        throw new Error("Commerce Hub tokenization failed.");
    }

    createCustomerPaymentInstrument(profile, cardType, chResponse)
}

module.exports = 
{
    savePaymentInstrument : savePaymentInstrument,
    saveTokenizedCard : saveTokenizedCard
}