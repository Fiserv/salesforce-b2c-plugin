'use strict';

const Resource = require('dw/web/Resource');

const fiservLogs = require('*/cartridge/scripts/utils/commercehubLogs');
const fiservHttpAdapter = require('*/cartridge/scripts/utils/commercehubHttpAdapter');
const fiservConfig = require('*/cartridge/scripts/utils/commercehubConfig');
const fiservHelper = require('*/cartridge/scripts/utils/fiservHelper');
const fiservConstants = require('*/cartridge/fiservConstants/constants');


const getServiceUrl = function(url)
{
    let env = fiservConfig.getCommerceHubApiEnvironment();
    env = env !== null ? env.toString() : "";

    let base = fiservConstants.COMMERCEHUB_CERT_BASE;
    if (env === fiservConstants.COMMERCEHUB_LIVE_ENV)
        base = fiservConstants.COMMERCEHUB_LIVE_BASE;
    
    return url.replace(fiservConstants.ENVIRONMENT_URL_PLACEHOLDER, base);
}

const helper = 
{
    getService: function(serviceName, orderNo)
    {
        const SVC = require('dw/svc');

        let fiservService = null;
        try {
            fiservService = SVC.LocalServiceRegistry.createService(serviceName, 
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
            fiservLogs.logDebug(3, "Created Fiserv service: ".concat(serviceName), orderNo);
        } catch (_err) {
            fiservLogs.logError(2, "Error creating Fiserv service: ".concat(_err.toString())), orderNo;
        }
        return fiservService;
    },

    callService: function(service, payload, orderNo)
    {
        // Avoid logging this for credentials request becuase it is mostly redundent...
        if(service.credentialID !== 'CommercehubCredentials')
        {
            fiservLogs.logInfo(1, "Sending request to Commerce Hub", orderNo);
            fiservLogs.logDebug(3, "TXN REQUEST PAYLOAD:\n" + JSON.stringify(payload,null,2), orderNo);
        }

        let populationResponse = fiservHttpAdapter.populateService(service, payload, null, orderNo);
        service = populationResponse.service;
        let callResult = service.call(JSON.stringify(payload), fiservConfig.getCommerceHubTimeout());
    
        let parsedResponse = null;
        if (!callResult.isOk())
        {
            const Result = require('dw/svc/Result');

            fiservLogs.logError(2, "Network call failed with error: " + callResult.getError().toString(), orderNo);
            if(service.credentialID !== 'CommercehubCredentials' && callResult.getUnavailableReason() === Result.UNAVAILABLE_TIMEOUT)
            {
                fiservLogs.logWarn(1, "Timeout detected. Attempting recovery...", orderNo);
                // Step 1: Idempotency attempt
                let cid = populationResponse.clientRequestId;
                fiservLogs.logWarn(1, "Initiating idempotency attempt for Client-Request-Id " + cid, orderNo);
                service = fiservHttpAdapter.populateService(service, payload, cid, orderNo).service;
                callResult = service.call(JSON.stringify(payload), 5);

                if(!callResult.isOk())
                {
                    // Only do further steps on a non-tokenization call because no txn is stored for tokenization calls
                    if(service.credentialID === 'CommercehubTokenization' || service.credentialID === 'CommercehubOrders') // Change to accomodate for Orders later...
                    {
                        fiservLogs.logWarn(1, "Idempotency attempt failure. Non-payment call detected. Further recovery attempts not possible. Failed to recover from tokenization timeout", orderNo);
                        throw new Error(Resource.msg('message.error.service.timeout', 'error', null));
                    }

                    fiservLogs.logWarn(1, "Idempotency attempt failure. Continuing recovery process...", orderNo);
                    let timeoutHandleResult = handleTimeout(payload, service.credentialID, orderNo);
                    callResult = timeoutHandleResult.result;
                    parsedResponse = timeoutHandleResult.body;
                }
                else
                {
                    fiservLogs.logWarn(1, "Idempotency attempt success. Returning from recovery process...", orderNo);
                }
            }
            else
            {
                let errorMessage = null;
                if(callResult.getErrorMessage())
                {
                    errorMessage = fiservHelper.secureTraversal(JSON.parse(callResult.getErrorMessage()), fiservConstants.RESPONSE_PATHS.ERROR_MESSAGE);
                }
                else
                {
                    errorMessage = callResult.getMsg();
                }
                fiservLogs.logError(2, "Response Status: " + callResult.getStatus() + " | Response Text: " + errorMessage, orderNo);
                throw new Error("".concat(service.credentialID).concat(" service call error code ").concat(callResult.getError().toString(), " Error => ResponseStatus: ").concat(callResult.getStatus(), " | ResponseErrorText: ").concat(errorMessage, " | ResponseText: ").concat(callResult.getMsg()));
            }
        }

        let resultObject = callResult.object;
        if (!resultObject || !resultObject.getText()) 
        {
            fiservLogs.logError(2, "No correct response from ".concat(service.credentialID).concat(" service call"), orderNo);
            throw new Error("No correct response from ".concat(service.credentialID).concat(" service call"));
        }

        parsedResponse = parsedResponse ? parsedResponse : JSON.parse(resultObject.getText());
        if(service.credentialID !== 'CommercehubCredentials')
        {
            fiservLogs.logInfo(1, "Response received from Commerce Hub", orderNo);
            fiservLogs.logDebug(3, "TXN RESPONSE INFO", orderNo);
            let responseHeaders = resultObject.getResponseHeaders().entrySet().toArray().map((header) => header.key +': ' + header.value.join(', ')).join('\n');
            fiservLogs.logDebug(3, "Response Headers:\nHTTP " + resultObject.getStatusCode() + "\n" + responseHeaders + '\n', orderNo);
            fiservLogs.logDebug(3, "Response Body:\n" + JSON.stringify(parsedResponse,null,2), orderNo);
        }
        return parsedResponse;
    }
}

const handleTimeout = function(data, endpoint, orderNo)
{
    let merchantTransactionId = data["transactionDetails"]["merchantTransactionId"];

    // Step 2: Transaction Inquiry
    const fiservRequestBuilder = require('*/cartridge/scripts/requests/request_builder');
    
    fiservLogs.logWarn(1, "Initiating transaction inquiry for referenceMerchantTransactionId " + merchantTransactionId, orderNo);
    let recoveryPayload = fiservRequestBuilder.buildRecoveryPayload(orderNo, merchantTransactionId);
    let inquiryService = helper.getService('CommercehubTransactionInquiry', orderNo);
    inquiryService = fiservHttpAdapter.populateService(inquiryService, recoveryPayload, null, orderNo).service;
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

        fiservLogs.logWarn(1, "Transaction inquiry success. Returning from recovery process...", orderNo);
        return { result: inquiryResult, body: inquiryBody };
    }
    fiservLogs.logWarn(1, "Transaction inquiry failure. Continuing recovery process...", orderNo);

    // Step 3: Critical Recovery (Deal with transaction specific response flows if issue with inquiry occurred)
    if(endpoint === 'CommercehubCharges' && data["transactionDetails"]["captureFlag"] === false)
    {
        // Attempt cancel transaction of initial Auth
        fiservLogs.logWarn(1, "Auth detected. Attempting to Cancel initial transaction...", orderNo);
        let cancelService = helper.getService('CommercehubCancel', orderNo);
        cancelService = fiservHttpAdapter.populateService(cancelService, recoveryPayload, null, orderNo).service;
        let cancelResult = cancelService.call(JSON.stringify(recoveryPayload), 5);

        if(cancelResult.isOk())
        {
            let cancelResultObject = cancelResult.object;
            let cancelResponseBody = JSON.parse(cancelResultObject.getText());
            fiservLogs.logWarn(1, "Cancel response received for timeout reversal", orderNo);
            fiservLogs.logDebug(3, "CANCEL TXN RESPONSE INFO", orderNo);
            let cancelResponseHeaders = cancelResultObject.getResponseHeaders().entrySet().toArray().map((header) => header.key +': ' + header.value.join(', ')).join('\n');
            fiservLogs.logDebug(3, "Response Headers:\nHTTP " + cancelResultObject.getStatusCode() + "\n" + cancelResponseHeaders + '\n', orderNo);
            fiservLogs.logDebug(3, "Response Body:\n" + JSON.stringify(cancelResponseBody,null,2), orderNo);
            fiservLogs.logWarn(1, "Transaction ID: " + fiservHelper.secureTraversal(cancelResponseBody, fiservConstants.RESPONSE_PATHS.TRANSACTION_ID), orderNo);
			fiservLogs.logWarn(1, "Recovery process finished", orderNo);
        }
        else
        {
            fiservLogs.logWarn(1, "Initial transaction cancel failure", orderNo);
            fiservLogs.logFatal(1, "Failed to recover from transaction timeout. referenceMerchantTransactionId: " + merchantTransactionId, orderNo);
        }
    }
    else
    {
        // Do nothing  :(
        fiservLogs.logWarn(1, "Non-Auth transaction detected. Further recovery attempts not possible.");
        fiservLogs.logFatal(1, "Failed to recover from transaction timeout. referenceMerchantTransactionId: " + merchantTransactionId, orderNo);
    }

    // Error out :(
    throw new Error(Resource.msg('message.error.service.timeout', 'error', null));
}

module.exports = helper;
