let CustomerMgr = require('dw/customer/CustomerMgr');

function getCustomer(customerNo)
{
    return (CustomerMgr.getCustomerByCustomerNumber(customerNo));
}

function getPaymentInstrument(currentCustomer, storedPaymentMethodId) 
{
    let array = require('*/cartridge/scripts/util/array');
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
        var errors = [];
        errors.push("There was an error locating your stored payment card.");
        return { fieldErrors: [], serverErrors: errors, error: true };    
    }    
    
    let paymentInstrument = getPaymentInstrument(customer, storedPaymentUUID)
    if (!paymentInstrument)
    {
        var errors = [];
        errors.push("There was an error locating your stored payment card.");
        return { fieldErrors: [], serverErrors: errors, error: true };    
    }
    
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

    return viewData;
}

function getNewCardViewData(viewFormData, paymentForm)
{
    let viewData = getBaseViewData(viewFormData, paymentForm);
    // do not receive expiration month or year from tokenization response, so use dummy here
    viewData.paymentInformation.expirationMonth = { value: 99 };
    viewData.paymentInformation.expirationYear = { value: 9999 };
    viewData.paymentInformation.cardType = paymentForm.creditCardFields.cardType;
    viewData.paymentInformation.cardNumber = paymentForm.creditCardFields.cardNumber;
    viewData.paymentInformation.sessionId = paymentForm.fiservCommercehubPaymentFields.commercehubSessionId.value;
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
        var errors = [];
        errors.push("There was an error validating your payment card.");
        return { fieldErrors: [], serverErrors: errors, error: true };    
    }

    let maskedCard = paymentForm.creditCardFields.cardNumber.value;
    if(typeof(maskedCard) === "undefined" || maskedCard === null)
    {
        var errors = [];
        errors.push("There was an error validating your payment card.");
        return { fieldErrors: [], serverErrors: errors, error: true };    
    }

    let viewData = getNewCardViewData(viewFormData, paymentForm);
    return { error: false, viewData: viewData };    

}

function processForm(req, paymentForm, viewFormData) 
{
    let viewData = req.form.storedPaymentUUID ? getStoredCardFormResult(req.currentCustomer, req.form.storedPaymentUUID, paymentForm, viewFormData) : getNewCardFormResult(paymentForm, viewFormData)
    return viewData;
}

module.exports = 
{
    processForm : processForm
};