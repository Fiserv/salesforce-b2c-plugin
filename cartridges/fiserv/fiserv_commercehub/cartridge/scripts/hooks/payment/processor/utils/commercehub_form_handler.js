'use strict';

const BasketMgr = require('dw/order/BasketMgr');
const Resource = require('dw/web/Resource');

const fiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");
const fiservHelper = require('*/cartridge/scripts/utils/fiservHelpers/primaryHelper');
const fiservLogs = require("*/cartridge/scripts/utils/commercehubLogs");

function getCustomer(customerNo)
{
    return (require('dw/customer/CustomerMgr').getCustomerByCustomerNumber(customerNo));
}

function getPaymentInstrument(currentCustomer, storedPaymentMethodId) 
{
    const array = require('*/cartridge/scripts/util/array');
    
    let paymentInstruments = currentCustomer.getProfile().getWallet().getPaymentInstruments();
    let findById = (item) => 
    {
        return storedPaymentMethodId === item.UUID;
    };

    return array.find(paymentInstruments, findById);
}

function getStoredCardFormResult(currentCustomer, storedPaymentUUID, paymentForm, viewFormData)
{
    let customer = getCustomer(currentCustomer.profile.customerNo);
    if (!customer)
    {
        return cardErrorToken();
    }    
    
    let paymentInstrument = getPaymentInstrument(customer, storedPaymentUUID)
    if (!paymentInstrument)
    {
        // Check to see if the token is on the basket instead of in the wallet
        return getBasketStoredToken(paymentForm, viewFormData, storedPaymentUUID);
    }
    
    let viewData = getStoredCardViewData(paymentInstrument, viewFormData, paymentForm, storedPaymentUUID);
    return { error: false, viewData: viewData };
}

function getBasketStoredToken(paymentForm, viewFormData, storedPaymentUUID)
{
    let basket = BasketMgr.getCurrentBasket();
    if(!basket)
    {
        return cardError();
    }

    let storedPaymentInstrumentString = basket.custom.commercehubBasketToken;
    if(!storedPaymentInstrumentString)
    {
        return cardError();
    }
    let storedPaymentInstrument = JSON.parse(storedPaymentInstrumentString);
    if(!storedPaymentInstrument)
    {
        return cardError();
    }

    if(storedPaymentUUID !== storedPaymentInstrument.UUID)
    {
        return cardError();
    }

    let custom = {
        commercehubTokenSource: storedPaymentInstrument.tokenSource,
        commercehubCardType: storedPaymentInstrument.commercehubCardType,
        commercehubCardIndicator: storedPaymentInstrument.cardIndicator
    };
    let paymentInstrument = {
        custom: custom,
        creditCardType: storedPaymentInstrument.cardType,
        creditCardNumber: storedPaymentInstrument.cardNumber,
        creditCardExpirationMonth: storedPaymentInstrument.expirationMonth,
        creditCardExpirationYear: storedPaymentInstrument.expirationYear,
        creditCardToken: storedPaymentInstrument.tokenData
    };

    let viewData = getStoredCardViewData(paymentInstrument, viewFormData, paymentForm, storedPaymentUUID);
    return { error: false, viewData: viewData };
}

function getBaseViewData(viewFormData, paymentForm)
{
    return {
        paymentMethod: {
            value: paymentForm.paymentMethod.value,
            htmlName: paymentForm.paymentMethod.value
        },
        address: viewFormData.address,
        phone: viewFormData.phone,
        paymentInformation: {
            isCreditCard: true,
        }
    };
}

function getStoredCardViewData(paymentInstrument, viewFormData, paymentForm, storedPaymentUUID)
{
    let viewData = getBaseViewData(viewFormData, paymentForm);
    viewData.paymentInformation.cardType = { value : paymentInstrument.creditCardType };
    viewData.paymentInformation.cardNumber = { value : paymentInstrument.creditCardNumber };
    viewData.paymentInformation.maskedCardNumber = paymentInstrument.creditCardNumber;
    viewData.paymentInformation.expirationMonth = { value : paymentInstrument.creditCardExpirationMonth };
    viewData.paymentInformation.expirationYear = { value : paymentInstrument.creditCardExpirationYear };
    viewData.paymentInformation.creditCardToken = { value : paymentInstrument.creditCardToken };
    viewData.paymentInformation.tokenSource = { value : paymentInstrument.custom.commercehubTokenSource };
    viewData.paymentInformation.commercehubCardType = { value : paymentInstrument.custom.commercehubCardType };
    viewData.paymentInformation.commercehubCardIndicator = { value : paymentInstrument.custom.commercehubCardIndicator };
    
    let basket = BasketMgr.getCurrentBasket();
    if(fiservConfig.getTokenSecurityEnabled() && basket && basket.custom.commercehubEarlyTokenUUID !== storedPaymentUUID)
    {
        let sessionId = paymentForm.fiservCommercehubPaymentFields.commercehubSessionId.value;
        if(!sessionId)
        {
            fiservLogs.logError(2, "CVV missing for token payment instrument creation");
            throw new Error(Resource.msg('message.error.cvv.missing', 'error', null));
        }
        viewData.paymentInformation.sessionId = sessionId;
    }

    let authenticationId3DS = paymentForm.fiservCommercehubPaymentFields.authenticationId3DS

    if(authenticationId3DS && fiservConfig.get3DSEnabled())
    {
        viewData.paymentInformation.authenitcationId3DS = authenticationId3DS.value;
    }

    if(fiservConfig.getVerificationEnabled() && basket && basket.custom.commercehubEarlyTokenUUID !== storedPaymentUUID)
    {
        let verificationSessionID = paymentForm.fiservCommercehubPaymentFields.verificationSessionId.value;
        if(fiservConfig.getTokenSecurityEnabled() && (!verificationSessionID || !fiservHelper.validateSessionId(verificationSessionID)))
        {
            fiservLogs.logError(2, "Invalid verification session ID");
            throw new Error(Resource.msg('message.error.payment.validation', 'error', null));
        }

        const fiservRawRequestExcutor = require('*/cartridge/scripts/requests/rawRequestExecutions');
        const verificationResponse = fiservRawRequestExcutor.executeAccountVerification(true, { paymentInstrument: paymentInstrument, sessionId: verificationSessionID });

        if(verificationResponse.error)
        {
            return cardError();
        }
    }

    return viewData;
}

function getNewCardViewData(viewFormData, paymentForm)
{
    let viewData = getBaseViewData(viewFormData, paymentForm);
    // do not receive expiration month or year from tokenization response, so use dummy here
    viewData.paymentInformation.expirationMonth = { 'value': paymentForm.creditCardFields.expirationMonth.value };
    viewData.paymentInformation.expirationYear = { 'value': paymentForm.creditCardFields.expirationYear.value };
    viewData.paymentInformation.cardType = paymentForm.creditCardFields.cardType;
    viewData.paymentInformation.cardNumber = paymentForm.creditCardFields.cardNumber;
    viewData.paymentInformation.sessionId = paymentForm.fiservCommercehubPaymentFields.commercehubSessionId.value;
    viewData.paymentInformation.authenitcationId3DS = paymentForm.fiservCommercehubPaymentFields.authenticationId3DS.value;
    viewData.paymentInformation.maskedCardNumber = paymentForm.creditCardFields.cardNumber.value;
    viewData.paymentInformation.tokenizeCard = paymentForm.creditCardFields.saveCard.selected
    viewData.saveCard = paymentForm.creditCardFields.saveCard.selected;

    if(fiservConfig.getVerificationEnabled())
    {
        let verificationSessionID = paymentForm.fiservCommercehubPaymentFields.verificationSessionId.value;
        if(!verificationSessionID || !fiservHelper.validateSessionId(verificationSessionID))
        {
            fiservLogs.logError(2, "Invalid verification session ID");
            throw new Error(Resource.msg('message.error.payment.validation', 'error', null));
        }

        const fiservRawRequestExcutor = require('*/cartridge/scripts/requests/rawRequestExecutions');
        const verificationResponse = fiservRawRequestExcutor.executeAccountVerification(false, { sessionId: verificationSessionID });

        if(verificationResponse.error)
        {
            return cardError();
        }
    }

    return viewData;
}

function getNewCardFormResult(paymentForm, viewFormData)
{
    let sessionId = paymentForm.fiservCommercehubPaymentFields.commercehubSessionId.value;
    if(!fiservHelper.validateSessionId(sessionId))
    {
        return cardError();
    }

    let maskedCard = paymentForm.creditCardFields.cardNumber.value;
    if(typeof(maskedCard) === "undefined" || maskedCard === null)
    {
        return cardError();
    }

    let viewData = getNewCardViewData(viewFormData, paymentForm);
    return { error: false, viewData: viewData };    

}

function processForm(req, paymentForm, viewFormData) 
{
    let viewData;
    let tokenUUID = paymentForm.fiservCommercehubPaymentFields.commercehubTokenUUID.value;
    if(tokenUUID)
    {
        const isLoggedIn = !!(req.currentCustomer
            && req.currentCustomer.raw
            && req.currentCustomer.raw.authenticated);

        if(isLoggedIn)
        {
            viewData = getStoredCardFormResult(req.currentCustomer, tokenUUID, paymentForm, viewFormData);
        }
        else
        {
            viewData = getBasketStoredToken(paymentForm, viewFormData, tokenUUID);
        }
    }
    else
    {
        viewData = getNewCardFormResult(paymentForm, viewFormData);
    }

    const Transaction = require('dw/system/Transaction');

    Transaction.wrap(() => {
        let basket = BasketMgr.getCurrentBasket();
        if(basket)
        {
            basket.custom.commercehubEarlyTokenUUID = null;
        }
    });

    return viewData;
}

function cardError()
{
    let errors = [];
    errors.push(Resource.msg('message.error.payment.validation', 'error', null));
    return { fieldErrors: [], serverErrors: errors, error: true };
}

function cardErrorToken()
{
    let errors = [];
    errors.push(Resource.msg('message.error.payment.retrieval', 'error', null));
    return { fieldErrors: [], serverErrors: errors, error: true };
}

module.exports = 
{
    processForm : processForm
};