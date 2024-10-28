"use strict"

class FiservIframe
{
    // load success callback fires on successful load of the CommerceHub SDK
    // load fail callback fires on failure to load the CommerceHub SDK
    // form ready callback fires when form is successfully loaded
    // form valid callback fires when form is marked valid
    // form invalid callback fires when form is marked invalid
    // run success callback fires when card is successfully tokenized
    // run failure callback fires when card fails to tokenize
    constructor(
        loadSuccessCallback, 
        loadFailCallback,
        formReadyCallback, 
        formValidCallback, 
        formInvalidCallback,
        runSuccessCallback,
        runFailureCallback) 
    {
        // CommerceHub SDK loaded separately by B2C SFRA assets.js
        if (typeof(commercehub) === "undefined")
        {
            throw new Error("CommerceHub SDK not found. Unable to create CommerceHub Hosted Payment Page.")
        }

        this.loadSuccessCallback = loadSuccessCallback;
        this.loadFailCallback = loadFailCallback;
        this.formReadyCb = formReadyCallback;
        this.formValidCb = formValidCallback;
        this.formInvalidCb = formInvalidCallback
        this.runSuccessCallback = runSuccessCallback;
        this.runFailureCallback = runFailureCallback;
    }

    initSdk = function(formData) 
    {
        this.form = new commercehub.Fiserv(formData['formConfig'], formData['authorization'], formData['apiKey']);
    }

    getCommerceHubCredentials = function(credsUrl, successCb, failureCb)
    {
        $.ajax({
            url: credsUrl,
            cache: false,
            dataType: 'json',
            type: "POST",
            success: function(response) {
                successCb(response);
            },
            error: function(err) {
                failureCb(err)
            }
        });
    }

    handleIframeEvents = function(eventData) 
    {
        if (eventData.trigger.type === "ready") {
            this.formReadyCb();
            this.iframeActive = true;
        }

        if (eventData.valid && eventData.trigger.type === 'card-capture-success')
        {
            console.log(eventData.response.body);
            this.runSuccessCallback(eventData.response.body);
        } else if (eventData.valid && eventData.trigger.type !== 'card-capture-success')
        {
            this.formValidCb();
        } else
        {
            this.formInvalidCb();
        }
    }

    listenForIframeMessages = function () {
        let handler = (eventData) => { this.handleIframeEvents(eventData); };
        this.iframeEventListener = function(event) 
        {
            var trustedOrigins = ["https://api.fiservapps.com", "https://cert.api.fiservapps.com", "https://prod.api.fiservapps.com"];    
            var trustedEventTypes = ["saq-card-form-state-change", "saqa-card-form-state-change"];    
            if (trustedOrigins.includes(event.origin) && event.data && trustedEventTypes.includes(event.data.type)) 
            {      
                handler(event.data);    
            }
        }

        window.addEventListener('message', this.iframeEventListener, false); 
    }

    createPaymentIframe = function()
    {
        this.listenForIframeMessages();
        try {
            this.form.loadPaymentForm("fiserv-commercehub-card-form-container")
            .then((next) => {
                // next is null here
                // need to handle this when window receives capture event (handleIframeEvents)
            })
            .catch((error) => {
                this.runFailureCallback(error);
            });
            this.loadSuccessCallback()
        } catch (error) {
            this.loadFailCallback(error);
        }
    }

    submitForm = function()
    {
        if (this.iframeActive === true)
        {
            this.form.submitCardForm();    
        }
    }

    destroyIframe = function()
    {
        $("#fiserv-commercehub-card-form-container").find("iframe").remove();
        window.removeEventListener('message', this.iframeEventListener, false);
    }

    reactivateIframe = function()
    {
        this.iframeActive = true;
        this.listenForIframeMessages();
        $("#fiserv-commercehub-card-form-container").find("iframe").show();
    }

    deactivateIframe = function()
    {
        if (typeof(this.form) !== "undefined")
        {
            $("#fiserv-commercehub-card-form-container").find("iframe").hide();
            window.removeEventListener('message', this.iframeEventListener, false);
        }
    }
}
