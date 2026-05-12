'use strict';

const Resource = require('dw/web/Resource');

const fiservConstants = require('*/cartridge/fiservConstants/constants');
const fiservHelper = require('*/cartridge/scripts/utils/fiservHelpers/primaryHelper');
const fiservLogs = require("*/cartridge/scripts/utils/commercehubLogs");
const fiservRequestBuilder = require('*/cartridge/scripts/requests/request_builder');
const fiservServices = require('*/cartridge/scripts/utils/commercehubServices');


function executeAccountVerification(isToken, sourceData) 
{
    let parsedResponse;
    try
    {
        const verificationRequest = fiservRequestBuilder.buildVerificationRequest(isToken, sourceData);

        const verificationService = fiservServices.getService('CommercehubAccountVerification');
        parsedResponse = fiservServices.callService(verificationService, verificationRequest);
    }
    catch (e)
    {
        fiservLogs.logError(2, 'Error executing account verification');
        return { error: true };
    }

    if(fiservHelper.secureTraversal(parsedResponse, fiservConstants.RESPONSE_PATHS.TRANSACTION_STATE) !== 'VERIFIED')
    {
        return { error: true };
    }

    return { success: true };
}

module.exports = 
{
    executeAccountVerification: executeAccountVerification
};