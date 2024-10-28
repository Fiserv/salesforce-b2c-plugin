"use strict"

let creds = require("*/cartridge/scripts/credentials/commercehubCredentials");
let FiservConfig = require("*/cartridge/scripts/utils/commercehubConfig");

// https://salesforcecommercecloud.github.io/b2c-dev-doc/docs/current/sfrajsdoc/js/client/global.html#addSpinner
// https://salesforcecommercecloud.github.io/b2c-dev-doc/docs/current/sfrajsdoc/js/client/global.html#removeSpinner

// current idea is to kick off the hosted payment page flow when the payments template is rendered
// can we call a script from the template?
// 1. start spinner to veil the component
// 2. perform CH credentials request
// 3. request HPP customizations
// 4. use credentails & customizations (json) to instantiate HPP 
// 5. register external trigger for HPP submission
// 6. handle errors on failure or continue checkout flow passing sessionId on success

function buildFormConfig(credentials) {
    let formConfig = {};
    formConfig['merchantId'] = FiservConfig.getCommerceHubMerchantId();
    formConfig['publicKey'] = credentials['publicKey'];
    formConfig['asymmetricEncryptionAlgorithm'] = credentials['symmetricEncryptionAlgorithm'];
    formConfig['keyId'] = credentials['keyId'];
    formConfig["payButton"] = { "label" : "CREATE", "loading" : "PROCESSING" };

    // TODO: implement form customization
    // if (typeof(this.config[this.configCssKey]) !== "undefined") {
    //     formConfig[this.formConfigCssKey] = this.config[this.configCssKey];
    // }
    
    return formConfig;
}

function collectFormData(credentials)
{
    let apiKey = FiservConfig.getCommerceHubApiKey(); 
    let authorization = credentials['accessToken'];
    let formConfig = buildFormConfig(credentials);
    let sessionId = credentials['sessionId'];

    return {
        'apiKey' : apiKey,
        'authorization' : authorization,
        'formConfig' : formConfig,
        'sessionId' : sessionId
    }
}

function createPaymentPageData()
{
    return collectFormData(creds.getCommercehubCredentials());
}

module.exports = 
{ 
    createPaymentPageData : createPaymentPageData 
}