'use strict';

var server = require('server');
var credService = require("*/cartridge/scripts/utils/commercehubHostedPayment");

server.post('Credentials', function(req, res, next) {
    var requestPurpose = null;
    if(req.form && req.form.requestPurpose !== undefined)
        requestPurpose = req.form.requestPurpose ? req.form.requestPurpose : null;
    let creds = credService.prepareFormSubmission(requestPurpose);
    res.json(creds);
    return next();
});

module.exports = server.exports();