'use strict';

module = module.superModule;

// Need to overwrite this function because the calculation of the payment transaction cost is just completely overwriting the amount that is being requested for payment
module.calculatePaymentTransaction = function(currentBasket) {
    // Do nothing
    return { error: false };
}

Object.keys(module).forEach((key) => {
    exports[key] = module[key];
})