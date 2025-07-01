'use strict';

var server = require('server');
var credService = require("*/cartridge/scripts/utils/commercehubHostedPayment");

server.post('InitializationData', function(req, res, next) {
    let creds = credService.retrieveFormInitializationData(req.querystring.formId);
    res.json(creds);
    return next();
});

server.post('Credentials', function(req, res, next) {
    let creds = credService.prepareFormSubmission();
    res.json(creds);
    return next();
});

module.exports = server.exports();