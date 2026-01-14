'use strict';


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
        let errors = [];
        errors.push("There was an error locating your stored payment card.");
        return { fieldErrors: [], serverErrors: errors, error: true };    
    }    
    
    let paymentInstrument = getPaymentInstrument(customer, storedPaymentUUID)
    if (!paymentInstrument)
    {
        let errors = [];
        errors.push("There was an error locating your stored payment card.");
        return { fieldErrors: [], serverErrors: errors, error: true };    
    }
    
    let viewData = getStoredCardViewData(paymentInstrument, viewFormData, paymentForm);
    return { error: false, viewData: viewData };
}

function getGuestCardFormResult(paymentForm, viewFormData)
{
    const BasketMgr = require('dw/order/BasketMgr');

    let basket = BasketMgr.getCurrentBasket();
    if(!basket)
    {
        return  { error: true };
    }

    let storedPaymentInstrumentString = basket.custom.commercehubGuestToken;
    if(!storedPaymentInstrumentString)
    {
        return  { error: true };
    }
    let storedPaymentInstrument = JSON.parse(storedPaymentInstrumentString);
    if(!storedPaymentInstrument)
    {
        return  { error: true };
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

    let viewData = getStoredCardViewData(paymentInstrument, viewFormData, paymentForm);
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

function getStoredCardViewData(paymentInstrument, viewFormData, paymentForm)
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
    
    const fiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");
    if(fiservConfig.getTokenSecurityEnabled())
    {
        viewData.paymentInformation.sessionId = paymentForm.fiservCommercehubPaymentFields.commercehubSessionId.value;
    }

    let authenticationId3DS = paymentForm.fiservCommercehubPaymentFields.authenticationId3DS

    if(authenticationId3DS && fiservConfig.get3DSEnabled())
    {
        viewData.paymentInformation.authenitcationId3DS = authenticationId3DS.value;
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

    return viewData;
}

function getNewCardFormResult(paymentForm, viewFormData)
{
    let sessionId = paymentForm.fiservCommercehubPaymentFields.commercehubSessionId.value;
    let guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    if(sessionId === undefined || !sessionId.match(guidRegex))
    {
        let errors = [];
        errors.push("There was an error validating your payment card.");
        return { fieldErrors: [], serverErrors: errors, error: true };    
    }

    let maskedCard = paymentForm.creditCardFields.cardNumber.value;
    if(typeof(maskedCard) === "undefined" || maskedCard === null)
    {
        let errors = [];
        errors.push("There was an error validating your payment card.");
        return { fieldErrors: [], serverErrors: errors, error: true };    
    }

    let viewData = getNewCardViewData(viewFormData, paymentForm);
    return { error: false, viewData: viewData };    

}

function processForm(req, paymentForm, viewFormData) 
{
    let viewData = req.form.storedPaymentUUID ? getStoredCardFormResult(req.currentCustomer, req.form.storedPaymentUUID, paymentForm, viewFormData) :
        (paymentForm.fiservCommercehubPaymentFields.commercehubSessionId.value ? getNewCardFormResult(paymentForm, viewFormData) :
        getGuestCardFormResult(paymentForm, viewFormData));
    return viewData;
}

module.exports = 
{
    processForm : processForm
};