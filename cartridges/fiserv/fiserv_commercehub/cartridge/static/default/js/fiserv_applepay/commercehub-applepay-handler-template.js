'use strict';

class CommercehubApplePayEventHandler
{
    constructor(initializationData, sdkButton, applepayBase)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize Apple Pay button.");
        }

        this.sdkButton = sdkButton;
        this.applepayBase = applepayBase;
        this.configDataApplePay = initializationData.config.configData;
    }

    initialize = function()
    {
        console.log("Initialized");
        // Run any post-initialization functionality within this call
    }

    handleApproval = async function(response)
    {
        console.log("Approved");
        // Overwrite this to handle the apple pay approval event
    }

    handleCancel = function (response) 
    {
        console.log("Canceled");
        // Overwrite this to handle the apple pay cancel event
    }

    handleError = function(response)
    {
        console.log("Error");
        // Overwrite this to handle the apple pay error event
    }
}