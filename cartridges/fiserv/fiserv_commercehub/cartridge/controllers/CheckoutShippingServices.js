'use strict';

const server = require('server');

server.extend(module.superModule);


server.append('SubmitShipping', function (req, res, next) {
    this.on('route:BeforeComplete', function (req, res) {
        const fiservConfig = require('*/cartridge/scripts/utils/commercehubConfig');
        const fiservGiftHelper = require('*/cartridge/scripts/utils/fiservHelpers/giftHelper');

        if(fiservConfig.getCommerceHubGiftEnabled() && !res.viewData.error)
        {
            fiservGiftHelper.correctGrandTotalResponseIncludingGiftCards(res);
        }
    });

    return next();
});

server.prepend('ToggleMultiShip', function (req, res, next) {
    res.setStatusCode(400);
    return false
});

module.exports = server.exports();