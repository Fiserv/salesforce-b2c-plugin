'use strict';

const server = require('server');


server.post('Credentials', function(req, res, next) {
    const fiservCredentialsService = require("*/cartridge/scripts/utils/commercehubHostedPayment");

    let creds = fiservCredentialsService.prepareFormSubmission(req.host, req.form);
    res.json(creds);
    return next();
});

server.post('OrderDetails', function(req, res, next) {
    const fiservHelper = require('*/cartridge/scripts/utils/fiservHelpers/primaryHelper');
    res.json(fiservHelper.getBasketOrderDetails());
    return next();
});

module.exports = server.exports();