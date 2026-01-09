'use strict';

/**
 * CommerceHub CVV Collector for Stored Payment Instruments
 * This class handles CVV collection for saved cards using Fiserv SDK iFrame
 * Each stored card gets its own CVV field with dynamic ID
 */
class CommercehubCVVCollector
{
    constructor(initializationData)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize CVV collector.");
        }

        this.formConfig = initializationData.config;
        this.configDataPaymentCard = initializationData.config.configData;
        this.credentialsUrl = initializationData.credentialsUrl;
        this.cvvAdapters = {}; // Store adapters by card UUID
        this.currentSelectedPaymentUUID = null;

        this.watchPaymentSelection();
        this.initializeSelectedCardCVV();
        this.initializeMaskingIcons();

        // Expose instance globally for access from checkout form
        window.cvvCollectorInstance = this;
    }

    initializeSelectedCardCVV = function()
    {
        // Initialize CVV for the initially selected payment instrument
        const selectedPayment = $('.saved-payment-instrument.selected-payment');
        if (selectedPayment.length > 0)
        {
            const paymentUUID = selectedPayment.data('uuid');
            this.initializeCVVForCard(paymentUUID);
        }
    }

    initializeCVVForCard = function(cardUUID)
    {
        if (!cardUUID) return;

        // Check if already initialized
        if (this.cvvAdapters[cardUUID])
        {
            this.currentSelectedPaymentUUID = cardUUID;
            console.log(`CVV adapter already exists for card ${cardUUID}`);
            // Note: Button state will be managed by SDK validation callbacks
            return;
        }

        try
        {
            $.spinner().start();
            this.currentSelectedPaymentUUID = cardUUID;

            // Create callbacks specific to this card
            const loadSuccessCallback = () => {
                console.log(`CommerceHub CVV SDK loaded for card ${cardUUID}`);
            };
            const loadFailCallback = (error) => {
                this.cvvLoadFailure(error, cardUUID);
            };
            const formReadyCallback = () => {
                this.cvvInitialized(cardUUID);
            };
            const formValidCallback = () => {
                this.cvvValid(cardUUID);
            };
            const formInvalidCallback = () => {
                this.cvvInvalid(cardUUID);
            };
            const fieldValidityHandler = (data) => {
                this.cvvFieldValidityHandler(data, cardUUID);
            };
            const fieldFocusHandler = (data) => {
                this.cvvFieldFocusHandler(data, cardUUID);
            };

            // Create adapter for this specific card
            const adapter = new FiservCVVIframeAdapter(
                cardUUID,
                loadSuccessCallback,
                loadFailCallback,
                formReadyCallback,
                formValidCallback,
                formInvalidCallback,
                fieldValidityHandler,
                fieldFocusHandler
            );

            this.cvvAdapters[cardUUID] = adapter;
            adapter.initCVVField(this.formConfig);
        }
        catch(err)
        {
            console.log(err);
            this.cvvLoadFailure(err, cardUUID);
        }
    }

    destroyCVVForCard = function(cardUUID)
    {
        if (this.cvvAdapters[cardUUID])
        {
            this.cvvAdapters[cardUUID].destroyCVVIframe();
            delete this.cvvAdapters[cardUUID];
            this.clearCVVValidation(cardUUID);
        }
    }

    clearCVVValidation = function(cardUUID)
    {
        $(`#cvv-security-code-frame-${cardUUID}`)
            .removeClass('sdc-valid-field sdc-error-field sdc-focused-field');
        $(`#cvv-security-code-invalid-message-${cardUUID}`)
            .addClass('sdc-hidden');
    }

    cvvInitialized = function(cardUUID)
    {
        $.spinner().stop();
        this.getSubmitButton().prop('disabled', true); // Disable until CVV is valid
        console.log(`CVV field initialized for card ${cardUUID}`);
    }

    cvvLoadFailure = function (err, cardUUID)
    {
        console.log(err);
        this.getSubmitButton().prop('disabled', true);
        $(`#cvv-fatal-notice-${cardUUID}`).show();
        $.spinner().stop();
        throw new Error(`Unable to load CommerceHub CVV collector for card ${cardUUID}.`)
    }

    cvvValid = function(cardUUID)
    {
        console.log(`CVV valid for card ${cardUUID}`);

        // Only enable button if this is the currently selected card
        if (this.currentSelectedPaymentUUID === cardUUID) {
            this.getSubmitButton().prop('disabled', false);
            console.log(`Submit button enabled for card ${cardUUID}`);
        }
    }

    cvvInvalid = function(cardUUID)
    {
        console.log(`CVV invalid for card ${cardUUID}`);

        // Only disable button if this is the currently selected card
        if (this.currentSelectedPaymentUUID === cardUUID) {
            this.getSubmitButton().prop('disabled', true);
            console.log(`Submit button disabled for card ${cardUUID}`);
        }
    }
    setSessionIdInput = function(sessionId)
    {
        $('input#commercehubSessionIdInput').val(sessionId);
    }

    getSubmitButton = function()
    {
        return $('button.btn.btn-primary.btn-block.submit-payment');
    }

    cvvFieldValidityHandler = function(data, cardUUID)
    {
        let frame = $(`#cvv-security-code-frame-${cardUUID}`);
        let mess = $(`#cvv-security-code-invalid-message-${cardUUID}`);

        if (data["isValid"] === true)
        {
            frame.removeClass('sdc-error-field');
            frame.addClass('sdc-valid-field');
            mess.addClass('sdc-hidden');
        }
        else if (data["shouldShowError"] === true)
        {
            mess.text(this.formConfig['invalidFields']['securityCode'] || 'Invalid CVV');
            frame.removeClass('sdc-valid-field');
            frame.addClass('sdc-error-field');
            mess.removeClass('sdc-hidden');
        }
        else
        {
            frame.removeClass('sdc-valid-field');
            frame.removeClass('sdc-error-field');
            mess.addClass('sdc-hidden');
        }
    }

    cvvFieldFocusHandler = function (data, cardUUID)
    {
        let frame = $(`#cvv-security-code-frame-${cardUUID}`);

        if(frame[0] && frame[0].contains(document.activeElement) === true)
        {
            frame.addClass('sdc-focused-field');
        }
        else
        {
            frame.removeClass('sdc-focused-field');
        }
    }

    watchPaymentSelection = function()
    {
        const self = this;

        // Watch for saved payment instrument selection
        $(document).on('click', '.saved-payment-instrument', function() {
            const clickedPayment = $(this);
            const paymentUUID = clickedPayment.data('uuid');

            // Don't reinitialize if clicking the same card
            if (self.currentSelectedPaymentUUID === paymentUUID) {
                return;
            }

            $('.saved-payment-instrument').removeClass('selected-payment');
            clickedPayment.addClass('selected-payment');

            // Update current selected payment BEFORE disabling button
            self.currentSelectedPaymentUUID = paymentUUID;

            // If card already has adapter (was previously selected), check if it's valid
            if (self.cvvAdapters[paymentUUID]) {
                console.log(`Reusing existing CVV adapter for card ${paymentUUID}`);

                // Check if the CVV field for this card has valid state
                const frame = $(`#cvv-security-code-frame-${paymentUUID}`);
                const hasValidClass = frame.hasClass('sdc-valid-field');

                if (hasValidClass) {
                    // CVV was previously entered and is still valid
                    console.log(`CVV already valid for card ${paymentUUID}, enabling button`);
                    self.getSubmitButton().prop('disabled', false);
                } else {
                    // CVV not valid yet, disable button
                    self.getSubmitButton().prop('disabled', true);
                }
            } else {
                // New adapter needed, disable button until CVV is entered
                self.getSubmitButton().prop('disabled', true);
                self.initializeCVVForCard(paymentUUID);
            }
        });

        // Watch for "Add Payment" button - hide all CVV collectors
        $(document).on('click', '.btn.add-payment', function() {
            $('.cvv-collector-container').hide();
            self.currentSelectedPaymentUUID = null;
            // Enable button for new card entry (no CVV needed)
            self.getSubmitButton().prop('disabled', false);
        });

        // Watch for "Cancel New Payment" button - show CVV collector for selected payment
        $(document).on('click', '.btn.cancel-new-payment', function() {
            const selectedPayment = $('.saved-payment-instrument.selected-payment');
            if (selectedPayment.length > 0)
            {
                const paymentUUID = selectedPayment.data('uuid');
                self.currentSelectedPaymentUUID = paymentUUID;
                $('.cvv-collector-container').show();

                // Check if CVV is already valid for this card
                if (self.cvvAdapters[paymentUUID]) {
                    const frame = $(`#cvv-security-code-frame-${paymentUUID}`);
                    const hasValidClass = frame.hasClass('sdc-valid-field');

                    if (hasValidClass) {
                        self.getSubmitButton().prop('disabled', false);
                    } else {
                        self.getSubmitButton().prop('disabled', true);
                    }
                } else {
                    // Disable button until CVV is validated
                    self.getSubmitButton().prop('disabled', true);
                    self.initializeCVVForCard(paymentUUID);
                }
            }
        });
    }

    storeCVVData = function(encryptedCVV)
    {
        $('input#storedCardCVVInput').val(encryptedCVV);
    }

    submitCVVForValidation = function(callback)
    {
        const currentCardUUID = this.currentSelectedPaymentUUID;

        if (!currentCardUUID || !this.cvvAdapters[currentCardUUID])
        {
            // No CVV needed for new card entry
            callback(null);
            return;
        }

        $.spinner().start();

        new Promise((resolve, reject) => {
            FiservSDKHelper.backendCall(
                this.credentialsUrl,
                resolve,
                reject,
                {
                    requestPurpose: "CVV",
                    paymentUUID: currentCardUUID
                }
            );
        })
        .then((credentialsResponse) => {
            this.cvvAdapters[currentCardUUID].submitCVV(credentialsResponse, (encryptedCVV) => {
                this.storeCVVData(encryptedCVV);
                this.setSessionIdInput(credentialsResponse['sessionId']);
                $.spinner().stop();
                callback(null);
            }, (error) => {
                $.spinner().stop();
                callback(error || 'CVV validation failed');
            });
        })
        .catch((error) => {
            console.log(error);
            $.spinner().stop();
            callback('Failed to get CVV credentials');
        });
    }

    get cvvIframeActive()
    {
        return this.currentSelectedPaymentUUID && this.cvvAdapters[this.currentSelectedPaymentUUID];
    }

    initializeMaskingIcons = function()
    {
        const self = this;
        // Use event delegation to handle dynamically created masking icons
        $(document).on('click', '[id^="cvv-mask-securityCode-"]', function(element) {
            self.maskCVV(element);
        });
    }

    maskCVV = function(element)
    {
        element.preventDefault();

        let field = element.target;
        let id = field.id.replace(/cvv-mask-securityCode-/, "");
        let jQueryObject = $('#' + field.id);

        // Get the adapter for this specific card
        const adapter = this.cvvAdapters[id];
        if (!adapter) {
            console.warn('No CVV adapter found for card:', id);
            return;
        }

        if(jQueryObject.hasClass('sdc-unmasking-icon'))
        {
            jQueryObject.removeClass('sdc-unmasking-icon');
            jQueryObject.addClass('sdc-masking-icon');
            adapter.unmaskCVV();
        }
        else
        {
            jQueryObject.removeClass('sdc-masking-icon');
            jQueryObject.addClass('sdc-unmasking-icon');
            adapter.maskCVV();
        }
    }
}

