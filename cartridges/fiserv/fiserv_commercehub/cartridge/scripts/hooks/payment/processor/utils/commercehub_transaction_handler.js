
const PaymentTransaction = require('dw/order/PaymentTransaction');
let Transaction = require('dw/system/Transaction');
let fiservCheckout = require('*/cartridge/scripts/checkout/fiservCheckout');
let FiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");
let constants = require('*/cartridge/fiservConstants/constants');

function handleTransaction(orderNo, paymentInstrument, paymentProcessor)
{
    Transaction.wrap(function () {
        paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
        let _type = FiservConfig.getCommerceHubPaymentType();
        if (_type !== null)
        {
            let paymentType = _type.toString() === constants.COMMERCEHUB_AUTH_ACTION ? PaymentTransaction.TYPE_AUTH : PaymentTransaction.TYPE_CAPTURE;
            paymentInstrument.paymentTransaction.setType(paymentType);
        }        
    });
    Transaction.begin();

    let res = fiservCheckout.executeCommercehubTransaction(orderNo, paymentInstrument);

    if (res.error)
    {
        Transaction.rollback();
        return {
            authorized: false,
            fieldErrors: [],
            serverErrors: [res.error.message],
            error: true
        };
    }

    if (typeof(res.gatewayResponse) !== "undefined" &&
        typeof(res.gatewayResponse.transactionProcessingDetails) !== "undefined" &&
        typeof(res.gatewayResponse.transactionProcessingDetails.transactionId) !== "undefined")
    {
        paymentInstrument.paymentTransaction.transactionID = res.gatewayResponse.transactionProcessingDetails.transactionId;
    }
    Transaction.commit();
    return { authorized: true, error: false };
}

module.exports = 
{
    handleTransaction : handleTransaction
};