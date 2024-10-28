"use strict";

let server = require('server');
let Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
let URLUtils = require('dw/web/URLUtils');
let PaymentMgr = require('dw/order/PaymentMgr');
let fiservHelper = require('*/cartridge/scripts/utils/fiservHelper');
const FiservLogs = require("*/cartridge/scripts/utils/commercehubLogs");
let FiservServices = require('*/cartridge/scripts/utils/commercehubServices');
let requestBuilder = require('*/cartridge/scripts/requests/request_builder');
let savePaymentInstrument = require('*/cartridge/scripts/account/fiservAccount/save_payment_instrument');

function isFiserv()
{
    let cc = PaymentMgr.getPaymentMethod('CREDIT_CARD');
    
    if (cc !== null)
    {
        return cc.isActive();
    }

    return false;
}

function validForm(paymentForm)
{
    return typeof(paymentForm) !== "undefined" &&
        typeof(paymentForm.fiservCommercehubPaymentFields) !== "undefined" &&
        typeof(paymentForm.fiservCommercehubPaymentFields.commercehubSessionId) !== "undefined" &&
        typeof(paymentForm.fiservCommercehubPaymentFields.commercehubSessionId.value) !== "undefined" &&
        typeof(paymentForm.fiservCommercehubPaymentFields.commercehubSessionId.value) !== "undefined" &&
        fiservHelper.validSessionId(paymentForm.fiservCommercehubPaymentFields.commercehubSessionId.value) &&
        typeof(paymentForm.cardType) !== "undefined" &&
        typeof(paymentForm.cardType.htmlValue) !== "undefined"
}

function sendTokenizationRequest(tokenizationRequest)
{
    let tokenizationService = FiservServices.getService('CommercehubTokenization');
    let response = FiservServices.callService(tokenizationService, tokenizationRequest);
    let parsedResponse = JSON.parse(response);
    FiservLogs.error_log(response);

    return parsedResponse;
}

function savePayment(req, res, next) {
    if (!isFiserv())
    {
        return next();
    }

    Transaction.begin();
    try {
        let paymentForm = server.forms.getForm('creditCard');
        if (!validForm(paymentForm))
        {
            throw new Error("Invalid payment card tokenization form.");
        }

        let tokenRequest = requestBuilder.buildTokenRequest(paymentForm.fiservCommercehubPaymentFields.commercehubSessionId.value);
        let tokenResponse = sendTokenizationRequest(tokenRequest);
        
        savePaymentInstrument.saveTokenizedCard(req.currentCustomer.profile.customerNo, fiservHelper.getB2cCardType({ value : paymentForm.cardType.htmlValue }), tokenResponse);
        
        Transaction.commit();
        res.json({
            success: true,
            redirectUrl: URLUtils.url('PaymentInstruments-List').toString()
        });
        return this.emit('route:Complete', req, res);    
    } catch (_er) {
        Transaction.rollback();

        FiservLogs.error_log('Error while tokenizing payment card: '.concat(_er.message));
        res.json({
            success: false,
            _er: [Resource.msg('error.card.information.error', 'creditCard', null)]
        });
    }
  }

  module.exports = { savePayment : savePayment };