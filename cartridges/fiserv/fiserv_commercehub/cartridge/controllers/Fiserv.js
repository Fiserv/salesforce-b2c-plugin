'use strict';

var server = require('server');


server.post('Credentials', function(req, res, next) {
    const fiservCredentialsService = require("*/cartridge/scripts/utils/commercehubHostedPayment");

    let creds = fiservCredentialsService.prepareFormSubmission(req.host, req.form);
    res.json(creds);
    return next();
});

module.exports = server.exports();