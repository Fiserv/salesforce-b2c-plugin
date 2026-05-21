'use strict';

const orderHandler = require('*/cartridge/scripts/hooks/payment/processor/utils/commercehub_order_handler');
const transactionHandler = require('*/cartridge/scripts/hooks/payment/processor/utils/commercehub_transaction_handler');

const fiservPazeModel = require('*/cartridge/models/fiservPazeModel');


function Handle(basket, paymentInformation) {
    return orderHandler.handleOrder(basket, paymentInformation, fiservPazeModel);
}

function Authorize(orderNo, paymentInstrument, paymentProcessor) {
    return transactionHandler.handleTransaction(orderNo, paymentInstrument, paymentProcessor, fiservPazeModel);
}

exports.Handle = Handle;
exports.Authorize = Authorize;