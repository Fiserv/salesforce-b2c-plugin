'use strict';

class CommercehubPazeEventHandler
{
    constructor(initializationData, sdkButton, pazeBase)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize Paze button.");
        }

        this.sdkButton = sdkButton;
        this.pazeBase = pazeBase;
        this.configDataPaze = initializationData.config.configData;
    }

    initialize = function()
    {
        console.log("Initialized");
        // Run any post-initialization functionality within this call
    }

    handleApproval = function(response)
    {
        console.log("Approved");
        // Overwrite this to handle the samsung pay approval event
    }

    handleCancel = function(response)
    {
        console.log("Canceled");
        // Overwrite this to handle the samsung pay cancel event
    }

    handleError = function(response)
    {
        console.log("Error");
        // Overwrite this to handle the samsung pay error event
    }
}
