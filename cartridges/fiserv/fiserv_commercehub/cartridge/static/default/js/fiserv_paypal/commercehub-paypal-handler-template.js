'use strict';

class CommercehubPayPalEventHandler
{
    constructor(initializationData, sdkButton, paypalBase)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize PayPal button.");
        }

        this.sdkButton = sdkButton;
        this.paypalBase = paypalBase;
        this.configDataPayPal = initializationData.config.configData;
    }

    initialize = function()
    {
        console.log("Initialized");
        // Run any post-initialization functionality within this call
    }

    handleApproval = function(response)
    {
        console.log("Approved");
        // Overwrite this to handle the paypal approval event
    }

    handleCancel = function(response)
    {
        console.log("Canceled");
        // Overwrite this to handle the paypal cancel event
    }

    handleError = function(response)
    {
        console.log("Error");
        // Overwrite this to handle the paypal error event
    }
}
