'use strict';

let orderHandler = require('*/cartridge/scripts/hooks/payment/processor/utils/commercehub_order_handler');
let transactionHandler = require('*/cartridge/scripts/hooks/payment/processor/utils/commercehub_transaction_handler');

function Handle(basket, paymentInformation) {
    return orderHandler.handleOrder(basket, paymentInformation);
}

function Authorize(orderNo, paymentInstrument, paymentProcessor) {
    return transactionHandler.handleTransaction(orderNo, paymentInstrument, paymentProcessor);
}

exports.Handle = Handle;
exports.Authorize = Authorize;