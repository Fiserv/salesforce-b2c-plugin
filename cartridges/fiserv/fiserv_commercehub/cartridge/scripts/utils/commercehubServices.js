"use strict";

let b2c_service = require('dw/svc');
let Resource = require('dw/web/Resource');
let resultConstants = require('dw/svc/Result');
let FiservLogs = require('*/cartridge/scripts/utils/commercehubLogs');
let FiservHttp = require('*/cartridge/scripts/utils/commercehubHttpAdapter');
let FiservConfig = require('*/cartridge/scripts/utils/commercehubConfig');
let requestBuilder = require('*/cartridge/scripts/requests/request_builder');
let FiservHelper = require('*/cartridge/scripts/utils/fiservHelper');
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
    getService: function(serviceName, orderNo)
    {
        let fiservService = null;
        try {
            fiservService = b2c_service.LocalServiceRegistry.createService(serviceName, 
                {
                    createRequest: function createRequest(svc, payload, timeout)
                    {
                        svc.setRequestMethod("POST");
                        if (payload)
                        {
                            return { payload: payload, timeout: timeout };
                        }
                        return null;
                    },
                    executeOverride: true,
                    execute: function(svc, args) {
                        let client = svc.getClient();
                        if(args.timeout)
                        {
                            client.setTimeout(args.timeout * 1000);
                        }
                        client.send(args.payload);
                        return client;
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
                throw new Error(Resource.msg('message.error.service.creationFail', 'error', null).concat(serviceName));
            }

            fiservService.setURL(getServiceUrl(fiservService.getURL()));
            FiservLogs.logDebug(3, "Created Fiserv service: ".concat(serviceName), orderNo);
        } catch (_err) {
            FiservLogs.logError(2, "Error creating Fiserv service: ".concat(_err.toString())), orderNo;
        }
        return fiservService;
    },

    callService: function(service, payload, orderNo)
    {
        // Avoid logging this for credentials request becuase it is mostly redundent...
        if(service.credentialID !== 'CommercehubCredentials')
        {
            FiservLogs.logInfo(1, "Sending request to Commerce Hub", orderNo);
            FiservLogs.logDebug(3, "TXN REQUEST PAYLOAD:\n" + JSON.stringify(payload,null,2), orderNo);
        }

        let populationResponse = FiservHttp.populateService(service, payload, null, orderNo);
        service = populationResponse.service;
        let callResult = service.call(JSON.stringify(payload), FiservConfig.getCommerceHubTimeout());
    
        let parsedResponse = null;
        if (!callResult.isOk())
        {
            FiservLogs.logError(2, "Network call failed with error: " + callResult.getError().toString(), orderNo);
            if(service.credentialID !== 'CommercehubCredentials' && callResult.getUnavailableReason() === resultConstants.UNAVAILABLE_TIMEOUT)
            {
                FiservLogs.logWarn(1, "Timeout detected. Attempting recovery...", orderNo);
                // Step 1: Idempotency attempt
                let cid = populationResponse.clientRequestId;
                FiservLogs.logWarn(1, "Initiating idempotency attempt for Client-Request-Id " + cid, orderNo);
                service = FiservHttp.populateService(service, payload, cid, orderNo).service;
                callResult = service.call(JSON.stringify(payload), 5);

                if(!callResult.isOk())
                {
                    // Only do further steps on a non-tokenization call because no txn is stored for tokenization calls
                    if(service.credentialID === 'CommercehubTokenization')
                    {
                        FiservLogs.logWarn(1, "Idempotency attempt failure. Non-payment call detected. Further recovery attempts not possible. Failed to recover from tokenization timeout", orderNo);
                        throw new Error(Resource.msg('message.error.service.timeout', 'error', null));
                    }

                    FiservLogs.logWarn(1, "Idempotency attempt failure. Continuing recovery process...", orderNo);
                    let timeoutHandleResult = handleTimeout(payload, service.credentialID, orderNo);
                    callResult = timeoutHandleResult.result;
                    parsedResponse = timeoutHandleResult.body;
                }
                else
                {
                    FiservLogs.logWarn(1, "Idempotency attempt success. Returning from recovery process...", orderNo);
                }
            }
            else
            {
                let errorMessage = null;
                if(callResult.getErrorMessage())
                {
                    errorMessage = FiservHelper.secureTraversal(JSON.parse(callResult.getErrorMessage()), constants.RESPONSE_PATHS.ERROR_MESSAGE);
                }
                else
                {
                    errorMessage = callResult.getMsg();
                }
                FiservLogs.logError(2, "Response Status: " + callResult.getStatus() + " | Response Text: " + errorMessage, orderNo);
                throw new Error("".concat(service.credentialID).concat(" service call error code ").concat(callResult.getError().toString(), " Error => ResponseStatus: ").concat(callResult.getStatus(), " | ResponseErrorText: ").concat(errorMessage, " | ResponseText: ").concat(callResult.getMsg()));
            }
        }

        let resultObject = callResult.object;
        if (!resultObject || !resultObject.getText()) 
        {
            FiservLogs.logError(2, "No correct response from ".concat(service.credentialID).concat(" service call"), orderNo);
            throw new Error("No correct response from ".concat(service.credentialID).concat(" service call"));
        }

        parsedResponse = parsedResponse ? parsedResponse : JSON.parse(resultObject.getText());
        if(service.credentialID !== 'CommercehubCredentials')
        {
            FiservLogs.logInfo(1, "Response received from Commerce Hub", orderNo);
            FiservLogs.logDebug(3, "TXN RESPONSE INFO", orderNo);
            let responseHeaders = resultObject.getResponseHeaders().entrySet().toArray().map((header) => header.key +': ' + header.value.join(', ')).join('\n');
            FiservLogs.logDebug(3, "Response Headers:\nHTTP " + resultObject.getStatusCode() + "\n" + responseHeaders + '\n', orderNo);
            FiservLogs.logDebug(3, "Response Body:\n" + JSON.stringify(parsedResponse,null,2), orderNo);
        }
        return parsedResponse;
    }
}

let handleTimeout = function(data, endpoint, orderNo)
{
    let merchantTransactionId = data["transactionDetails"]["merchantTransactionId"];

    // Step 2: Transaction Inquiry
    FiservLogs.logWarn(1, "Initiating transaction inquiry for referenceMerchantTransactionId " + merchantTransactionId, orderNo);
    let recoveryPayload = requestBuilder.buildRecoveryPayload(orderNo, merchantTransactionId);
    let inquiryService = helper.getService('CommercehubTransactionInquiry', orderNo);
    inquiryService = FiservHttp.populateService(inquiryService, recoveryPayload, null, orderNo).service;
    let inquiryResult = inquiryService.call(JSON.stringify(recoveryPayload), 5);

    if(inquiryResult.isOk() && inquiryResult.object.getText() !== '[]')
    {
        let inquiryResultArray = JSON.parse(inquiryResult.object.getText());
        let inquiryBody = null;
        // Look for correct transaction within $inquiryResponse and return just the body
        for(let i in inquiryResultArray)
        {
            if(inquiryResultArray[i]["transactionDetails"]["merchantOrderId"] === orderNo)
            {
                inquiryBody = inquiryResultArray[i];
            }
        }

        FiservLogs.logWarn(1, "Transaction inquiry success. Returning from recovery process...", orderNo);
        return { result: inquiryResult, body: inquiryBody };
    }
    FiservLogs.logWarn(1, "Transaction inquiry failure. Continuing recovery process...", orderNo);

    // Step 3: Critical Recovery (Deal with transaction specific response flows if issue with inquiry occurred)
    if(endpoint === 'CommercehubCharges' && data["transactionDetails"]["captureFlag"] === false)
    {
        // Attempt cancel transaction of initial Auth
        FiservLogs.logWarn(1, "Auth detected. Attempting to Cancel initial transaction...", orderNo);
        let cancelService = helper.getService('CommercehubCancel', orderNo);
        cancelService = FiservHttp.populateService(cancelService, recoveryPayload, null, orderNo).service;
        let cancelResult = cancelService.call(JSON.stringify(recoveryPayload), 5);

        if(cancelResult.isOk())
        {
            let cancelResultObject = cancelResult.object;
            let cancelResponseBody = JSON.parse(cancelResultObject.getText());
            FiservLogs.logWarn(1, "Cancel response received for timeout reversal", orderNo);
            FiservLogs.logDebug(3, "CANCEL TXN RESPONSE INFO", orderNo);
            let cancelResponseHeaders = cancelResultObject.getResponseHeaders().entrySet().toArray().map((header) => header.key +': ' + header.value.join(', ')).join('\n');
            FiservLogs.logDebug(3, "Response Headers:\nHTTP " + cancelResultObject.getStatusCode() + "\n" + cancelResponseHeaders + '\n', orderNo);
            FiservLogs.logDebug(3, "Response Body:\n" + JSON.stringify(cancelResponseBody,null,2), orderNo);
            FiservLogs.logWarn(1, "Transaction ID: " + FiservHelper.secureTraversal(cancelResponseBody, constants.RESPONSE_PATHS.TRANSACTION_ID), orderNo);
			FiservLogs.logWarn(1, "Recovery process finished", orderNo);
        }
        else
        {
            FiservLogs.logWarn(1, "Initial transaction cancel failure", orderNo);
            FiservLogs.logFatal(1, "Failed to recover from transaction timeout. referenceMerchantTransactionId: " + merchantTransactionId, orderNo);
        }
    }
    else
    {
        // Do nothing  :(
        FiservLogs.logWarn(1, "Non-Auth transaction detected. Further recovery attempts not possible.");
        FiservLogs.logFatal(1, "Failed to recover from transaction timeout. referenceMerchantTransactionId: " + merchantTransactionId, orderNo);
    }

    // Error out :(
    throw new Error(Resource.msg('message.error.service.timeout', 'error', null));
}

module.exports = helper;
