'use strict';

let orderHandler = require('*/cartridge/scripts/hooks/payment/processor/utils/commercehub_order_handler');
let transactionHandler = require('*/cartridge/scripts/hooks/payment/processor/utils/commercehub_transaction_handler');

// Does nothing. Used to bypass payment method for a covered cart in checkout flow
function Handle(basket, paymentInformation, methodID) {
    return orderHandler.handleOrder(basket, paymentInformation, methodID);
}

function Authorize(orderNo, paymentInstrument, paymentProcessor) {
    return transactionHandler.handleTransaction(orderNo, paymentInstrument, paymentProcessor);
}

exports.Handle = Handle;
exports.Authorize = Authorize;