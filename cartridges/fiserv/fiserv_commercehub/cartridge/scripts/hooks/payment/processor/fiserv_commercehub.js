'use strict';

const orderHandler = require('*/cartridge/scripts/hooks/payment/processor/utils/commercehub_order_handler');
const transactionHandler = require('*/cartridge/scripts/hooks/payment/processor/utils/commercehub_transaction_handler');


function Handle(basket, paymentInformation, methodID) {
    return orderHandler.handleOrder(basket, paymentInformation, methodID);
}

function Authorize(orderNo, paymentInstrument, paymentProcessor) {
    return transactionHandler.handleTransaction(orderNo, paymentInstrument, paymentProcessor);
}

exports.Handle = Handle;
exports.Authorize = Authorize;