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

    handlePaymentButtonClick = async function()
    {
        console.log("Payment button clicked");
        // Overwrite this to handle the paze payment button click event
    }
}
