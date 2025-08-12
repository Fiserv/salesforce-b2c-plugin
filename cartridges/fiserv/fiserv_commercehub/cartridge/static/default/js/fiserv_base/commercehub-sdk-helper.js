"use strict"

class FiservSDKHelper
{
    static backendCall(backendUrl, successCb, failureCb, data = null)
    {
        $.ajax({
            url: backendUrl,
            cache: false,
            dataType: 'json',
            type: "POST",
            data: data,
            success: function(response) {
                successCb(response);
            },
            error: function(err) {
                failureCb(err)
            }
        });
    }

    static buildInitConfig(credentialsResponse)
    {
        let initConfig = {
            ...credentialsResponse['submitConfig'],
            ...credentialsResponse['initConfig'],
            'sessionId': credentialsResponse['sessionId']
        }

        return initConfig;
    }
}