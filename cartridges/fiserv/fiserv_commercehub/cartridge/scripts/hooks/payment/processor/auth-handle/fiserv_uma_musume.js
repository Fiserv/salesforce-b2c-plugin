'use strict';

const orderHandler = require('*/cartridge/scripts/hooks/payment/processor/utils/commercehub_order_handler');
const transactionHandler = require('*/cartridge/scripts/hooks/payment/processor/utils/commercehub_transaction_handler');

const umaMusumeModel = require('*/cartridge/models/fiservUmaMusumeModel');


function Handle(basket, paymentInformation) {
    return orderHandler.handleOrder(basket, paymentInformation, umaMusumeModel);
}

function Authorize(orderNo, paymentInstrument, paymentProcessor) {
    return transactionHandler.handleTransaction(orderNo, paymentInstrument, paymentProcessor, umaMusumeModel);
}

exports.Handle = Handle;
exports.Authorize = Authorize;
