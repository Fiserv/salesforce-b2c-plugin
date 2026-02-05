'use strict';

const orderHandler = require('*/cartridge/scripts/hooks/payment/processor/utils/commercehub_order_handler');
const transactionHandler = require('*/cartridge/scripts/hooks/payment/processor/utils/commercehub_transaction_handler');

const fiservVenmoModel = require('*/cartridge/models/fiservVenmoModel');


function Handle(basket, paymentInformation)
{
    return orderHandler.handleOrder(basket, paymentInformation, fiservVenmoModel);
}

function Authorize(orderNo, paymentInstrument, paymentProcessor)
{
    return transactionHandler.handleTransaction(orderNo, paymentInstrument, paymentProcessor, fiservVenmoModel);
}

exports.Handle = Handle;
exports.Authorize = Authorize;