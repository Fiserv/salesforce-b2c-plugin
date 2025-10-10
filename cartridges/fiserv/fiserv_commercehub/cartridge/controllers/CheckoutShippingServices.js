'use strict';

var server = require('server');

server.extend(module.superModule);

server.prepend('ToggleMultiShip', function (req, res, next) {
    res.setStatusCode(400);
    return false
});

module.exports = server.exports();