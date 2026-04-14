'use strict';

class CommercehubApplePayEventHandler
{

    constructor(initializationData, sdkButton, applepayBase)
    {
        if (typeof(initializationData) === "undefined") throw new Error("Initialization Data not found. Unable to initialize Apple Pay button.");

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
        return {
            includeShipping: true,
            shippingMethods: [
                {
                    label: "Standard",
                    amountTotal: 5.00,
                    detail: "Arrives in 5-7 business days",
                    identifier: "standard"
                },
                {
                    label: "Expedited",
                    amountTotal: 15.00,
                    detail: "Arrives in 2-3 business days",
                    identifier: "expedited"
                }
            ]
        };
    }

    handleApproval = async function(response)
    {
        // Overwrite this to handle the apple pay approval event
        console.log("Approved");
    }

    handleCancel = function (response) 
    {
        // Overwrite this to handle the apple pay cancel event
        console.log("Apple Pay flow canceled");
    }

    handleError = function(response)
    {
        // Overwrite this to handle the apple pay error event
        this.showError(response);
    }

    showError = function(message)
    {
        $('#fiserv-applepay-fatal-notice').show();
    }

    handlePaymentMethodChange = function(response)
    {
        // Overwrite this to handle the apple pay payment method change event
        console.log("Payment Method changed");
        response.respond({});
    }

    handleShippingAddressChange = async function(data)
    {
        if (data.shippingAddress.address.stateOrProvince == "MO")
        {
            return data.respond({
                errors : [ { code: "addressUnserviceable", message: "We don't ship to Missouri. Yuck!" } ]
            });
        } 
        const shippingMethods = [
            {
                label: "Standard",
                amountTotal: 5.00,
                detail: "Arrives in 5-7 business days",
                identifier: "standard"
            },
            {
                label: "Expedited",
                amountTotal: 15.00,
                detail: "Arrives in 2-3 business days",
                identifier: "expedited"
            }
        ];

        if (data.shippingAddress.address.stateOrProvince == "WA")
        {
            shippingMethods.push({
                label: "Drone Delivery",
                amountTotal: 250.00,
                detail: "Really fast delivery! TOO FAST!!",
                identifier: "drone"
            });
        }
        return data.respond({shippingMethods: shippingMethods});
    }

    handleShippingOptionsChange = async function(response)
    {
        // Overwrite this to handle the apple pay shipping options change event
        console.log("Shipping Options changed");
        response.respond({});
    }

    handleCouponCodeChange = function(response)
    {
        // Overwrite this to handle the apple pay coupon code change event
        console.log("Coupon Code changed");
        response.respond({});
    }
}