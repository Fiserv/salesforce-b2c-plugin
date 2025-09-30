'use strict';

var server = require('server');
var credService = require("*/cartridge/scripts/utils/commercehubHostedPayment");

server.post('Credentials', function(req, res, next) {
    let creds = credService.prepareFormSubmission(req.host, req.form);
    res.json(creds);
    return next();
});

module.exports = server.exports();