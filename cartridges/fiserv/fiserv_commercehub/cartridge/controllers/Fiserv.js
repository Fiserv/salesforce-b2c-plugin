'use strict';

var server = require('server');
var credService = require("*/cartridge/scripts/utils/commercehubHostedPayment");

server.get('Show', function (req, res, next) {
    let orderNo = "00000204";
    const OrderMgr = require('dw/order/OrderMgr');

    let order = OrderMgr.getOrder(orderNo);
    let amt = "xxx";
    if (order)
    {
        amt = order.getCapturedAmount();
    }

    res.render('fiserv_commercehub/test.isml', {
        param1: order ? order.invoices.length : "null", 
        param2: amt,
        param3: order.getInvoices().getLength()
    });
    
    
    next();
});

server.post('Credentials', function(req, res, next) {
    let creds = credService.createPaymentPageData();
    res.json(creds);
    return next();
});

server.get('Test', function(req, res, next) {


});

module.exports = server.exports();