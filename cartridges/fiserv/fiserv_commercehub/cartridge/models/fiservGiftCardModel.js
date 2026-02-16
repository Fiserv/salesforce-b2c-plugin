'use strict';

const fiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");

const METHOD_ID = "GIFT_CARD";
const PROCESSOR_STRING = 'Gift Card';


function getCommercehubPaymentType()
{
    return fiservConfig.getCommerceHubGiftPaymentType();
}

function executeCommercehubTransaction(orderNo, paymentInstrument)
{
    const fiservGiftCheckout = require('*/cartridge/scripts/checkout/fiservGiftCheckout');
    return fiservGiftCheckout.executeCommercehubGiftTransaction(orderNo, paymentInstrument);
}

function associateDataPostTransaction(res, paymentInstrument)
{
    paymentInstrument.custom.balance = null;
}

function getProcessorString()
{
    return PROCESSOR_STRING;
}

module.exports = 
{
    methodID : METHOD_ID,
    getCommercehubPaymentType : getCommercehubPaymentType,
    executeCommercehubTransaction : executeCommercehubTransaction,
    associateDataPostTransaction : associateDataPostTransaction,
    getProcessorString : getProcessorString,
};