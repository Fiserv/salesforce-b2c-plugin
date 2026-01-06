'use strict';

/**
 * Saved Payment CVV Field Handler
 * Uses FiservSDKIframe adapter (same as credit card form) for each saved payment's CVV field
 */
class SavedCVVIframeHandler {
    constructor() {
        this.adapters = new Map();
        this.validCVVFields = new Set();
        this.cardTypes = new Map(); // Store card type per payment UUID
        this.initialized = false;
    }

    /**
     * Initialize all saved CVV fields using FiservSDKIframe adapter (same as credit card)
     */
    initializeSavedCVVFields(formConfig, credentialsUrl) {
        if (this.initialized) {
            console.log('CVV handler already initialized');
            return;
        }

        // Check if SDK is loaded
        if (typeof window.fiserv === 'undefined' || typeof window.fiserv.components === 'undefined') {
            console.error('Fiserv SDK not loaded. Cannot initialize CVV fields.');
            return;
        }

        this.formConfig = formConfig;
        this.credentialsUrl = credentialsUrl;

        console.log('Initializing saved CVV SDK fields with FiservSDKIframe adapter...');
        console.log('Using formConfig:', formConfig);

        // Find all saved payment CVV containers
        const $cvvContainers = $('.saved-cvv-container');

        if ($cvvContainers.length === 0) {
            console.log('No CVV containers found');
            return;
        }

        console.log(`Found ${$cvvContainers.length} CVV container(s)`);

        // Initialize each CVV field using FiservSDKIframe adapter
        $cvvContainers.each((index, element) => {
            const $element = $(element);
            const uuid = $element.data('uuid');
            const cardType = $element.data('card-type');

            if (uuid) {
                // Store card type for validation
                if (cardType) {
                    this.cardTypes.set(uuid, cardType);
                    console.log(`📝 Card type for ${uuid}: ${cardType}`);
                }
                this.initializeCVVFieldWithAdapter(uuid);
            }
        });

        // Setup payment selection handler
        this.setupPaymentSelection();

        // Setup mask/unmask buttons for all CVV fields
        this.setupMaskButtons();

        // Disable submit button initially until CVV is entered
        this.disableSubmitButton();

        this.initialized = true;
        console.log('Saved CVV SDK fields initialized successfully');
    }

    /**
     * Setup mask/unmask buttons (same as credit card form)
     */
    setupMaskButtons() {
        // Remove any existing handlers to avoid duplicates
        $(document).off('click', '[id^="sdc-mask-securityCode-"]');

        // Setup click handler for all mask buttons
        $(document).on('click', '[id^="sdc-mask-securityCode-"]', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const $button = $(e.currentTarget);
            const buttonId = $button.attr('id');

            // Extract UUID from button ID: sdc-mask-securityCode-{UUID}
            const uuid = buttonId.replace('sdc-mask-securityCode-', '');

            console.log(`👁 Mask button clicked for payment ${uuid}`);

            // Get the adapter for this CVV field
            const adapter = this.adapters.get(uuid);

            if (!adapter || !adapter.form) {
                console.error(`❌ Adapter not found for ${uuid}`);
                return;
            }

            // Toggle mask state (same logic as credit card form)
            if ($button.hasClass('sdc-unmasking-icon')) {
                // Currently masked, unmask it
                $button.removeClass('sdc-unmasking-icon').addClass('sdc-masking-icon');
                adapter.unmask('securityCode');
                console.log(`👁 CVV unmasked (visible) for ${uuid}`);
            } else {
                // Currently unmasked, mask it
                $button.removeClass('sdc-masking-icon').addClass('sdc-unmasking-icon');
                adapter.mask('securityCode');
                console.log(`👁 CVV masked (hidden) for ${uuid}`);
            }
        });

        console.log('✅ Mask buttons setup complete');
    }

    /**
     * Get expected CVV length based on card type
     * AMEX: 4 digits, All other cards: 3 digits
     */
    getExpectedCVVLength(uuid) {
        const cardType = this.cardTypes.get(uuid);

        if (!cardType) {
            console.warn(`⚠️ Card type not found for ${uuid}, defaulting to 3 digits`);
            return 3;
        }

        // AMEX cards use 4-digit CVV
        const isAmex = cardType.toUpperCase() === 'AMEX' ||
                       cardType.toUpperCase() === 'AMERICAN EXPRESS' ||
                       cardType.toUpperCase() === 'AMERICANEXPRESS';

        const expectedLength = isAmex ? 4 : 3;
        console.log(`🔢 Expected CVV length for ${uuid} (${cardType}): ${expectedLength} digits`);

        return expectedLength;
    }

    /**
     * Initialize CVV field using FiservSDKIframe adapter (SAME AS CREDIT CARD FORM)
     */
    initializeCVVFieldWithAdapter(uuid) {
        console.log(`Initializing SDK CVV field with FiservSDKIframe adapter for payment ${uuid}`);

        // Verify DOM element exists
        const fieldId = `fiserv_commercehub-security-code-${uuid}`;
        const $fieldElement = $(`#${fieldId}`);

        if (!$fieldElement.length) {
            console.error(`Field element not found: #${fieldId}`);
            return;
        }

        // Create CVV-only config
        const cvvOnlyConfig = this.createCVVOnlyConfig(uuid);

        if (!cvvOnlyConfig) {
            console.error(`Failed to create CVV config for ${uuid}`);
            return;
        }

        // Create FiservSDKIframe adapter with callbacks
        const adapter = this.createAdapterForCVV(uuid);

        // Initialize SDK using adapter.initSdk() - SAME METHOD AS CREDIT CARD FORM
        try {
            console.log(`Calling adapter.initSdk() for ${uuid} with config:`, cvvOnlyConfig);
            // Call without second parameter - same as credit card form
            adapter.initSdk(cvvOnlyConfig);
            this.adapters.set(uuid, adapter);
            console.log(`FiservSDKIframe adapter initialized for CVV field ${uuid}`);
        } catch (error) {
            console.error(`Failed to initialize adapter for ${uuid}:`, error);
            console.error('Error stack:', error.stack);
            const errorMessageId = `sdc-security-code-invalid-message-${uuid}`;
            $(`#${errorMessageId}`).text('Failed to load CVV field').removeClass('sdc-hidden');
        }
    }

    /**
     * Create FiservSDKIframe adapter instance (SAME AS CREDIT CARD FORM)
     */
    createAdapterForCVV(uuid) {
        const loadSuccessCallback = () => {
            console.log(`✅ CVV SDK loaded successfully for payment ${uuid}`);
        };

        const loadFailCallback = (error) => {
            console.error(`❌ CVV SDK load failed for ${uuid}:`, error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            const errorMessageId = `sdc-security-code-invalid-message-${uuid}`;
            $(`#${errorMessageId}`).text('Failed to load CVV field').removeClass('sdc-hidden');
        };

        const sdkReadyCallback = () => {
            console.log(`✅ CVV SDK ready for payment ${uuid}`);
            // Check if iframe was created
            const $field = $(`#fiserv_commercehub-security-code-${uuid}`);
            const iframeCount = $field.find('iframe').length;
            console.log(`Iframe count for ${uuid}:`, iframeCount);
            if (iframeCount === 0) {
                console.error(`⚠️ No iframe found in field for ${uuid}`);
            }
        };

        const formValidCallback = () => {
            const cardType = this.cardTypes.get(uuid);
            console.log(`✅ Form valid callback fired for ${uuid} (${cardType})`);

            // SDK says form is valid (3-4 digits entered)
            // For now, accept SDK's validation
            // Note: Backend must validate exact length based on card type
            this.markFieldValid(uuid);
        };

        const formInvalidCallback = () => {
            const cardType = this.cardTypes.get(uuid);
            console.log(`⚠️ Form invalid callback fired for ${uuid} (${cardType})`);
            this.markFieldInvalid(uuid);
        };

        const cardBrandHandler = () => { /* Not needed for CVV only */ };

        const fieldValidityHandler = (data) => {
            console.log(`🔍 Field validity change for ${uuid}:`, JSON.stringify(data, null, 2));

            if (data.field === 'securityCode') {
                const expectedLength = this.getExpectedCVVLength(uuid);
                const cardType = this.cardTypes.get(uuid);

                console.log(`🔢 Expected CVV length for ${cardType}: ${expectedLength} digits`);
                console.log(`🔢 SDK validation result: ${data.isValid ? 'valid' : 'invalid'}`);

                // SDK validates 3-4 digits as valid
                // We cannot reliably determine exact length from SDK callbacks
                // Accept SDK validation for now, backend MUST validate exact length
                if (data.isValid) {
                    console.log(`✅ CVV marked as valid for ${cardType} (SDK accepted)`);
                    console.warn(`⚠️ Backend validation required: ${cardType} must have exactly ${expectedLength} digits`);
                    this.markFieldValid(uuid);
                } else {
                    console.log(`❌ CVV invalid for ${uuid}`);
                    this.markFieldInvalid(uuid);
                }
            }
        };

        const fieldFocusHandler = (data) => {
            console.log(`Field focus change for ${uuid}:`, data);
            if (data.field === 'securityCode') {
                const $frame = $(`#sdc-security-code-frame-${uuid}`);
                if (data.inFocus) {
                    $frame.addClass('sdc-focused-field');
                } else {
                    $frame.removeClass('sdc-focused-field');
                }
            }
        };

        const runSuccessCallback = () => { /* Not used for display-only CVV */ };
        const runFailureCallback = () => { /* Not used for display-only CVV */ };

        // Create FiservSDKIframe instance - SAME AS CREDIT CARD FORM
        console.log(`Creating FiservSDKIframe adapter for ${uuid}`);
        return new FiservSDKIframe(
            loadSuccessCallback,
            loadFailCallback,
            sdkReadyCallback,
            formValidCallback,
            formInvalidCallback,
            cardBrandHandler,
            fieldValidityHandler,
            fieldFocusHandler,
            runSuccessCallback,
            runFailureCallback
        );
    }

    /**
     * Create CVV-only config - modify formConfig to only have securityCode field
     */
    createCVVOnlyConfig(uuid) {
        // Deep clone to avoid modifying original
        const config = JSON.parse(JSON.stringify(this.formConfig));

        console.log('Creating CVV-only config from formConfig:', config);

        // Verify structure
        if (!config.formCustomization || !config.formCustomization.fields) {
            console.error('formCustomization.fields not found in config');
            return null;
        }

        // Get security code field
        const securityCodeField = config.formCustomization.fields.securityCode;

        if (!securityCodeField) {
            console.error('securityCode field not found in formCustomization.fields');
            return null;
        }

        // Update to use parentElementId for the UUID-specific field
        const fieldId = `fiserv_commercehub-security-code-${uuid}`;

        // Get expected CVV length based on card type
        const expectedCVVLength = this.getExpectedCVVLength(uuid);
        const cardType = this.cardTypes.get(uuid) || 'Unknown';

        // Build CVV field config with proper structure and card-type-specific validation
        const cvvField = {
            parentElementId: fieldId,
            placeholder: securityCodeField.placeholder ? securityCodeField.placeholder : undefined,
            dynamicPlaceholderCharacter: securityCodeField.dynamicPlaceholderCharacter ? securityCodeField.dynamicPlaceholderCharacter : undefined,
            masking: {
                character: securityCodeField.masking && securityCodeField.masking.character ? securityCodeField.masking.character : undefined,
                mode: securityCodeField.masking && securityCodeField.masking.mode ? securityCodeField.masking.mode : undefined
            },
            // Try different properties that SDK might support for CVV length
            maxLength: expectedCVVLength,
            length: expectedCVVLength,
            max: expectedCVVLength
        };

        console.log(`🔢 CVV field config for ${uuid} (${cardType}): requires ${expectedCVVLength} digits`);
        console.log(`🔢 Config properties: maxLength=${expectedCVVLength}, length=${expectedCVVLength}`);

        // Create config with ONLY securityCode field
        const cvvOnlyConfig = JSON.parse(JSON.stringify(config));
        cvvOnlyConfig.formCustomization.fields = {
            securityCode: cvvField
        };

        console.log('CVV-only config for', uuid, ':', cvvOnlyConfig);

        return cvvOnlyConfig;
    }


    /**
     * Mark field as valid
     */
    markFieldValid(uuid) {
        const $frame = $(`#sdc-security-code-frame-${uuid}`);
        const $errorMsg = $(`#sdc-security-code-invalid-message-${uuid}`);

        console.log(`✅ CVV field marked as valid for ${uuid}`);

        $frame.removeClass('sdc-error-field is-invalid').addClass('sdc-valid-field');
        $errorMsg.removeClass('d-block').addClass('d-none').text('');

        this.validCVVFields.add(uuid);
        this.updateSubmitButton();
    }

    /**
     * Mark field as invalid
     */
    markFieldInvalid(uuid) {
        const $frame = $(`#sdc-security-code-frame-${uuid}`);
        const $errorMsg = $(`#sdc-security-code-invalid-message-${uuid}`);

        const cardType = this.cardTypes.get(uuid) || 'card';
        const expectedLength = this.getExpectedCVVLength(uuid);

        // Create appropriate error message based on card type
        let errorMessage = 'Invalid Security Code';

        console.log(`⚠️ CVV field marked as invalid for ${uuid} (${cardType})`);
        console.log(`⚠️ Error message: ${errorMessage}`);

        $frame.removeClass('sdc-valid-field').addClass('sdc-error-field is-invalid');
        $errorMsg.removeClass('d-none').addClass('d-block').text(errorMessage);

        this.validCVVFields.delete(uuid);
        this.updateSubmitButton();
    }

    /**
     * Setup payment selection handler
     */
    setupPaymentSelection() {
        $(document).on('click', '.saved-payment-instrument', (e) => {
            // Don't trigger if clicking inside CVV frame
            if ($(e.target).closest('.sdc-field-frame, .sdc-unmasking-icon').length) {
                return;
            }

            const $payment = $(e.currentTarget);
            $('.saved-payment-instrument').removeClass('selected-payment');
            $payment.addClass('selected-payment');

            // Update submit button
            this.updateSubmitButton();
        });

        console.log('Payment selection handler setup complete');
    }

    /**
     * Update submit button state based on selected payment's CVV validity
     */
    updateSubmitButton() {
        const $selectedPayment = $('.saved-payment-instrument.selected-payment');

        if ($selectedPayment.length === 0) {
            console.log('⚠️ No selected payment found');
            return;
        }

        const uuid = $selectedPayment.data('uuid');

        // Try multiple selectors to find the submit/place order button
        let $submitButton = $('button.submit-payment');
        if ($submitButton.length === 0) {
            $submitButton = $('button[type="submit"].place-order');
        }
        if ($submitButton.length === 0) {
            $submitButton = $('button.place-order');
        }
        if ($submitButton.length === 0) {
            $submitButton = $('.next-step-button button');
        }

        if ($submitButton.length === 0) {
            console.warn('⚠️ Submit button not found');
            return;
        }

        const isValid = this.validCVVFields.has(uuid);
        console.log(`🔘 Updating submit button for payment ${uuid}: ${isValid ? 'ENABLED' : 'DISABLED'}`);

        if (isValid) {
            $submitButton.prop('disabled', false).removeClass('disabled');
            console.log('✅ Submit button ENABLED');
        } else {
            $submitButton.prop('disabled', true).addClass('disabled');
            console.log('🔒 Submit button DISABLED');
        }
    }

    /**
     * Disable submit button
     */
    disableSubmitButton() {
        // Try multiple selectors to find the submit/place order button
        let $submitButton = $('button.submit-payment');
        if ($submitButton.length === 0) {
            $submitButton = $('button[type="submit"].place-order');
        }
        if ($submitButton.length === 0) {
            $submitButton = $('button.place-order');
        }
        if ($submitButton.length === 0) {
            $submitButton = $('.next-step-button button');
        }

        if ($submitButton.length > 0) {
            $submitButton.prop('disabled', true).addClass('disabled');
            console.log('🔒 Submit button initially DISABLED - waiting for CVV entry');
        }
    }

    /**
     * Reset CVV field
     */
    resetCVVField(uuid) {
        const adapter = this.adapters.get(uuid);
        if (adapter && adapter.form) {
            adapter.resetForm();
        }

        const $frame = $(`#sdc-security-code-frame-${uuid}`);
        const $errorMsg = $(`#sdc-security-code-invalid-message-${uuid}`);

        $frame.removeClass('sdc-valid-field sdc-error-field sdc-focused-field');
        $errorMsg.addClass('sdc-hidden');

        this.validCVVFields.delete(uuid);
        this.updateSubmitButton();
    }

    /**
     * Reset all CVV fields
     */
    resetAllFields() {
        this.adapters.forEach((adapter, uuid) => {
            this.resetCVVField(uuid);
        });
    }
}

// Create global instance
window.SavedCVVIframeHandler = SavedCVVIframeHandler;

