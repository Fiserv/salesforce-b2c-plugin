'use strict';

const orderHandler = require('*/cartridge/scripts/hooks/payment/processor/utils/commercehub_order_handler');
const transactionHandler = require('*/cartridge/scripts/hooks/payment/processor/utils/commercehub_transaction_handler');

const fiservAffirmModel = require('*/cartridge/models/fiservAffirmModel');


function Handle(basket, paymentInformation) {
    return orderHandler.handleOrder(basket, paymentInformation, fiservAffirmModel);
}

function Authorize(orderNo, paymentInstrument, paymentProcessor) {
    return transactionHandler.handleTransaction(orderNo, paymentInstrument, paymentProcessor, fiservAffirmModel);
}

exports.Handle = Handle;
exports.Authorize = Authorize;