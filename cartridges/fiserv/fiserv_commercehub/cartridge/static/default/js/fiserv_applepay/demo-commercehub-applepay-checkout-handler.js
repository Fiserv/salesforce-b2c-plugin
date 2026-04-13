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

    getAppleOrderConfig = async function()
    {
        return {
            includeShipping: true,
            shippingMethods: [
                {
                    label: "Standard",
                    amount: {
                        "currency": "USD",
                        "total": 5.00
                    },
                    identifier: "standard"
                },
                {
                    label: "Expedited",
                    amount: {
                        "currency": "USD",
                        "total": 15.00
                    },
                    identifier: "expedited"
                }
            ]
        };
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
        this.showError(response);
    }

    showError = function(message)
    {
        $('#fiserv-applepay-fatal-notice').show();
    }

    handlePaymentMethodChange = async function(response)
    {
        console.log("Payment Method changed");
        // Overwrite this to handle the apple pay payment method change event
    }

    handleShippingAddressChange = async function(data)
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
                        amount: {
                            "currency": "USD",
                            "total": 5.00
                        },
                        identifier: "standard"
                    },
                    {
                        label: "Expedited",
                        amount: {
                            "currency": "USD",
                            "total": 15.00
                        },
                        identifier: "expedited"
                    },
                    {
                        label: "Drone Delivery",
                        amount: {
                            "currency": "USD",
                            "total": 250.00
                        },
                        identifier: "drone"
                    }
                ]
            });
        }
    }

    handleShippingOptionsChange = async function(response)
    {
        console.log("Shipping Options changed");
        // Overwrite this to handle the apple pay shipping options change event
    }

    handleCouponCodeChange = async function(response)
    {
        console.log("Coupon Code changed");
        // Overwrite this to handle the apple pay coupon code change event
    }
}