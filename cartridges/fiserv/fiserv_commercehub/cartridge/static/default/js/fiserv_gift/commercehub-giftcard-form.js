"use strict"

class CommercehubGiftForm
{
    constructor(formConfigUrl, credentialsUrl, balanceUrl, applyUrl, giftRemoveUrl, giftLineItemText)
    {
        if (typeof(formConfigUrl) === "undefined" || typeof(credentialsUrl) === "undefined")
        {
            throw new Error("Credentials endpoint not found. Unable to create CommerceHub Hosted Payment Page.");
        }
        this.formConfigUrl = formConfigUrl;
        this.credsUrl = credentialsUrl;
        this.balanceUrl = balanceUrl;
        this.applyUrl = applyUrl;
        this.giftRemoveUrl = giftRemoveUrl;
        this.giftLineItemText = giftLineItemText;

        this.createAdapter();
        
        // Only run this if loaded in checkout page...
        if(applyUrl !== null)
        {
            this.showGiftCards();
        }
    }
    
    initialize = function()
    {
        try {
            $.spinner().start();
            this.initializeAdapter();
            this.watchFormButtons();
        } catch (_err) {
            this.sdkLoadFailure(_err);
        }
    }

    createAdapter = function()
    {
        let loadSuccessCallback = () => { console.log("CommerceHub Gift SDK has loaded."); };
        let loadFailCallback = (error) => { this.sdkLoadFailure(error); };
        let formReadyCallback = () => { this.sdkInitialized() };
        let formValidCallback = () => { this.enableFormButtons(); };
        let formInvalidCallback = () => { this.disableFormButtons(); };
        let cardBrandHandler = (brand) => { null };
        let fieldValidityHandler = (data) => { this.fieldValidityHandler(data); };
        let fieldFocusHandler = (data) => { this.fieldFocusHandler(data) };
        let runSuccessCallback = (responseBody) => { this.cardCaptureSuccess(responseBody); };
        let runFailureCallback = (error) => { this.cardCaptureFailure(error); };

        this.formAdapter = new FiservIframe(
            loadSuccessCallback,
            loadFailCallback,
            formReadyCallback,
            formValidCallback,
            formInvalidCallback,
            cardBrandHandler,
            fieldValidityHandler,
            fieldFocusHandler,
            runSuccessCallback,
            runFailureCallback);
    }

    initializeAdapter = function()
    {
        this.clearValidation();

        new Promise((resolve, reject) => {
            this.formAdapter.backendCall(this.formConfigUrl, resolve, reject);	
        }).then((formConfig) => 
        {
            this.formConfig = formConfig;
            this.configDataGift = formConfig.configData;
            this.formAdapter.initSdk(formConfig, 'GIFT');
            $('#sdc-mask-gift-cardNumber, #sdc-mask-gift-securityCode').on('click', (element) => {this.mask(element);});
        }).catch((err) => 
        {
            console.log(err);
            throw new Error(err);
        });
    }

    clearValidation = function()
    {
        this.getFormButtons().prop('disabled', true);
        $('#sdc-gift-card-number-frame, #sdc-gift-security-code-frame')
            .removeClass('sdc-valid-field sdc-error-field sdc-focused-field');
        $('#sdc-gift-card-number-invalid-message, #sdc-gift-security-code-invalid-message')
            .addClass('sdc-hidden');
    }

    setPrimarySessionIdInput = function(sessionId)
    {
        $('input#commercehubGiftPrimarySessionIdInput').val(sessionId);
    }

    setSecondarySessionIdInput = function(sessionId)
    {
        $('input#commercehubGiftSecondarySessionIdInput').val(sessionId);
    }

    clearSessionIds = function()
    {
        $('input#commercehubGiftPrimarySessionIdInput, input#commercehubGiftSecondarySessionIdInput').val('');
    }

    getSubmitButton = function()
    {
        return $('#gift-submit-button');
    }

    getBalanceButton = function()
    {
        return $('#gift-balance-button');
    }

    getFormButtons = function()
    {
        return $('#gift-submit-button, #gift-balance-button');
    }

    getSccContainer = function()
    {
        return $('#fiserv-commercehub-gift-form-container');
    }

    getBalanceBlock = function()
    {
        return $('#fiserv-scc-gift-balance');
    }

    getFatalNotice = function()
    {
        return $('#fiserv-scc-gift-fatal-notice');
    }

    sdkInitialized = function() 
    {
        $.spinner().stop();
    }

    sdkLoadFailure = function (err) 
    {
        console.log(err);
        this.disableFormButtons();
        this.getFatalNotice().show();
        $.spinner().stop(); 
        throw new Error("Unable to load CommerceHub SDK.")
    }

    cardCaptureSuccess = async function(responseBody)
    {
        if(this.getSubmitButton().length && this.buttonClicked === 'applyPrimary')
        {
            this.buttonClicked = 'applySecondary';
            this.formAdapter.submitForm(this.credsUrl, this.setSecondarySessionIdInput);
            return;
        }

        try {
            await new Promise((resolve, reject) => {
                if(this.buttonClicked === 'balance')
                {
                    this.formAdapter.backendCall(this.balanceUrl, resolve, reject, { sessionId : $('input#commercehubGiftPrimarySessionIdInput')[0].value });
                }
                else if(this.getSubmitButton().length && this.buttonClicked === 'applySecondary')
                {
                    // Run in a timeout to avoid velocity
                    setTimeout(() => {
                        this.formAdapter.backendCall(this.applyUrl, resolve, reject, {
                            primarySessionId : $('input#commercehubGiftPrimarySessionIdInput')[0].value,
                            secondarySessionId : $('input#commercehubGiftSecondarySessionIdInput')[0].value,
                        })
                    }, 1000);
                }
            }).then((response) => 
            {
                if(this.buttonClicked === 'balance')
                {
                    $('#fiserv-scc-gift-balance-amount').text(response.currencySymbol + response.balance + ' (' + response.currency + ')');
                    this.getBalanceBlock().removeClass('sdc-hidden');
                }
                else if(this.buttonClicked === 'applySecondary')
                {
                    this.addGiftCardRow(response, response.amountRemaining);
                    this.showSuccess(response.successMessage);
                    this.formAdapter.destroyIframe('gift');
                    this.initializeAdapter();
                    if(response.paymentCovered)
                    {
                        this.hidePaymentBlock();
                    }
                }
            }).catch((err) => 
            {
                if(this.buttonClicked === 'balance')
                {
                    $('#fiserv-scc-gift-balance-amount').text('');
                    this.getBalanceBlock().addClass('sdc-hidden');
                }
                throw new Error(err.responseJSON.error );
            });
        } catch (e) {
            this.buttonClicked = null;
            this.watchFormButtons();
            this.showError(e.message);
            $.spinner().stop();
            return;
        }

        this.clearSessionIds
        this.buttonClicked = null;
        this.watchFormButtons();
        $.spinner().stop();
    }

    showError = function(message)
    {
        let container = $('#fiserv-scc-gift-alert-container');
        $('.alert', container).remove();
        container.prepend('<div class="alert alert-danger" role="alert">' + message + '</div>');
    }

    showSuccess = function(message)
    {
        let container = $('#fiserv-scc-gift-alert-container');
        $('.alert', container).remove();
        container.prepend('<div class="alert alert-success" role="alert">' + message + '</div>');
        setTimeout(() => {
            $('#fiserv-scc-gift-alert-container').children('.alert-success').remove();
        }, 5000);
    }

    clearAlerts = function()
    {
        let container = $('#fiserv-scc-gift-alert-container');
        $('.alert', container).remove();
    }

    showGiftCards = function()
    {
        let giftInfoJson = $('#fiserv-scc-gift-card-info-container').attr('data-gift-card-list-json');
        if(giftInfoJson)
        {
            let giftCardsInfo = JSON.parse(giftInfoJson)
            giftCardsInfo.giftCardList.forEach((giftCardInfo) => {
                this.addGiftCardRow(giftCardInfo, giftCardsInfo.amountRemaining);
            });
            $('#fiserv-scc-gift-card-info-container').removeAttr('data-gift-card-list-json');

            // Hide payment block if cards cover the total
            if(giftCardsInfo.paymentCovered)
            {
                this.hidePaymentBlock();
            }
        }
    }

    addGiftCardRow = function(giftCardInfo, amountRemaining)
    {
        $('<div id="' + giftCardInfo.uuid + '"class="row gift-total leading-lines gift-payment-summary">'
            + '<div class="col-6 start-lines">'
                + '<p class="order-receipt-label"><span>' + this.giftLineItemText.title + '&nbsp;<button class="btn btn-outline-primary rmv-btn">' + this.giftLineItemText.remove + '</button></span></p>'
            + '</div>'
            + '<div class="col-6 end-lines">'
                + '<p class="text-right"><span class="gift-total-sum">-' + giftCardInfo.currencySymbol + giftCardInfo.paymentAmount + '</span></p>'
            + '</div>'
        + '</div>'
        ).insertBefore('.grand-total');

        $('.grand-total-sum').text(giftCardInfo.currencySymbol + amountRemaining);

        $('#' + giftCardInfo.uuid).find('button').on('click', () => {this.removeGiftCard(giftCardInfo.uuid);})
        
        // As far as why this field is only loaded on refresh and not on stage transition, I have no idea :/...
        // If you are seeing this as an integrator and are upset with me, I am sorry :(
        if($('.gift-card-item').length)
        {
            $('.gift-card-item').next().remove();
            $('.gift-card-item').remove();
        }

        if(!$('.gift-details').length)
        {
            $('<div class="gift-details"></div>').insertBefore('.payment-details');
        }
        $('.gift-details').append('<div class="giftDetail' + giftCardInfo.uuid + '">' + this.giftLineItemText.title + '&nbsp;-&nbsp;<span>' + giftCardInfo.currencySymbol + giftCardInfo.paymentAmount + '</span></div><br class="giftDetail' + giftCardInfo.uuid + '">');
    }

    removeGiftCard = function(uuid)
    {
        this.clearAlerts();
        this.getBalanceBlock().addClass('sdc-hidden');
        this.unwatchFormButtons();
        
        let promise = new Promise((resolve, reject) => {
            this.formAdapter.backendCall(this.giftRemoveUrl, resolve, reject, { uuid: uuid });
        });

        promise.then((response) => 
        {
            $('#' + uuid).remove();
            $('.giftDetail' + uuid).remove();
            let giftDetailsQuery = $('.gift-details');
            if(!giftDetailsQuery.children('div').length)
            {
                giftDetailsQuery.remove();
            }
            
            this.updateGiftCards(response.updatedGiftCards);
            $('.grand-total-sum').text(response.currencySymbol + response.amountRemaining);

            if(!response.paymentCovered && $('.payment-information').parent().hasClass('checkout-hidden'))
            {
                this.showPaymentBlock();
            }

            if($('.data-checkout-stage').attr('data-checkout-stage') === "placeOrder")
            {
                $('.payment-summary .edit-button').trigger('click');
            }
            
            this.showSuccess(response.successMessage);
            this.watchFormButtons();
        }).catch((err) =>
        {
            this.showError(err.responseJSON.error);
            this.watchFormButtons();
        });
    }

    updateGiftCards = function(giftCards)
    {
        giftCards.forEach((giftCardInfo) => {
            let cardBlockQuery = $('#' + giftCardInfo.oldUuid);
            cardBlockQuery.attr('id', giftCardInfo.uuid);
            cardBlockQuery.find('.gift-total-sum').text('-' + giftCardInfo.currencySymbol + giftCardInfo.paymentAmount);
            cardBlockQuery.find('button').off('click');
            cardBlockQuery.find('button').on('click', () => {this.removeGiftCard(giftCardInfo.uuid);})

            let oldClass = 'giftDetail' + giftCardInfo.oldUuid;
            let cardSummaryQuery = $('.' + oldClass);
            cardSummaryQuery.removeClass(oldClass).addClass('giftDetail' + giftCardInfo.uuid);
            cardSummaryQuery.children('span').text(giftCardInfo.currencySymbol + giftCardInfo.paymentAmount);
        });
    }

    hidePaymentBlock = function()
    {
        $('input[name=dwfrm_billing_paymentMethod]').val('GIFT_CARD');
        $('.payment-information').parent().addClass('checkout-hidden');
        $('.payment-details').addClass('checkout-hidden');
        $('.gift-details').children().last().addClass('checkout-hidden');
        let subitButtonQuery = $('.submit-payment');
        if(subitButtonQuery.attr('disabled'))
        {
            subitButtonQuery.prop("disabled", false);
            this.paymentBlockWasDisabled = true;
        }
    }

    showPaymentBlock = function()
    {
        $('input[name=dwfrm_billing_paymentMethod]').val($(".payment-information").attr("data-payment-method-id"));
        $('.payment-information').parent().removeClass('checkout-hidden');
        $('.payment-details').removeClass('checkout-hidden');
        $('.gift-details').children().last().removeClass('checkout-hidden');
        if(this.paymentBlockWasDisabled)
        {
            $('.submit-payment').prop("disabled", true);
            this.paymentBlockWasDisabled = false;
        }
    }

    cardCaptureFailure = function(error)
    {
        this.formAdapter.destroyIframe('gift');
        this.initializeAdapter();
        this.watchFormButtons();
        this.showError(this.configDataGift.captureFailureMessage);
    }

    submitHandler = (_e) => 
    {
        _e.preventDefault();
        $.spinner().start();
        this.clearAlerts();
        this.getBalanceBlock().addClass('sdc-hidden');
        this.unwatchFormButtons();
        this.buttonClicked = "applyPrimary";
        this.formAdapter.submitForm(this.credsUrl, this.setPrimarySessionIdInput);
        return false;
    }

    balanceHandler = (_e) =>
    {
        _e.preventDefault();
        $.spinner().start();
        this.clearAlerts();
        this.unwatchFormButtons();
        this.buttonClicked = "balance";
        this.formAdapter.submitForm(this.credsUrl, this.setPrimarySessionIdInput);
        return false;
    }

    watchFormButtons = function()
    {
        this.getSubmitButton().on('click', this.submitHandler);
        this.getBalanceButton().on('click', this.balanceHandler);
    }
    
    unwatchFormButtons = function()
    {
        this.getSubmitButton().off('click', this.submitHandler);
        this.getBalanceButton().off('click', this.balanceHandler);
    }

    disableFormButtons = function ()
    {
        this.getFormButtons().prop('disabled', true);
    }

    enableFormButtons = function ()
    {
        this.getFormButtons().prop('disabled', false);
    }

    resetForm = function()
    {
        this.formAdapter.destroyIframe('gift');
        this.getFatalNotice().hide();
        this.getSccContainer().removeClass('initialized-scc-container');
        this.unwatchFormButtons();
    }

    getSdcFieldFrame = function(name)
    {
        switch(name)
        {
            case "cardNumber":
                return $('#sdc-gift-card-number-frame');
            case "securityCode":
                return $('#sdc-gift-security-code-frame');
        }

        return undefined;
    }

    getSdcFieldInvalidMessageContainer = function(name)
    {
        switch(name)
        {
            case "cardNumber":
                return $('#sdc-gift-card-number-invalid-message');
            case "securityCode":
                return $('#sdc-gift-security-code-invalid-message');
        }               

        return undefined;
    }

    getSdcInvalidFieldMessageText = function(name)
    {
        let invalidFields = this.formConfig['invalidFields'];

        switch(name)    
        {       
            case "cardNumber":
                return invalidFields["cardNumber"];
            case "securityCode":
                return invalidFields["securityCode"];
        }

        return "";
    }

    fieldValidityHandler = function(data)
    {
        let frame = this.getSdcFieldFrame(data["field"]);
        let mess = this.getSdcFieldInvalidMessageContainer(data["field"]);

        if (typeof(frame) !== "undefined")
        {
            if (data["isValid"] === true)
            {
                frame.removeClass('sdc-error-field');
                frame.addClass('sdc-valid-field');
                mess.addClass('sdc-hidden');
            } else if (data["shouldShowError"] === true)
            {
                mess.text(this.getSdcInvalidFieldMessageText(data["field"]));
                frame.removeClass('sdc-valid-field');
                frame.addClass('sdc-error-field');
                mess.removeClass('sdc-hidden');
            } else
            {
                frame.removeClass('sdc-valid-field');
                frame.removeClass('sdc-error-field');
                mess.addClass('sdc-hidden');
            }
        }
    }

    fieldFocusHandler = function (data)
    {
        let frame = this.getSdcFieldFrame(data);
        
        if(typeof(frame) !== "undefined")
        {
            if(frame[0].contains(document.activeElement) === true)
            {
                frame.addClass('sdc-focused-field');
            }
            else
            {
                frame.removeClass('sdc-focused-field');
            }
        }
    }

    mask = function(element)
    {
        element.preventDefault();

        let field = element.target;
        let id = field.id.replace(/sdc-mask-gift-/, "");
        let jQueryObject = $('#' + field.id);

        if(jQueryObject.hasClass('sdc-unmasking-icon'))
        {
            jQueryObject.removeClass('sdc-unmasking-icon');
            jQueryObject.addClass('sdc-masking-icon');
            this.formAdapter.unmask(id);
        }
        else
        {
            jQueryObject.removeClass('sdc-masking-icon');
            jQueryObject.addClass('sdc-unmasking-icon');
            this.formAdapter.mask(id);
        }
    }
}