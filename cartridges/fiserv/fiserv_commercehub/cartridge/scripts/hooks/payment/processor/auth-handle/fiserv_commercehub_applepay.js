'use strict';

const orderHandler = require('*/cartridge/scripts/hooks/payment/processor/utils/commercehub_order_handler');
const transactionHandler = require('*/cartridge/scripts/hooks/payment/processor/utils/commercehub_transaction_handler');

const fiservApplePayModel = require('*/cartridge/models/fiservApplePayModel');


function Handle(basket, paymentInformation)
{
    return orderHandler.handleOrder(basket, paymentInformation, fiservApplePayModel);
}

function Authorize(orderNo, paymentInstrument, paymentProcessor)
{
    return transactionHandler.handleTransaction(orderNo, paymentInstrument, paymentProcessor, fiservApplePayModel);
}

exports.Handle = Handle;
exports.Authorize = Authorize;