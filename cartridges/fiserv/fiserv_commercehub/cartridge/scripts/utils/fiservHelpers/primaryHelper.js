'use strict';

const PaymentMgr = require('dw/order/PaymentMgr');

const fiservConstants = require('*/cartridge/fiservConstants/constants');


function isCreditCardFiserv()
{
    let method = PaymentMgr.getPaymentMethod('CREDIT_CARD');
    
    if (method !== null && method.paymentProcessor !== null && method.paymentProcessor.ID == fiservConstants.PROCESSOR_ID_LIST.COMMERCEHUB_PROCESSOR)
    {
        return method.isActive();
    }

    return false;
}

function isApplePayFiserv()
{
    let method = PaymentMgr.getPaymentMethod('APPLEPAY');
    
    if (method !== null && method.paymentProcessor !== null && method.paymentProcessor.ID == fiservConstants.PROCESSOR_ID_LIST.COMMERCEHUB_APPLEPAY_PROCESSOR)
    {
        return method.isActive();
    }

    return false;
}

function secureTraversal(object, path)
{
    if(object == null)
        return null;
    for(let i in path)
    {
        object = object[path[i]];
        if(typeof(object) === "undefined")
            return null;
    }
    return object;
}

module.exports =
{
    isCreditCardFiserv : isCreditCardFiserv,
    isApplePayFiserv : isApplePayFiserv,
    secureTraversal : secureTraversal
}