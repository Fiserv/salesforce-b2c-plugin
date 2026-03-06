'use strict';

class CommercehubPaze
{

    constructor(initializationData)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize Paze button.");
        }

        this.formConfig = initializationData.config;
        this.configDataPaze = initializationData.config.configData;
        this.credentialsUrl = initializationData.credentialsUrl;
        this.logoUrl = initializationData.logoUrl || '/images/paze.svg';
        this.credentials = null;
        this.completePayment = (status) => { console.log("Paze completePayment:", status); };
        this.loadFailCallback = (error) => { this.sdkLoadFailure(error); };
        this.watchButtonLoadLag();
        this.watchSubmitResponse();
        this.watchPaymentMethod();
    }

    initialize = async function()
    {
        console.log("Initializing CommercehubPaze...");
        try {
            $.spinner().start();
            $('#fiserv-paze-fatal-notice').hide();

            await this.initSdk();

            $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
        } catch (_err) {
            this.sdkLoadFailure(_err);
        }
    }

    initSdk = async function()
    {
        let loadSuccessCallback = () => { 
            this.sdkInitialized();
        };
        let loadFailCallback = (error) => { this.loadFailCallback(error); };

        await new Promise((resolve, reject) => {
            FiservSDKHelper.backendCall(this.credentialsUrl, resolve, reject, { requestPurpose: "PAZE" });
        })
        .then(async (credentialsResponse) => {
            this.setSessionIdInput(credentialsResponse.sessionId);
            await window.fiserv.init(FiservSDKHelper.buildInitConfig(credentialsResponse));
            window.fiservPluginSDKInitRan = true;
            loadSuccessCallback();
        })
        .catch((error) => {
            loadFailCallback(error);
        });
    }

    buildPazeConfig = function()
    {
        return {
            displayName: this.configDataPaze.displayName
        };
    }

    buttonClass = function()
    {
        const buttonColor = this.configDataPaze.buttonConfig.color;
        console.log("Paze button color:", buttonColor);
        if (buttonColor === 'blue') {
            return 'paze-blue';
        } else if (buttonColor === 'white') {
            return 'paze-white';
        } else if (buttonColor === 'whitewithoutline') {
            return 'paze-whitewithoutline';
        } else {
            return 'paze-black';
        }
    }

    buttonShape = function()
    {
        const buttonShape = this.configDataPaze.buttonConfig.shape;
        console.log("Paze button shape:", buttonShape);
        if (buttonShape === 'rectangle') {
            return 'paze-rect';
        } else if (buttonShape === 'pill') {
            return 'paze-pill';
        } else {
            return 'paze-default-shape';
        }
    }

    buttonLabel = function()
    {
        const buttonLabel = this.configDataPaze.buttonConfig.label;
        console.log("Paze button label:", buttonLabel);
        if (buttonLabel === 'donatewith') {
            return 'Donate with';
        } else if (buttonLabel === 'checkout') {
            return 'checkout';
        } else if (buttonLabel === 'checkoutwith') {
            return 'checkout with';
        } else {
            return '';
        }
    }

    createSVGLogo = function()
    {
        // Create inline SVG element for better color control
        const logoSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        logoSvg.setAttribute('width', '189');
        logoSvg.setAttribute('height', '58');
        logoSvg.setAttribute('viewBox', '0 0 189 58');
        logoSvg.classList.add('paze-button-logo', 'paze-icon');
        
        // Create path element
        const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathElement.setAttribute('d', 'M92.2696 43.5956L124.196 11.2936H99.6922V1.18738H149.216L117.522 33.6634H142.301C143.715 37.4934 146.29 41.0466 149.824 43.5956H92.2696ZM156.24 26.8868H188.216C188.47 25.445 188.64 24.003 188.64 22.3915C188.64 9.92354 179.734 0 167.181 0C153.865 0 144.79 9.75391 144.79 22.3915C144.79 35.0291 153.78 44.783 168.03 44.783C176.172 44.783 182.533 41.4753 186.519 35.7078L177.699 30.6188C175.833 33.0784 172.44 34.8594 168.199 34.8594C162.432 34.8594 157.767 32.4847 156.24 26.8868ZM156.07 18.4053C157.343 12.977 161.329 9.83873 167.181 9.83873C171.761 9.83873 176.342 12.2983 177.699 18.4053H156.07ZM24.6815 3.50425e-06C18.4899 3.50425e-06 13.9946 2.29006 10.9411 6.19157V1.1874H0V57.7741H10.9411V38.5914C13.9946 42.493 18.4899 44.783 24.6815 44.783C36.0468 44.783 45.3767 35.0291 45.3767 22.3915C45.3767 9.75392 36.0468 3.50425e-06 24.6815 3.50425e-06ZM22.6458 34.3506C15.9453 34.3506 10.9411 29.516 10.9411 22.3915C10.9411 15.267 15.9453 10.4324 22.6458 10.4324C29.4312 10.4324 34.4354 15.267 34.4354 22.3915C34.4354 29.516 29.4312 34.3506 22.6458 34.3506ZM93.2216 36.7977L86.5029 43.5956H82.2801V38.5914C79.2268 42.4082 74.6467 44.783 68.4551 44.783C57.1746 44.783 47.8447 35.0291 47.8447 22.3915C47.8447 9.75392 57.1746 3.275e-08 68.4551 3.275e-08C74.6467 3.275e-08 79.2268 2.37487 82.2801 6.19157V1.18739H93.2216V36.7977ZM82.2801 22.3915C82.2801 15.267 77.2759 10.4324 70.4907 10.4324C63.7902 10.4324 58.786 15.267 58.786 22.3915C58.786 29.516 63.7902 34.3506 70.4907 34.3506C77.2759 34.3506 82.2801 29.516 82.2801 22.3915Z');
        
        logoSvg.appendChild(pathElement);
        return logoSvg;
    }

    createPazeButton = function()
    {
        // Use logoUrl from initialization data (set by the template using URLUtils.staticURL)
        const logoUrl = this.logoUrl;
        
        const pazeButtonClass = this.buttonClass();
        const pazeButtonShape = this.buttonShape();
        const pazeButtonLabel = this.buttonLabel();
        const buttonElement = document.createElement('button');
        buttonElement.id = 'paze-payment-button';
        buttonElement.className = `${pazeButtonClass} ${pazeButtonShape}`;
        buttonElement.type = 'button';
        
        // Create label span element
        const labelSpan = document.createElement('span');
        labelSpan.className = 'paze-button-label';
        labelSpan.textContent = pazeButtonLabel;

        // Append logo and label to button
        const logoSvg = this.createSVGLogo();
        if (pazeButtonLabel === 'checkout') {
            buttonElement.appendChild(logoSvg);
            buttonElement.appendChild(labelSpan);
        } else {
            buttonElement.appendChild(labelSpan);
            buttonElement.appendChild(logoSvg);
        }

        // Attach click handler
        buttonElement.addEventListener('click', async () => {
            await this.handlePaymentButtonClick();
        });

        return buttonElement;
    }

    validateOrderData = function(orderData)
    {
        if (!orderData.amount.total || orderData.amount.total <= 0) {
            throw new Error('Invalid order total. Please refresh the page and try again.');
        }
        return orderData;
    }

    handlePaymentSelectionError = function(error)
    {
        if (error.responseText) {
            try {
                const parsedError = JSON.parse(error.responseText);
                console.error("Parsed error response:", parsedError);
            } catch(e) {
                console.error("Could not parse error response:", error.responseText);
            }
        }
        throw error;
    }

    processPaymentSelection = async function(orderData)
    {
        const validatedOrderData = this.validateOrderData(orderData);
        
        return await this.pazeComponent.selectPaymentMethod(validatedOrderData)
            .then(result => {
                return result;
            })
            .catch(error => {
                this.handlePaymentSelectionError(error);
            });
    }

    submitPayment = async function(orderData)
    {
        return await this.pazeComponent.submit(orderData);
    }

    triggerCheckoutSubmission = function()
    {
        const submitButton = $('button.btn.btn-primary.btn-block.submit-payment');
        submitButton.prop('disabled', false);
        submitButton.trigger('click');
        submitButton.prop('disabled', true);
    }

    handlePaymentError = function(error)
    {
        console.error("Error during Paze payment selection:", error);
        this.pazeError();
        $.spinner().stop();
    }

    handlePaymentButtonClick = async function()
    {
        try {
            $.spinner().start();
            
            if (!this.pazeComponent || typeof this.pazeComponent.selectPaymentMethod !== 'function') {
                throw new Error('Paze component is not initialized correctly.');
            }
            
            const orderData = this.getOrderData();
            await this.processPaymentSelection(orderData);
            await this.submitPayment(orderData);
            this.triggerCheckoutSubmission();
            $.spinner().stop();
        
        } catch (error) {
            this.handlePaymentError(error);
        }
    }

    sdkInitialized = async function()
    {
        try
        {
            const pazeLoadConfig = this.buildPazeConfig();
            this.pazeComponent = await window.fiserv.components.paze(pazeLoadConfig);

            if (!this.pazeComponent || typeof this.pazeComponent.selectPaymentMethod !== 'function') {
                throw new Error('Paze component did not return a valid instance.');
            }

            const pazeButtonContainer = document.getElementById('fiserv_commercehub-paze-button');
            if (pazeButtonContainer) {
                const buttonElement = this.createPazeButton();
                pazeButtonContainer.innerHTML = '';
                pazeButtonContainer.appendChild(buttonElement);
            } 

            $.spinner().stop();
        }
        catch(e)
        {
            if (e && e.code === 'FEATURE_NOT_ENABLED') {
                console.error('Paze feature is not enabled for these credentials or merchant configuration.');
                this.showError('Paze is not enabled for this merchant configuration. Please select another payment method.');
                $('#fiserv_commercehub-paze-button').children().remove();
            }
            $('#fiserv-paze-fatal-notice').show();
            $.spinner().stop();

            throw e;
        }
    }

    getOrderData = function()
    {
        let orderTotalStr = $('.grand-total-sum').text().replace(/[^0-9.]/g, '') ||
                           $('.order-total').text().replace(/[^0-9.]/g, '') ||
                           $('[data-order-total]').data('order-total') ||
                           '0.00';
        let orderTotal = parseFloat(orderTotalStr);
        
        // Validate order total - must be greater than 0 and must be a valid number
        if (!orderTotal || isNaN(orderTotal) || orderTotal <= 0) {
            console.warn("Invalid order total:", orderTotal, "using default 0.01");
            orderTotal = 0.01; // Use minimum value if invalid
        }
        let orderQuantity = 0;
        $('.line-item-quantity').each(function() {
            let qty = parseInt($(this).val() || $(this).text(), 10);
            orderQuantity += isNaN(qty) ? 0 : qty;
        });
        if (orderQuantity === 0) {
            orderQuantity = 1; // Default to 1 if no items found
        }
        let orderData = {
           amount: {
                currency: "USD",
                total: orderTotal.toString()
            }
        };
        console.log("Paze order data:", JSON.stringify(orderData, null, 2));
        return orderData;
    }

    sdkLoadFailure = function (err)
    {
        console.log(err);
        $('#fiserv-paze-fatal-notice').show();
        $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
        $.spinner().stop();
    }

    watchSubmitResponse = function()
    {
        $(document).on("ajaxSuccess", $.proxy(this.onSubmitResponse, this));
    }

    onSubmitResponse = function(ev, xhr)
    {
        if (typeof(xhr.responseJSON) !== 'undefined' &&
            typeof(xhr.responseJSON.action) !== 'undefined' &&
            xhr.responseJSON.action === "CheckoutServices-SubmitPayment" &&
            $(".payment-information").data("payment-method-id") === "PAZE"
        ) {
            if(xhr.responseJSON.isPazeSuccess)
            {
                new Promise((resolve, reject) => {
                    FiservSDKHelper.backendCall(xhr.responseJSON.placeOrderURL, resolve, reject);
                })
                .then(async (response) => {
                    if(response.error)
                    {
                        this.pazeFailure(response.errorMessage);
                        return;
                    }

                    this.pazeSuccess(response);
                }).catch((error) => {
                    this.pazeFailure();
                });
            }
            else
            {
                this.setSessionIdInput('');
                $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
                this.pazeFailure();
            }
        }
    }

    pazeFailure = function(message)
    {
        $('#fiserv_commercehub-paze-button').children().remove();
        if(message)
            this.showError(message);
        this.completePayment('FAILURE');
        this.initialize();
    }

    pazeSuccess = function(data)
    {
        this.completePayment('SUCCESS');

        var redirect = $('<form>')
            .appendTo(document.body)
            .attr({
                method: 'POST',
                action: data.continueUrl
            });

        $('<input>')
            .appendTo(redirect)
            .attr({
                name: 'orderID',
                value: data.orderID
            });

        $('<input>')
            .appendTo(redirect)
            .attr({
                name: 'orderToken',
                value: data.orderToken
            });

        redirect.submit();
    }

    pazeCancel = function()
    {
        console.log("Paze flow cancelled");
    }

    pazeError = function()
    {
        this.pazeFailure(this.configDataPaze.pazeFailureMessage);
    }

    setSessionIdInput = function(sessionId)
    {
        // Use the correct input ID for session ID (commercehubSessionIdInputPaze)
        $('input#commercehubSessionIdInputPaze').val(sessionId);
        console.log("Session ID set:", sessionId);
    }

    watchPaymentMethod = function()
    {
        $('ul.payment-options li.nav-item[data-method-id=PAZE]').on('click', (e) => this.paymentMethodHandler(e));
    }

    paymentMethodHandler = (e) => {
        console.log("Paze payment method selected via watchPaymentMethod");
        $('button.btn.btn-primary.btn-block.submit-payment').prop('disabled', true);
    }

    watchButtonLoadLag = function()
    {
        $('.paze-option').on('click', this.waitForButtonLoad);
    }

    waitForButtonLoad = function()
    {
        if(!$('#fiserv_commercehub-paze-button').children().length)
        {
            $.spinner().start();
        }
        $('.paze-option').off('click', this.waitForButtonLoad);
    }

    showError = function(message)
    {
        let form = $('#dwfrm_billing');
        $('.alert', form).remove();
        form.prepend('<div class="alert alert-danger" role="alert">' + message + '</div>');
        $('.alert', form)[0].scrollIntoView({ block: 'center', behavior: 'smooth'});
    }
}