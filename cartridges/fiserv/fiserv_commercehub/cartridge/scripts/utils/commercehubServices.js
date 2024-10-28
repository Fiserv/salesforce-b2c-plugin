"use strict";

let b2c_service = require('dw/svc');
let FiservLogs = require('*/cartridge/scripts/utils/commercehubLogs');
let FiservHttp = require('*/cartridge/scripts/utils/commercehubHttpAdapter');
let FiservConfig = require('*/cartridge/scripts/utils/commercehubConfig');
let constants = require('*/cartridge/fiservConstants/constants');

let getServiceUrl = function(url)
{
    let env = FiservConfig.getCommerceHubApiEnvironment();
    env = env !== null ? env.toString() : "";

    let base = constants.COMMERCEHUB_CERT_BASE;
    if (env === constants.COMMERCEHUB_LIVE_ENV)
        base = constants.COMMERCEHUB_LIVE_BASE;
    
    return url.replace(constants.ENVIRONMENT_URL_PLACEHOLDER, base);
}

let helper = 
{
    getService: function(serviceName)
    {
        let fiservService = null;
        try {
            fiservService = b2c_service.LocalServiceRegistry.createService(serviceName, 
                {
                    createRequest: function createRequest(svc, args)
                    {
                        svc.setRequestMethod("POST");
                        if (args)
                        {
                            return args;
                        }
                        return null;
                    },
                    parseResponse: function parseResponse(svc, client)
                    {
                        return client;
                    },
                    filterLogMessage: function filterLogMessage(msg)
                    {
                        return msg;
                    }
                });

            if (typeof(fiservService) === "undefined" || fiservService === null)
            {
                let _errMsg = "Unable to create Fiserv Service: ".concat(serviceName);
                FiservLogs.error_log(_errMsg);
                throw new Error(_errMsg);
            }

            fiservService.setURL(getServiceUrl(fiservService.getURL()));
            FiservLogs.info_log("Created Fiserv service: ".concat(serviceName));
        } catch (_err) {
            FiservLogs.error_log("Error creating Fiserv service: ".concat(_err.toString()));
        }
        return fiservService;
    },

    callService: function(service, payload)
    {
        service = FiservHttp.populateService(service, payload);
        let callResult = service.call(JSON.stringify(payload));
    
        if (!callResult.isOk()) 
        {
            throw new Error("".concat(service.getCredentialsId()).concat(" service call error code").concat(callResult.getError().toString(), " Error => ResponseStatus: ").concat(callResult.getStatus(), " | ResponseErrorText: ").concat(callResult.getErrorMessage(), " | ResponseText: ").concat(callResult.getMsg()));
        }
        let resultObject = callResult.object;
        if (!resultObject || !resultObject.getText()) 
        {
            throw new Error("No correct response from".concat(service.getCredentialsId()).concat("service call"));
        }

        return resultObject.getText();
    }
}

module.exports = helper;
