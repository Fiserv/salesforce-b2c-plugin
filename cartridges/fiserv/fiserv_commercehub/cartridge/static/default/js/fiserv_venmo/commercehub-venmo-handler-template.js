'use strict';

class CommercehubVenmoEventHandler
{
    constructor(initializationData, sdkButton, venmoBase)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize Venmo button.");
        }

        this.sdkButton = sdkButton;
        this.venmoBase = venmoBase;
        this.configDataVenmo = initializationData.config.configData;
    }

    initialize = function()
    {
        console.log("Initialized");
        // Run any post-initialization functionality within this call
    }

    handleApproval = function(response)
    {
        console.log("Approved");
        // Overwrite this to handle the venmo approval event
    }

    handleCancel = function(response)
    {
        console.log("Canceled");
        // Overwrite this to handle the venmo cancel event
    }

    handleError = function(response)
    {
        console.log("Error");
        // Overwrite this to handle the venmo error event
    }
}
