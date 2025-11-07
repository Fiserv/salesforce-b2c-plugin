'use strict';

var server = require('server');
var fiservHelper = require('*/cartridge/scripts/utils/fiservHelper');
var commercehubConfig = require('*/cartridge/scripts/utils/commercehubConfig');

server.extend(module.superModule);

server.append('SubmitShipping', function (req, res, next) {
    this.on('route:BeforeComplete', function (req, res) {
        if(commercehubConfig.getCommerceHubGiftEnabled() && !res.viewData.error)
        {
            fiservHelper.correctGrandTotalResponseIncludingGiftCards(res);
        }
    });

    return next();
});

server.prepend('ToggleMultiShip', function (req, res, next) {
    res.setStatusCode(400);
    return false
});

module.exports = server.exports();