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
        this.formConfig = initializationData.config;
        this.configDataApplePay = initializationData.config.configData;
    }

    initializedHook = function()
    {
        console.log("Initialized");
        // Run any post-initialization functionality within this call
    }

    getAppleOrderConfig = function()
    {
        return {};
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
        // Overwrite this to handle the apple pay error event
        console.log("Error");
    }

    showError = function(message)
    {
        console.log("Show Error");
        // Overwrite this show errors as needed
    }

    handlePaymentMethodChange = async function(response)
    {
        // Overwrite this to handle the apple pay payment method change event
        console.log("Payment Method Changed");
        response.respond({});
    }

    handleShippingAddressChange = async function(response)
    {
        // Overwrite this to handle the apple pay shipping address change event
        console.log("Shipping Address Changed");
        response.respond({});
    }

    handleShippingOptionsChange = async function(response)
    {
        // Overwrite this to handle the apple pay shipping options change event
        console.log("Shipping Options Changed");
        response.respond({});
    }

    handleCouponCodeChange = async function(response)
    {
        // Overwrite this to handle the apple pay coupon code change event
        console.log("Coupon Code Changed");
        response.respond({});
    }
}