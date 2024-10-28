"use strict"

class CommercehubTokenizationForm
{
    constructor(credentialsUrl) 
    {
        if (typeof(credentialsUrl) === "undefined")
        {
            throw new Error("Credentials endpoint not found. Unable to create CommerceHub Hosted Payment Page.");
        }
        this.credsUrl = credentialsUrl;
    }
    
    initialize = function()
    {
        try {
            $.spinner().start();
            this.createAdapter();
            this.initializeAdapter();
            this.watchSubmitButton();
        } catch (_err) {
            this.sdkLoadFailure(_err);
        }
    }

    createAdapter = function()
    {
        let loadSuccessCallback = () => { console.log("CommerceHub SDK has loaded."); };
        let loadFailCallback = (error) => { this.sdkLoadFailure(error); };
        let formReadyCallback = () => { this.sdkInitialized() };
        let formValidCallback = () => { this.getSubmitButton().prop('disabled', false); }
        let formInvalidCallback = () => { this.getSubmitButton().prop('disabled', true); }
        let runSuccessCallback = (responseBody) => { this.cardTokenizationSuccess(responseBody); };
        let runFailureCallback = (error) => { this.cardTokenizationFailure(error); };

        this.formAdapter = new FiservIframe(
            loadSuccessCallback,
            loadFailCallback,
            formReadyCallback,
            formValidCallback,
            formInvalidCallback,
            runSuccessCallback,
            runFailureCallback);
    }

    initializeAdapter = function()
    {
        let promise = new Promise((resolve, reject) => {
            this.formAdapter.getCommerceHubCredentials(this.credsUrl, resolve, reject);	
        });

        promise.then((credsResponse) => 
        {
            if (!this.validateFormData(credsResponse))
            {
                throw new Error("Unable to validate CommerceHub credentials.");
            }
            this.setSessionIdInput(credsResponse);
            this.formAdapter.initSdk(credsResponse);
            this.createCommercehubTokenizationForm();
        }).catch((err) => 
        {
            console.log(err);
            throw new Error(err);
        });
    }

    validateFormData = function(formData)
    {
        return typeof(formData['apiKey']) !== "undefined" &&
            typeof(formData['authorization']) !== "undefined" &&
            typeof(formData['formConfig']) !== "undefined" &&
            typeof(formData['sessionId']) !== "undefined";
    }

    activateCommercehubForm = function()
    {
        this.formAdapter.reactivateIframe();
        this.watchSubmitButton()
        this.getSubmitButton().prop('disabled', true);
    }
    
    deactivateCommercehubForm = function()
    {
        this.formAdapter.deactivateIframe();
        this.unwatchSubmitButton();
        this.getSubmitButton().prop('disabled', false);
    }

    setSessionIdInput = function(formData)
    {
        $('input#commercehubSessionIdInput').val(formData['sessionId']);
    }

    getSubmitButton = function() 
    {
        return $('button.btn.btn-primary.btn-block.btn-save');
    }

    getSccContainer = function()
    {
        return $('#fiserv-commercehub-card-form-container');
    }

    getFatalNotice = function()
    {
        return $('#fiserv-scc-fatal-notice');
    }

    sdkInitialized = function() 
    {
        this.getSccContainer().addClass('initialized-scc-container');
        $.spinner().stop();
    }

    sdkLoadFailure = function (err) 
    {
        console.log(err);
        this.disableSubmitButton();
        this.getFatalNotice().show();
        this.getSccContainer().removeClass('initialized-scc-container');
        $.spinner().stop(); 
        throw new Error("Unable to load CommerceHub SDK.")
    }

    cardTokenizationSuccess = function(responseBody)
    {
        let cardDetails = responseBody.cardDetails[0];
        
        $('#cardType').val(cardDetails.detailedCardProduct);
        $.spinner().stop();
        
        this.getSubmitButton().trigger('click');
    }

    cardTokenizationFailure = function(error)
    {
        console.log(error);
        this.formAdapter.destroyIframe();
        this.initializeAdapter();
        this.watchSubmitButton();
        throw new Error("Card tokenization failure. Please try again later.");
    }

    submitHandler = (_e) => 
    {
        _e.preventDefault();
        $.spinner().start();
        this.formAdapter.submitForm();
        return false; 
    }

    watchSubmitButton = function() 
    {
        this.getSubmitButton().one('click', this.submitHandler);
    }
    
    unwatchSubmitButton = function()
    {
        this.getSubmitButton().off('click', this.submitHandler);
    }

    disableSubmitButton = function ()
    {
        this.getSubmitButton().prop('disabled', true);
    }

    enableSubmitButton = function ()
    {
        this.getSubmitButton().prop('disabled', false);
    }

    createCommercehubTokenizationForm = function()
    {
        this.formAdapter.createPaymentIframe();
    }

    resetForm = function()
    {
        this.formAdapter.destroyIframe();
        this.getFatalNotice().hide();
        this.getSccContainer().removeClass('initialized-scc-container');
        this.unwatchSubmitButton();
        this.enableSubmitButton();
    }
}