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

    handleApproval = function(response)
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
        this.showError(response);
    }

    showError = function(message)
    {
        $('#fiserv-applepay-fatal-notice').show();
    }

    handlePaymentMethodChange = function(response)
    {
        console.log("Payment Method changed");
        // Overwrite this to handle the apple pay payment method change event
    }

    handleShippingAddressChange = function(data)
    {        
        if (data.shippingMethod.stateOrProvince == "MO")
        {
            data.respond({
                errors : [ { message: "We don't ship to Missouri. Yuck!" } ]
            });
        } else if (data.shippingMethod.stateOrProvince == "WA")
        {
            data.respond({
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
                    },
                    {
                        label: "Drone Delivery",
                        amountTotal: 250.00,
                        detail: "Arrives in 1 business day",
                        identifier: "expedited"
                    },
                    {
                        label: "Drone Delivery",
                        amountTotal: 250.00,
                        detail: "TOO FAST!!",
                        identifier: "drone"
                    }
                ]
            });
        }
    }

    handleShippingOptionsChange = function(response)
    {
        console.log("Shipping Options changed");
        // Overwrite this to handle the apple pay shipping options change event
    }

    handleCouponCodeChange = function(response)
    {
        console.log("Coupon Code changed");
        // Overwrite this to handle the apple pay coupon code change event
    }
}