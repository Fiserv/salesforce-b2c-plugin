'use strict';

const orderHandler = require('*/cartridge/scripts/hooks/payment/processor/utils/commercehub_order_handler');
const transactionHandler = require('*/cartridge/scripts/hooks/payment/processor/utils/commercehub_transaction_handler');

const fiservAchModel = require('*/cartridge/models/fiservAchModel');


function Handle(basket, paymentInformation) {
    return orderHandler.handleOrder(basket, paymentInformation, fiservAchModel);
}

function Authorize(orderNo, paymentInstrument, paymentProcessor) {
    return transactionHandler.handleTransaction(orderNo, paymentInstrument, paymentProcessor, fiservAchModel);
}

exports.Handle = Handle;
exports.Authorize = Authorize;
