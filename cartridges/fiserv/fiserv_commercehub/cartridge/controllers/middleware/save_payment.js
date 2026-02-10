'use strict';

const Resource = require('dw/web/Resource');

const fiservConfig = require('*/cartridge/scripts/utils/commercehubConfig');
const fiservLogs = require("*/cartridge/scripts/utils/commercehubLogs");


function validForm(paymentForm)
{
    return typeof(paymentForm) !== "undefined" &&
        typeof(paymentForm.fiservCommercehubPaymentFields) !== "undefined" &&
        typeof(paymentForm.fiservCommercehubPaymentFields.commercehubSessionId) !== "undefined" &&
        typeof(paymentForm.fiservCommercehubPaymentFields.commercehubSessionId.value) !== "undefined" &&
        typeof(paymentForm.cardType) !== "undefined" &&
        typeof(paymentForm.cardType.htmlValue) !== "undefined"
}

function sendTokenizationRequest(tokenizationRequest)
{
    try {
        const fiservServices = require('*/cartridge/scripts/utils/commercehubServices');

        let tokenizationService = fiservServices.getService('CommercehubTokenization');
        let parsedResponse = fiservServices.callService(tokenizationService, tokenizationRequest);
        return parsedResponse;
    }
    catch(e)
    {
        throw new Error(Resource.msg('message.error.tokenization.failed', 'error', null))
    }
}

// Because the early tokenization call gets ran before form submission occurs, we pass the card type and session ID through as body parameters...
function savePaymentEarly(req, res, next)
{
    let earlyTokenPayload = req.form;
    let sessionId = earlyTokenPayload.sessionId;
    if(sessionId !== null && fiservConfig.getCommerceHubTokenization() && fiservConfig.getEarlyTokenization())
    {
        fiservLogs.logInfo(1, 'Initiating Early Tokenization call');
        return executeSavePaymentTransaction.call(this, req, res, next, earlyTokenPayload);
    }
    return next();
}

function savePayment(req, res, next) {
    if (fiservConfig.getCommerceHubStandaloneSpa())
    {
        fiservLogs.logInfo(1, 'Initiating Standalone Tokenization call');
        return executeSavePaymentTransaction.call(this, req, res, next);
    }
    return next();
}

function executeSavePaymentTransaction(req, res, next, earlyTokenPayload)
{
    const fiservHelper = require('*/cartridge/scripts/utils/fiservHelpers/primaryHelper');
    
    if(!fiservHelper.isCreditCardFiserv() || !fiservConfig.getCommerceHubTokenization())
    {
        return next();
    }

    const server = require('server');

    const BasketMgr = require('dw/order/BasketMgr');
    const Transaction = require('dw/system/Transaction');
    const URLUtils = require('dw/web/URLUtils');

    const fiservConstants = require('*/cartridge/fiservConstants/constants');
    const fiservRequestBuilder = require('*/cartridge/scripts/requests/request_builder');
    const fiservSavePaymentInstrument = require('*/cartridge/scripts/account/fiservAccount/save_payment_instrument');
    
    Transaction.begin();
    let tokenResponse = null;
    try {
        let sessionId;
        let cardType;
        if(earlyTokenPayload)
        {
            sessionId = earlyTokenPayload.sessionId;
            cardType = earlyTokenPayload.cardType;
        }
        else
        {
            let paymentForm = server.forms.getForm('creditCard');
            if (!validForm(paymentForm))
            {
                throw new Error(Resource.msg('message.error.tokenization.invalidForm', 'error', null));
            }
            sessionId = paymentForm.fiservCommercehubPaymentFields.commercehubSessionId.value;
            cardType = paymentForm.cardType.value;
        }

        let tokenRequest = fiservRequestBuilder.buildTokenRequest(sessionId);
        tokenResponse = sendTokenizationRequest(tokenRequest);
        let cardProduct = fiservHelper.secureTraversal(tokenResponse, fiservConstants.RESPONSE_PATHS.CARD_TYPE_TOKEN);
        if(cardProduct === 'PIN_ONLY')
        {
            throw new Error(Resource.msg('message.error.payment.pinonly', 'error', null));
        }

        // We are retrieving the card type either from the form or the request body in the case of early tokens, but we still prefer the value from CH if possible
        cardType = cardProduct ? cardProduct : cardType;

        const fiservCreditCardModel = require('*/cartridge/models/fiservCreditCardModel')
        let savedCard;
        if(req.currentCustomer.profile)
        {
            if(!earlyTokenPayload || earlyTokenPayload.customerTokenizeChoice === 'true')
            {
                savedCard = fiservSavePaymentInstrument.saveTokenizedCardWallet(req.currentCustomer.profile.customerNo, fiservCreditCardModel.getB2cCardType({ value : cardType }), tokenResponse);
            }
            else
            {
                savedCard = fiservSavePaymentInstrument.saveTokenizedCardBasket(req.currentCustomer.profile.customerNo, fiservCreditCardModel.getB2cCardType({ value : cardType }), tokenResponse);
            }
        }
        else
        {
            savedCard = fiservSavePaymentInstrument.saveTokenizedCardBasket(null, fiservCreditCardModel.getB2cCardType({ value : cardType }), tokenResponse);
        }

        if('duplicate' in savedCard)
        {
            if(earlyTokenPayload)
            {
                savedCard = savedCard.duplicate;
            }
            else
            {
                throw new Error(savedCard.errorMessage);
            }
        }

        let uuid = savedCard && savedCard.UUID ? savedCard.UUID : null;
        let basket = BasketMgr.getCurrentBasket();
        if(earlyTokenPayload && basket)
        {
            basket.custom.commercehubEarlyTokenUUID = uuid;
        }
        
        Transaction.commit();
        fiservLogs.logInfo(1, 'Tokenization Request Successful');
        let transactionId = fiservHelper.secureTraversal(tokenResponse, fiservConstants.RESPONSE_PATHS.TRANSACTION_ID);
        if (transactionId)
        {
            fiservLogs.logInfo(1, 'Transaction ID: ' + transactionId);
        }
        res.json({
            success: true,
            uuid: uuid,
            redirectUrl: URLUtils.url('PaymentInstruments-List').toString()
        });
        if(!earlyTokenPayload)
        {
            return this.emit('route:Complete', req, res);
        }
        else
        {
            return next();
        }
    } catch (_er) {
        Transaction.rollback();
        fiservLogs.logInfo(1, 'Failed to store card in wallet.');
        if(tokenResponse)
        {
            fiservLogs.logError(2, 'Transaction ID: ' + fiservHelper.secureTraversal(tokenResponse, fiservConstants.RESPONSE_PATHS.TRANSACTION_ID));
        }

        res.json({
            success: false,
            error: [_er.message]
        });
        return this.emit('route:Complete', req, res);
    }
}

module.exports = { savePayment : savePayment, savePaymentEarly : savePaymentEarly };