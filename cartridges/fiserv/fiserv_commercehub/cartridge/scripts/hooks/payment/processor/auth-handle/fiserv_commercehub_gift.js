'use strict';

const transactionHandler = require('*/cartridge/scripts/hooks/payment/processor/utils/commercehub_transaction_handler');

const fiservGiftCardModel = require('*/cartridge/models/fiservGiftCardModel');


// Does nothing. Used to bypass payment method for a covered cart in checkout flow
function Handle()
{
    return { error: false };
}

function Authorize(orderNo, paymentInstrument, paymentProcessor)
{
    return transactionHandler.handleTransaction(orderNo, paymentInstrument, paymentProcessor, fiservGiftCardModel);
}

exports.Handle = Handle;
exports.Authorize = Authorize;