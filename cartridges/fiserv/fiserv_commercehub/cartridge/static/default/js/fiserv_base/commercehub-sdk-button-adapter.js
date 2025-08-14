"use strict"

// This class is for sdk button constructions
class FiservSDKButton
{
    // load success callback fires on successful load of the CommerceHub SDK
    // load fail callback fires on failure to load the CommerceHub SDK
    // sdk ready callback fires when form is successfully loaded
    constructor(
        loadSuccessCallback, 
        loadFailCallback,
        sdkReadyCallback
    ) {
        this.loadSuccessCallback = loadSuccessCallback;
        this.loadFailCallback = loadFailCallback;
        this.sdkReadyCallback = sdkReadyCallback;
    }

    initSdk = async function(credentialsUrl, storeSessionCallback, requestPurpose = null)
    {
        await new Promise((resolve, reject) => {
            FiservSDKHelper.backendCall(credentialsUrl, resolve, reject, { requestPurpose: requestPurpose });
        })
        .then(async (credentialsResponse) => {
            if(storeSessionCallback)
                storeSessionCallback(credentialsResponse['sessionId']);

            await window.fiserv.init(FiservSDKHelper.buildInitConfig(credentialsResponse));

            this.sdkReadyCallback();
        });
    }
}