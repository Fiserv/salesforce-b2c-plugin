'use strict';

var server = require('server');

server.extend(module.superModule);

server.prepend('Begin', function (req, res, next) {    
    return next();
});

module.exports = server.exports();