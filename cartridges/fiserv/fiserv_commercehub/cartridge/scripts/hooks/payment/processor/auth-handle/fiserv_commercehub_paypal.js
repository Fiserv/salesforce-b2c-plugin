'use strict';

const orderHandler = require('*/cartridge/scripts/hooks/payment/processor/utils/commercehub_order_handler');
const transactionHandler = require('*/cartridge/scripts/hooks/payment/processor/utils/commercehub_transaction_handler');

const fiservPayPalModel = require('*/cartridge/models/fiservPayPalModel');


function Handle(basket, paymentInformation) {
    return orderHandler.handleOrder(basket, paymentInformation, fiservPayPalModel);
}

function Authorize(orderNo, paymentInstrument, paymentProcessor) {
    return transactionHandler.handleTransaction(orderNo, paymentInstrument, paymentProcessor, fiservPayPalModel);
}

exports.Handle = Handle;
exports.Authorize = Authorize;