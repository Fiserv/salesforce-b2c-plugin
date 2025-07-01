"use strict";

let server = require('server');
let Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
let URLUtils = require('dw/web/URLUtils');
let fiservHelper = require('*/cartridge/scripts/utils/fiservHelper');
let commercehubConfig = require('*/cartridge/scripts/utils/commercehubConfig');
const FiservLogs = require("*/cartridge/scripts/utils/commercehubLogs");
let FiservServices = require('*/cartridge/scripts/utils/commercehubServices');
let requestBuilder = require('*/cartridge/scripts/requests/request_builder');
let savePaymentInstrument = require('*/cartridge/scripts/account/fiservAccount/save_payment_instrument');
let constants = require('*/cartridge/fiservConstants/constants');



function validForm(paymentForm)
{
    return typeof(paymentForm) !== "undefined" &&
        typeof(paymentForm.fiservCommercehubPaymentFields) !== "undefined" &&
        typeof(paymentForm.fiservCommercehubPaymentFields.commercehubSessionId) !== "undefined" &&
        typeof(paymentForm.fiservCommercehubPaymentFields.commercehubSessionId.value) !== "undefined" &&
        fiservHelper.validSessionId(paymentForm.fiservCommercehubPaymentFields.commercehubSessionId.value) &&
        typeof(paymentForm.cardType) !== "undefined" &&
        typeof(paymentForm.cardType.htmlValue) !== "undefined"
}

function sendTokenizationRequest(tokenizationRequest)
{
    try {
        let tokenizationService = FiservServices.getService('CommercehubTokenization');
        let parsedResponse = FiservServices.callService(tokenizationService, tokenizationRequest);
        return parsedResponse;
    }
    catch(e)
    {
        throw new Error(Resource.msg('message.error.tokenization.failed', 'error', null))
    }
}

function savePaymentEarly(req, res, next)
{
    let sessionId = req.form.sessionId;
    if(sessionId !== null && commercehubConfig.getEarlyTokenization())
    {
        FiservLogs.logInfo(1, 'Initiating Early Tokenization call');
        return executeSavePaymentTransaction.call(this, req, res, next, sessionId);
    }
    return next();
}

function savePayment(req, res, next) {
    if (commercehubConfig.getCommerceHubStandaloneSpa())
    {
        FiservLogs.logInfo(1, 'Initiating Standalone Tokenization call');
        return executeSavePaymentTransaction.call(this, req, res, next);
    }
    return next();
}

function executeSavePaymentTransaction(req, res, next, sessionId)
{
    if(!fiservHelper.isFiserv() || !commercehubConfig.getCommerceHubTokenization())
    {
        return next();
    }

    Transaction.begin();
    let tokenResponse = null;
    try {
        let early = sessionId != undefined;
        if(!early)
        {
            let paymentForm = server.forms.getForm('creditCard');
            if (!validForm(paymentForm))
            {
                throw new Error(Resource.msg('message.error.tokenization.invalidForm', 'error', null));
            }
            sessionId = paymentForm.fiservCommercehubPaymentFields.commercehubSessionId.value;
        }

        // Get the actual sessionId here

        let tokenRequest = requestBuilder.buildTokenRequest(sessionId);
        tokenResponse = sendTokenizationRequest(tokenRequest);
        let cardType = fiservHelper.secureTraversal(tokenResponse, constants.RESPONSE_PATHS.CARD_TYPE_TOKEN);
        if(cardType === 'PIN_ONLY')
        {
            throw new Error(Resource.msg('message.error.payment.pinonly', 'error', null));
        }

        let savedCard = savePaymentInstrument.saveTokenizedCard(req.currentCustomer.profile.customerNo, fiservHelper.getB2cCardType({ value : cardType }), tokenResponse);

        if('duplicate' in savedCard)
        {
            if(early)
            {
                savedCard = savedCard.duplicate;
            }
            else
            {
                throw new Error(savedCard.errorMessage);
            }
        }

        let uuid = savedCard ? savedCard.getUUID() : null;
        
        Transaction.commit();
        FiservLogs.logInfo(1, 'Tokenization Request Successful');
        let transactionId = fiservHelper.secureTraversal(tokenResponse, constants.RESPONSE_PATHS.TRANSACTION_ID);
        if (transactionId)
        {
            FiservLogs.logInfo(1, 'Transaction ID: ' + transactionId);
        }
        res.json({
            success: true,
            uuid: uuid,
            redirectUrl: URLUtils.url('PaymentInstruments-List').toString()
        });
        if(!early)
        {
            return this.emit('route:Complete', req, res);
        }
        else
        {
            return next();
        }
    } catch (_er) {
        Transaction.rollback();
        FiservLogs.logInfo(1, 'Failed to store card in wallet.');
        if(tokenResponse)
        {
            FiservLogs.logError(2, 'Transaction ID: ' + fiservHelper.secureTraversal(tokenResponse, constants.RESPONSE_PATHS.TRANSACTION_ID));
        }

        res.json({
            success: false,
            error: [_er.message]
        });
        return this.emit('route:Complete', req, res);
    }
}

module.exports = { savePayment : savePayment, savePaymentEarly : savePaymentEarly };