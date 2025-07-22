'use strict';

var server = require('server');
var credService = require("*/cartridge/scripts/utils/commercehubHostedPayment");

server.post('Credentials', function(req, res, next) {
    var is3DS = false;
    if(req.form && req.form.is3DS !== undefined)
        is3DS = req.form.is3DS === 'true' ? true : false;
    let creds = credService.prepareFormSubmission(is3DS);
    res.json(creds);
    return next();
});

module.exports = server.exports();