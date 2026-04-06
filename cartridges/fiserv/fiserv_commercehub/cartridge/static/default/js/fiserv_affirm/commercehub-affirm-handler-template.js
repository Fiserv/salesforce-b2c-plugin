'use strict';

class CommercehubAffirmEventHandler
{
    constructor(initializationData, sdkButton, affirmBase)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize Affirm button.");
        }

        this.sdkButton = sdkButton;
        this.affirmBase = affirmBase;
        this.configDataAffirm = initializationData.config.configData;
    }

    initialize = function()
    {
        console.log("Initialized");
        // Run any post-initialization functionality within this call
    }

    handleApproval = function(response)
    {
        console.log("Approved");
        // Overwrite this to handle the affirm approval event
    }

    handleCancel = function(response)
    {
        console.log("Canceled");
        // Overwrite this to handle the affirm cancel event
    }

    handleError = function(response)
    {
        console.log("Error");
        // Overwrite this to handle the affirm error event
    }
}
