let server = require('server');
let URLRedirectMgr = require('dw/web/URLRedirectMgr');
let commercehubConfig = require('*/cartridge/scripts/utils/commercehubConfig');
let constants = require('*/cartridge/fiservConstants/constants');

server.extend(module.superModule);

server.prepend('Start', (req, res, next) => {
    const origin = URLRedirectMgr.redirectOrigin;
    if (origin.match(constants.APPLE_VERIFICATION_URL))
    {
        let domainVerificationText = commercehubConfig.getCommerceHubApplePayVerification();
        res.setHttpHeader(dw.system.Response.CONTENT_TYPE, 'text/plain');
        response.getWriter().print(domainVerificationText);
        return null;
    }
    
    return next();
});

module.exports = server.exports();