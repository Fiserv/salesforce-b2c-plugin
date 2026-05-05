---
name: CREATE_FRONTEND
description: '>-'
Use when: Adding in frontend isml and javascript files for apm initialization and management in the browser
tools: ['read', 'edit', 'search', 'execute', 'todo', 'agent', 'insert_edit_into_file', 'replace_string_in_file', 'create_file', 'apply_patch', 'get_terminal_output', 'show_content', 'open_file', 'run_in_terminal', 'get_errors', 'list_dir', 'read_file', 'file_search', 'grep_search', 'run_subagent', 'validate_cves']
Describe the config to implement. Include:
  - apm_id=string
'[type:string]': ''
'[transaction_type:string]': ''
'[fields:JSON]': ''
---
# Role

You are a payment engineer responsible for generating all frontend files for a new APM in the Salesforce B2C Fiserv CommerceHub plugin. Your job is to create static JS files, ISML templates, and register the APM in initialization data and checkout templates. You replicate the organization and conventions of the existing codebase. When producing this new code, structurally speaking, you replicate the organization of the existing codebase for files, naming conventions, style linting (allman brackets), config options, backend model classes, and frontend files.

# Shared Context

Before starting work, read this file for architecture:

- `.github/architecture.md` — Describes the structure of the repository

---

# Parameters

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| **apm_id** | APM identifier (e.g., `APPLEPAY`, `PAYPAL`) — must be uppercase | required | The ID used to represent the payment method |
| **type** | `button`, `iframe` | required | The type of frontend the apm needs for rendering purposes |
| **transaction_type** | `charge`, `order` | required | Determines which hidden input to include: `charge` uses `commercehubSessionId`, `order` uses `commercehubOrderId` |
| **fields** | JSON object `{ field_name:string, input_method:string (text/dropdown), mask:boolean (optional) }` | required for `type === iframe` | Field is a JSON object form with inner string arrays to indicate the layout of the iframes for the form |

---

# Naming Conventions
 
Before generating files, derive the following strings from `apm_id`:
 
| Token | Derivation | Example (apm_id=NEWPAY) |
|-------|------------|------------------------|
| `apm_id` | `apm_id` as-is | `NEWPAY` |
| `apm_lower` | lowercase | `newpay` |
| `apm_pascal` | PascalCase (capitalize each natural word boundary) | `NewPay` |
| `apm_proper` | Title Case (PascalCase but with added whitespace) | `New Pay` |

# Implementation Checklist

When adding a new APM frontend, perform these steps in order. Every step is mandatory.

## Step 1 — Create new ISML templates (Content, Summary, Tab)

### 1a — Tab template (`cartridge/templates/default/checkout/billing/paymentOptions/{apm_lower}Tab.isml`)

- Create a new tab template file to be rendered in the DOM for the new APM
- It does not matter if the image is not present within the repository. It is the human developer's responsibility to find and add appropriate branding imagery to the repository. As such, simply naming the image is appropriate. Once the complete execution of this skill is finished, push a reminder to the developer that they need to provide said image. Make this notification abundantly clear.
- Follow the following template below

```html
<li class="nav-item" data-method-id="${paymentOption.ID}">
    <a class="nav-link {apm_lower}-tab" data-toggle="tab" href="#{apm_lower}-content" role="tab">
        <img class="{apm_lower}-option"
                src="${URLUtils.staticURL('/images/{apm_lower}.png')}"
                height="32"
                alt="${paymentOption.name}"
                title="${paymentOption.name}"
        >
    </a>
</li>
```

### 1b — Summary template (`cartridge/templates/default/checkout/billing/paymentOptions/{apm_lower}Summary.isml`)

- Create a new summary template file to be displayed in payment summaries
- Follow the following template below

```html
<div class="{apm_lower}-item">
    <span>{apm_proper}</span>
</div>
```

### 1c — Content template (`cartridge/templates/default/checkout/billing/paymentOptions/{apm_lower}Content.isml`)

#### Button content

- Create a new summary template file to be displayed in payment content blocks type === button
- For transaction_type === charge, use a session ID. For transaction_type === order, use an Order ID
- Follow the following template below

Button content example:
```html
<isset name="FiservConstants" value="${require('*/cartridge/fiservConstants/constants')}" scope="pdict" />
<isset name="FiservFrontendConfigRetriever" value="${require('*/cartridge/scripts/utils/commercehubFrontendInitializationData')}" scope="pdict" />
<isset name="FiservConfig" value="${require('*/cartridge/scripts/utils/commercehubConfig')}" scope="pdict" />

<isscript>
    var assets = require('*/cartridge/scripts/assets.js');
    assets.addJs('/js/fiserv_base/commercehub-sdk-helper.js');
    assets.addJs('/js/fiserv_base/commercehub-sdk-button-adapter.js');
    assets.addJs('/js/fiserv_base/commercehub-dom-disable-handler.js');
    assets.addJs('/js/fiserv_{apm_lower}/commercehub-{apm_lower}-button.js');
    assets.addJs('/js/fiserv_{apm_lower}/{apm_lower}.js');
    assets.addJs(pdict.FiservConstants.COMMERCEHUB_SDK_URL);
    assets.addCss('css/fiservScc.css');
</isscript>

<div class="tab-pane {apm_lower}-content" id="{apm_lower}-content" role="tabpanel">

    <fieldset class="payment-form-fields">

        <!--- payment method is {apm_pascal} --->
        <input type="hidden" class="form-control"
               name="${pdict.forms.billingForm.paymentMethod.htmlName}"
               value="{apm_id}"
        >

        <div id="fiserv-commercehub-{apm_lower}-form-init-container"
            data-commercehub-initialization-data="${JSON.stringify(pdict.FiservFrontendConfigRetriever.retrieveFrontendInitializationData('{apm_pascal}'))}"
            data-commercehub-credentials="${URLUtils.https('Fiserv-Credentials')}"
            data-initial-checkout-stage="${pdict.currentStage}"></div>

        <div id="fiserv-commercehub-{apm_lower}-form-container">
            <div id="fiserv_commercehub-{apm_lower}-button" class="sdc-button"></div>

            <div class="privacyPolicy">
                <span></span>
                Payments Powered by Fiserv.&nbsp; <a target="_blank" href="https://www.fiserv.com/privacy">Privacy Notice</a>.
            </div>
            <div id="fiserv-{apm_lower}-fatal-notice" class="alert alert-danger">
                <p>${Resource.msg('message.error.{apm_lower}.fatal','error',null)}</p>
            </div>
        </div>

        <!--- Hidden input for {transaction_type === charge ? session : order} ID --->
        <input id="commercehub{transaction_type === charge ? Session : Order}IdInput{apm_pascal}" type="hidden" name="${pdict.forms.billingForm.fiservCommercehubPaymentFields.commercehub{transaction_type === charge ? Session : Order}Id.htmlName}"/>

        <isif condition="${!pdict.FiservConfig.getCommerceHubCreditEnabled()}">
            <input type="hidden" class="form-control cardNumber" id="cardNumber" value="" <isprint value=${pdict.forms.billingForm.creditCardFields.cardNumber.attributes} encoding="off"/>/>
        </isif>
    </fieldset>
</div>
```

#### Iframe Content

- Create a new summary template file to be displayed in payment content blocks for type === iframe
- For transaction_type === charge, use a session ID. For transaction_type === order, use an Order ID
- Use the fields input array to generate a form structure similar to that of existing forms. The template below provides a sample of such

Example fields input: 
{
    [{ 'number', 'text' }],
    [{ 'name', 'text' }, { 'big date', 'dropdown' }],
    [{ 'small hour', 'text', true }]
}

```html
<isset name="FiservConstants" value="${require('*/cartridge/fiservConstants/constants')}" scope="pdict" />
<isset name="FiservFrontendConfigRetriever" value="${require('*/cartridge/scripts/utils/commercehubFrontendInitializationData')}" scope="pdict" />
<isset name="FiservConfig" value="${require('*/cartridge/scripts/utils/commercehubConfig')}" scope="pdict" />

<isscript>
    var assets = require('*/cartridge/scripts/assets.js');
    assets.addJs('/js/fiserv_base/commercehub-sdk-helper.js');
    assets.addJs('/js/fiserv_base/commercehub-sdk-iframe-adapter.js');
    assets.addJs('/js/fiserv_base/commercehub-dom-disable-handler.js');
    assets.addJs('/js/fiserv_{apm_lower}/commercehub-{apm_lower}-form.js');
    assets.addJs('/js/fiserv_{apm_lower}/{apm_lower}.js');
    assets.addJs(pdict.FiservConstants.COMMERCEHUB_SDK_URL);
    assets.addCss('css/fiservScc.css');
</isscript>

<div class="tab-pane {apm_lower}-content" id="{apm_lower}-content" role="tabpanel">

    <fieldset class="payment-form-fields">

        <!--- payment method is {apm_pascal} --->
        <input type="hidden" class="form-control"
               name="${pdict.forms.billingForm.paymentMethod.htmlName}"
               value="{apm_id}"
        >

        <div id="fiserv-commercehub-{apm_lower}-form-init-container"
            data-commercehub-initialization-data="${JSON.stringify(pdict.FiservFrontendConfigRetriever.retrieveFrontendInitializationData('{apm_pascal}'))}"
            data-commercehub-credentials="${URLUtils.https('Fiserv-Credentials')}"
            data-initial-checkout-stage="${pdict.currentStage}"></div>

        <div id="fiserv-commercehub-{apm_lower}-form-container">
            <div class="sdc-row">
                <div id="sdc-number-frame" class="sdc-field-frame sdc-text">
                    <div id="fiserv_commercehub-{apm_lower}-number" class="sdc-field"></div>
                </div>
                <span id="sdc-number-invalid-message" class="sdc-error-message sdc-hidden"></span>
            </div>
            <div class="sdc-column">
                <div class="sdc-row">
                    <div id="sdc-name-frame" class="sdc-field-frame sdc-text">
                        <div id="fiserv_commercehub-{apm_lower}-name" class="sdc-field"></div>
                    </div>
                    <span id="sdc-name-invalid-message" class="sdc-error-message sdc-hidden"></span>
                </div>
                <div class="sdc-row">
                    <div id="sdc-big-date-frame" class="sdc-field-frame sdc-dropdown">
                        <div id="fiserv_commercehub-{apm_lower}-big-date" class="sdc-field"></div>
                    </div>
                    <span id="sdc-big-date-invalid-message" class="sdc-error-message sdc-hidden"></span>
                </div>
            </div>
            <div class="sdc-row">
                <div id="sdc-small-hour-frame" class="sdc-field-frame sdc-text">
                    <div id="fiserv_commercehub-{apm_lower}-small-hour" class="sdc-field"></div>
                    <button id="sdc-mask-smallHour" class="btn sdc-unmasking-icon"></button>
                </div>
                <span id="sdc-small-hour-invalid-message" class="sdc-error-message sdc-hidden"></span>
            </div>

            <div class="privacyPolicy">
                <span></span>
                Payments Powered by Fiserv.&nbsp; <a target="_blank" href="https://www.fiserv.com/privacy">Privacy Notice</a>.
            </div>
            <div id="fiserv-ach-fatal-notice" class="alert alert-danger">
                <p>${Resource.msg('message.error.scc.fatal','error',null)}</p>
            </div>
        </div>

        <!--- Hidden input for {transaction_type === charge ? session : order} ID --->
        <input id="commercehub{transaction_type === charge ? Session : Order}IdInputACH" type="hidden" name="${pdict.forms.billingForm.fiservCommercehubPaymentFields.commercehub{transaction_type === charge ? Session : Order}Id.htmlName}"/>

        <iscomment> This field needs to be here when Credit Card is not enabled </iscomment>
        <isif condition="${!pdict.FiservConfig.getCommerceHubCreditEnabled()}">
            <input type="hidden" class="form-control cardNumber" id="cardNumber" value="" <isprint value=${pdict.forms.billingForm.creditCardFields.cardNumber.attributes} encoding="off"/>/>
        </isif>

    </fieldset>
</div>
```

### 1d — Extend paymentOptions isml files and confirmationPaymentInfo file

- Extend `cartridges/fiserv/fiserv_commercehub/cartridge/templates/default/checkout/billing/paymentOptions/paymentOptionsTabs.isml` adding in the new tab template file at the bottom of the isif block using another iselseif block. Check for condition `getCommerceHub{apm_pascal}Enabled()` and `paymentOption.ID === '{apm_id}'`
- Extend `cartridges/fiserv/fiserv_commercehub/cartridge/templates/default/checkout/billing/paymentOptions/paymentOptionsSummary.isml` adding in the new summary template file at the bottom of the isif block using another iselseif block. Check for condition `payment.paymentMethod === '{apm_id}'`
- Extend `cartridges/fiserv/fiserv_commercehub/cartridge/templates/default/checkout/billing/paymentOptions/paymentOptionsContent.isml` adding in the new content template file at the bottom of the isif block using another iselseif block. Check for condition `getCommerceHub{apm_pascal}Enabled()` and `paymentOption.ID === '{apm_id}'`
- Extend `cartridges/fiserv/fiserv_commercehub/cartridge/templates/default/checkout/confirmation/confirmationPaymentInfo.isml` adding in a new ifelseif block at the bottom of the isif block. Check for condition `payment.paymentMethod === '{apm_id}'` and have the block's content be identical to the summary block built out in step 1b

---

## Step 2 — Register initialization data (`cartridge/scripts/utils/commercehubFrontendInitializationData.js`)

- Add a new `case '{apm_pascal}':` block inside the `switch(formId)` statement in `getFrontendConfigData()`, before the `default:` case.
- Note what is listed here is the bare minimum expected fields. As the specific customization configs are unknown for things like button configs, null values are returned 

#### Button configData Object
```js
configData = {
    'buttonConfig': {},
    {apm_lower}FailureMessage': Resource.msg('message.error.{apm_lower}.failure', 'error', null)
}
```

#### Iframe configData Object
```js
configData = {
    'captureFailureMessage': Resource.msg('message.error.{apm_lower}.captureFailCheckout', 'error', null)
}
```

---

## Step 3 — Create the static JS directory and files

### 3a - Init files (`cartridge/static/default/js/fiserv_{apm_lower}/{apm_lower}.js`)

- Imported via the html files. Wrap the code within an on DOMContentLoaded event listener
- Add event listeners to specific events with the DOM that indicate a requirement to init or re-init the file
- Retrieve initalization data from the backend passed in and stored in the frontend's html
- Create an init function that tracks the init status of the payment method

#### Button Init File

- For button initialization specifically, add an event listener that listens to changes in the grand total.
- Follow the following template below

```js
'use strict';

document.addEventListener("DOMContentLoaded", () => {
    let extractInitializationData = function()
    {
        let data = {
            config: $('#fiserv-commercehub-{apm_lower}-form-init-container').data('commercehub-initialization-data'),
            credentialsUrl: $('#fiserv-commercehub-{apm_lower}-form-init-container').attr('data-commercehub-credentials')
        }
        $('#fiserv-commercehub-{apm_lower}-form-init-container').remove();
        return data;
    }

    let form = new Commercehub{apm_pascal}(extractInitializationData());
    let initialized = false;
    let postInitPaymentChangeDetected = false;

    let init{apm_pascal} = async function()
    {
        // Temporary fix...
        if(postInitPaymentChangeDetected)
        {
            location.reload();
            return;
        }
        
        if (!initialized)
        {
            await form.initialize();
            initialized = true;
        }
    };

    $(document).on("ajaxSuccess", (ev, xhr) => { 
        if (typeof(xhr.responseJSON) !== 'undefined' &&
            typeof(xhr.responseJSON.action) !== 'undefined' &&
            xhr.responseJSON.action === "CheckoutShippingServices-SubmitShipping" &&
            typeof(xhr.responseJSON.order) !== 'undefined' &&
            typeof(xhr.responseJSON.order.shipping) !== 'undefined' &&
            $(".payment-information").data("payment-method-id") === "{apm_id}")
        {
            init{apm_pascal}();
        }
    });

    if ($('ul.payment-options li.nav-item').length > 0 && $('ul.payment-options li.nav-item.active').length === 0) {
            $('ul.payment-options li.nav-item:first').find('a').trigger('click');
            if ($('ul.payment-options li.nav-item[data-method-id={apm_id}}] a.nav-link').hasClass('active'))
                init{apm_pascal}();
    }

    $('ul.payment-options li.nav-item[data-method-id={apm_id}}]').on('click', () => {
        init{apm_pascal}();
    });

    $('.payment-summary .edit-button').on('click', () => {
        if($(".payment-information").data("payment-method-id") === "{apm_id}")
            init{apm_pascal}();
    })

    let grandTotalUpdated = function()
    {
        if(window.fiservPluginSDKInitRan)
        {
            postInitPaymentChangeDetected = true;
        }

        $('#fiserv_commercehub-samsungpay-button').children().remove();
        if(initialized)
        {
            // Temporary fix...
            location.reload();
            return;

            initialized = false;
            if($('.data-checkout-stage').attr('data-checkout-stage') === "payment"
                && $(".payment-information").data("payment-method-id") === "{apm_id}")
                init{apm_pascal}();
        }
    }
    new MutationObserver(() => { grandTotalUpdated(); }).observe($('.grand-total-sum')[0], { childList: true });
});
```

#### Iframe Init File

- Iframes do not care about the grand total and therefore do not need to track the change in the grand total
- Follow the following template below

```js
'use strict';

document.addEventListener("DOMContentLoaded", () => {
    let extractInitializationData = function()
    {
        let data = {
            config: $('#fiserv-commercehub-{apm_lower}-form-init-container').data('commercehub-initialization-data'),
            credentialsUrl: $('#fiserv-commercehub-{apm_lower}-form-init-container').attr('data-commercehub-credentials')
        }
        $('#fiserv-commercehub-{apm_lower}-form-init-container').remove();
        return data;
    }

    const checkoutStage = $('#fiserv-commercehub-{apm_lower}-form-init-container').attr('data-initial-checkout-stage');
    let form = new Commercehub{apm_pascal}(extractInitializationData());
    let initialized = false;

    let init{apm_pascal} = async function()
    {
        if (!initialized)
        {
            await form.initialize();
            initialized = true;
        }
    };

    $(document).on("ajaxSuccess", (ev, xhr) => { 
        if (typeof(xhr.responseJSON) !== 'undefined' &&
            typeof(xhr.responseJSON.action) !== 'undefined' &&
            xhr.responseJSON.action === "CheckoutShippingServices-SubmitShipping" &&
            typeof(xhr.responseJSON.order) !== 'undefined' &&
            typeof(xhr.responseJSON.order.shipping) !== 'undefined' &&
            $(".payment-information").data("payment-method-id") === "{apm_id}")
        {
            init{apm_pascal}();
        }
    });

    if ($('ul.payment-options li.nav-item[data-method-id={apm_id}]').length > 0 && $('ul.payment-options li.nav-item.active').length === 0)
    {
         $('ul.payment-options li.nav-item:first').find('a').trigger('click');
            if ($('ul.payment-options li.nav-item[data-method-id={apm_id}]').hasClass('active'))
                init{apm_pascal}();
    }

    if($(".payment-information").data("payment-method-id") === "{apm_id}" && checkoutStage === 'payment')
    {
        init{apm_pascal}();
    }

    $('ul.payment-options li.nav-item[data-method-id={apm_id}]').on('click', () => {
        init{apm_pascal}();
    });

    $('.payment-summary .edit-button').on('click', () => {
        if($(".payment-information").data("payment-method-id") === "{apm_id}")
            init{apm_pascal}();
    })
});
```

### 3b — Implementation Files (type = `button` only)

- Add a constructor which takes in the initialization data passed in via the init file (originally sourced from the html)
- Add in an baseline expected functions as follows initialize, createAdapter, sdkInitialized, sdkLoadFailure, removeInsertedSummary, watchSubmitResponse,onSubmitResponse, setSessionIdInput/setOrderIdInput, paymentMethodHandler, showError, setupDisableHandlerValues, setSubmitButtonEnabled
- For transaction_type === charge, use a session ID. For transaction_type === order, use an Order ID
- Some functions are templated out because the exact implementation cannot be determined based on the fact that the exact function calls are not present in this repository

#### Button Implementation File (`cartridge/static/default/js/fiserv_{apm_lower}/commercehub-{apm_lower}-button.js`)

- Methods unique to Button implementations: watchPaymentMethod, createCallbacksObject, {apm_lower}Approval, {apm_lower}Cancel, {apm_lower}Error, watchButtonLoadLag, waitForButtonLoad
- watchPaymentMethod, while similar to watchPaymentMethods, only looks to observe the tab for just the current APM
- Follow the below template. Comments within this template serve as developer notes for the human developer. Do not replace them


```js
'use strict';

class Commercehub{apm_pascal}
{
    constructor(initializationData)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize {apm_proper} button.");
        }

        this.methodId = '{apm_id}';
        this.formConfig = initializationData.config;
        this.configData{apm_pascal} = initializationData.config.configData;
        this.credentialsUrl = initializationData.credentialsUrl;

        this.createAdapter();

        this.watchButtonLoadLag();
        this.watchSubmitResponse();
        this.watchPaymentMethod();
        this.setupDisableHandlerValues();
    }

    initialize = async function()
    {
        try {
            $.spinner().start();
            $('#fiserv-{apm_lower}-fatal-notice').hide();
            await this.sdkButton.initSdk(this.credentialsUrl, {transaction_type === charge ? this.setSessionIdInput : null}, "{apm_pascal}");
            this.setSubmitButtonEnabled(false);
        } catch (_err) {
            this.sdkLoadFailure(_err);
        }
    }

    createAdapter = function()
    {
        let loadSuccessCallback = () => { console.log("CommerceHub {apm_proper} SDK has loaded."); };
        let loadFailCallback = (error) => { this.sdkLoadFailure(error); };
        let sdkReadyCallback = () => { this.sdkInitialized() };

        this.sdkButton = new FiservSDKButton(
            loadSuccessCallback,
            loadFailCallback,
            sdkReadyCallback
        );
    }

    createCallbacksObject = function()
    {
        return {
            onApprove: (response) => { this.{apm_lower}Approval(response); },
            onCancel: (response) => { this.{apm_lower}Cancel(response); },
            onError: (response) => { this.{apm_lower}Error(response); }
        };
    }

    sdkInitialized = async function() 
    {
        try
        {
            // Insert the window.fiserv.components.APM_ID() call here
        }
        catch(e)
        {
            $('#fiserv-{apm_lower}-fatal-notice').show();
        }
        $.spinner().stop();
    }

    sdkLoadFailure = function (err) 
    {
        console.log(err);
        $('#fiserv-{apm_lower}-fatal-notice').show();
        $.spinner().stop(); 
        throw new Error("Unable to load CommerceHub SDK.")
    }

    {apm_lower}Approval = function(response)
    {
        {transaction_type === order ? this.setOrderIdInput(response.orderId); : null}
        $('.payment-details').addClass('checkout-hidden');
        $('<div class="payment-details-{apm_lower}">{apm_proper}</div>').insertAfter('.payment-details');
        $('.edit-button').on('click', this.removeInsertedSummary);
        this.setSubmitButtonEnabled(true);
        $('button.btn.btn-primary.btn-block.submit-payment').trigger('click');
        this.setSubmitButtonEnabled(false);
    }

    removeInsertedSummary = () =>
    {
        $('.payment-details').removeClass('checkout-hidden');
        $('.payment-details-{apm_lower}').remove();
        $('.edit-button').off('click', this.removeInsertedSummary);
    }

    {apm_lower}Cancel = function()
    {
        console.log("{apm_proper} flow cancelled");
    }

    {apm_lower}Error = function(response)
    {
        this.setSubmitButtonEnabled(false);
        this.showError(this.configData{apm_pascal}.{apm_lower}FailureMessage);
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
            $(".payment-information").data("payment-method-id") === "{apm_id}" &&
            xhr.responseJSON.error
        ) {
            this.set{transaction_type === charge ? Session : Order}IdInput('');
            this.removeInsertedSummary();
        }
    }

    set{transaction_type === charge ? Session : Order}IdInput = function({transaction_type === charge ? session : order}Id)
    {
        $('input#commercehub{transaction_type === charge ? Session : Order}IdInput{apm_pascal}').val({transaction_type === charge ? session : order}Id);
    }

    watchPaymentMethod = function()
    {
        $('ul.payment-options li.nav-item[data-method-id={apm_id}]').on('click', this.paymentMethodHandler);
    }

    paymentMethodHandler = (_e) => {
        this.setSubmitButtonEnabled(false);
    }

    watchButtonLoadLag = function()
    {
        $('.{apm_lower}-option').on('click', this.waitForButtonLoad);
    }

    waitForButtonLoad = function()
    {
        if(!$('#fiserv_commercehub-{apm_lower}-button').children().length)
        {
            $.spinner().start();
        }
        $('.{apm_lower}-option').off('click', this.waitForButtonLoad);
    }

    showError = function(message)
    {
        let form = $('#dwfrm_billing');
        $('.alert', form).remove();
        form.prepend('<div class="alert alert-danger" role="alert">' + message + '</div>');
        $('.alert', form)[0].scrollIntoView({ block: 'center', behavior: 'smooth'});
    }

    setupDisableHandlerValues = function()
    {
        this.setSubmitButtonEnabled(false);
        window.fiservSubmitButtonHandler.addBlocker(
            this.methodId,
            '{apm_lower}-approval',
            (buttonHandler) => buttonHandler.getFact('PRIMARY_PAYMENT_METHOD_NOT_REQURED') === false && buttonHandler.getFact('APM_APPROVAL') !== true
        );
    }

    setSubmitButtonEnabled = function(enabled)
    {
        window.fiservSubmitButtonHandler.setFact('APM_APPROVAL', enabled);
    }
}
```

#### Iframe Implementation File (`cartridge/static/default/js/fiserv_{apm_lower}/commercehub-{apm_lower}-form.js`)

- Methods unique to Button implementations: initializeAdapter, clearValidation, getSubmitButton, captureSuccess, paymentProceedFailure, watchPaymentMethods, submitHandler, watchSubmitButton, unwatchSubmitButton, getSdcFieldFrame, getSdcFieldInvalidMessageContainer, getSdcInvalidFieldMessageText, fieldValidityHandler, fieldFocusHandler, mask
- watchPaymentMethods, while similar to watchPaymentMethod, looks to observe all tabs for all the APMs
- Follow the below template. Comments within this template that aren't surronded by triple stars serve as developer notes for the human developer. Do not replace them. Comments surrounded by stars are instructions for how to fill out a specific line in the template

```js
'use strict';

class Commercehub{apm_pascal}
{
    constructor(initializationData)
    {
        if (typeof(initializationData) === "undefined")
        {
            throw new Error("Initialization Data not found. Unable to initialize {apm_proper} form.");
        }

        this.methodId = '{apm_id}';
        this.formConfig = initializationData.config;
        this.configData{apm_pascal} = initializationData.config.configData;
        this.credentialsUrl = initializationData.credentialsUrl;

        this.createAdapter();

        // *** For the masking line here, add an id for each field that has masking enabled. If there are no masking fields, remove this line ***
        $('#sdc-mask-{field_name}').on('click', (element) => { this.mask(element, this.formAdapter); });

        this.watchSubmitResponse();
        this.watchPaymentMethods();
        this.setupDisableHandlerValues();
    }

    initialize = async function()
    {
        try {
            $.spinner().start();
            await this.initializeAdapter();

            if ($('.nav-link.{apm_lower}-tab.active').length)
            {
                this.watchSubmitButton();
            }
        } catch (_err) {
            this.sdkLoadFailure(_err, "#fiserv-{apm_lower}-fatal-notice");
        }
    }

    createAdapter = function()
    {
        let loadSuccessCallback = () => { console.log("CommerceHub {apm_proper} SDK has loaded."); };
        let loadFailCallback = (error) => { this.sdkLoadFailure(error, "#fiserv-{apm_lower}-fatal-notice"); };
        let formReadyCallback = () => { this.sdkInitialized(); };
        let formValidCallback = () => { this.validForm = true; this.setSubmitButtonEnabled(true); /* Add in any required form valid action (ie enable submit button, confirmation button, etc) */ };
        let formInvalidCallback = () => { this.validForm = false; this.setSubmitButtonEnabled(false); /* Add in any required form invalid action (ie disable submit button, hide confirmation button, etc) */ };
        let fieldValidityHandler = (data) => {
            let frame = this.getSdcFieldFrame(data["field"]);
            let mess = this.getSdcFieldInvalidMessageContainer(data["field"]);
            this.fieldValidityHandler(data, frame, mess);
        };
        let fieldFocusHandler = (data) => {
            let frame = this.getSdcFieldFrame(data);
            this.fieldFocusHandler(frame);
        };
        let runSuccessCallback = (responseBody) => { this.{apm_lower}CaptureSuccess(responseBody); };
        let runFailureCallback = (error) => { this.paymentProceedFailure(error); };

        this.formAdapter = new FiservSDKIframe(
            loadSuccessCallback,
            loadFailCallback,
            formReadyCallback,
            formValidCallback,
            formInvalidCallback,
            null, // This is for card brand handler. Unless otherwise needed, this can be left null
            fieldValidityHandler,
            fieldFocusHandler,
            runSuccessCallback,
            runFailureCallback);
    }

    initializeAdapter = async function()
    {
        this.clearValidation();
        try
        {
            this.formAdapter.initSdk(this.formConfig, /* Insert form type here */ );
        }
        catch (err)
        {
            console.log(err);
            throw new Error(err);
        }
    }

    clearValidation = function()
    {
        if ($('.tab-pane.active').find('input[name=dwfrm_billing_paymentMethod]').val() === '{apm_id}')
        {
            this.setSubmitButtonEnabled(false)
        }

        // *** For the next two lines, add an id for each field in the fields parameter within the jquery search. Do not split the ids into separate jquery calls ***
        $('#sdc-{field-name (snake case)}-frame').removeClass('sdc-valid-field sdc-error-field sdc-focused-field');
        $('#sdc-{field-name (snake case)}-invalid-message').addClass('sdc-hidden');
    }

    set{transaction_type === charge ? Session : Order}IdInput = function({transaction_type === charge ? session : order}Id)
    {
        $('input#commercehub{transaction_type === charge ? Session : Order}IdInput{apm_pascal}').val({transaction_type === charge ? session : order}Id);
    }

    getSubmitButton = function()
    {
        return $('button.btn.btn-primary.btn-block.submit-payment');
    }

    sdkInitialized = function()
    {
        $.spinner().stop();
    }

    sdkLoadFailure = function(err, noticeId)
    {
        console.log(err);
        this.setSubmitButtonEnabled(false);
        $(noticeId).show();
        $.spinner().stop();
        throw new Error("Unable to load CommerceHub {apm_proper} SDK.");
    }

    {apm_lower}CaptureSuccess = function()
    {
        $.spinner().stop();
        $('.payment-details').addClass('checkout-hidden');
        $('<div class="payment-details-{apm_lower}">{apm_proper}</div>').insertAfter('.payment-details');
        $('.edit-button').on('click', this.removeInsertedSummary);
        this.getSubmitButton().trigger('click');
    }

    removeInsertedSummary = () =>
    {
        $('.payment-details').removeClass('checkout-hidden');
        $('.payment-details-{apm_lower}').remove();
        $('.edit-button').off('click', this.removeInsertedSummary);
        if ($(".payment-information").data("payment-method-id") === "{apm_id}")
        {
            this.watchSubmitButton();
        }
    }

    showError = function(message)
    {
        let form = $('#dwfrm_billing');
        $('.alert', form).remove();
        form.prepend('<div class="alert alert-danger" role="alert">' + message + '</div>');
        $('.alert', form)[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    paymentProceedFailure = function(msg)
    {
        this.formAdapter.destroyIframe('{apm_lower}');
        this.initializeAdapter();
        this.watchSubmitButton();
        this.showError(msg ? msg : this.configData{apm_pascal}.captureFailureMessage);
        $.spinner().stop();
    }

    paymentMethodHandler = (_e) =>
    {
        if ($(_e.currentTarget).attr('data-method-id') !== '{apm_id}')
        {
            this.unwatchSubmitButton();
            return;
        }

        this.watchSubmitButton();
        this.setSubmitButtonEnabled(this.validForm);
    }

    watchPaymentMethods = function()
    {
        $('ul.payment-options li.nav-item').on('click', this.paymentMethodHandler);
    }

    submitHandler = (_e) =>
    {
        if ($('.tab-pane.active').find('input[name=dwfrm_billing_paymentMethod]').val() === '{apm_id}')
        {
            _e.preventDefault();
            $.spinner().start();
            this.unwatchSubmitButton();
            this.set{transaction_type === charge ? Session : Order}IdInput(null);
            this.formAdapter.submitForm(this.credentialsUrl, this.set{transaction_type === charge ? Session : Order}IdInput, null);
            return false;
        }
    }

    watchSubmitResponse = function()
    {
        $(document).on("ajaxError", $.proxy(this.onSubmitResponse, this));
        $(document).on("ajaxSuccess", $.proxy(this.onSubmitResponse, this));
    }

    onSubmitResponse = function(ev, xhr)
    {
        if (typeof(xhr.responseJSON) !== 'undefined' &&
            typeof(xhr.responseJSON.action) !== 'undefined' &&
            xhr.responseJSON.action === "CheckoutServices-SubmitPayment" &&
            $(".payment-information").data("payment-method-id") === "{apm_id}" &&
            xhr.responseJSON.error
        ) {
            this.removeInsertedSummary();
            this.set{transaction_type === charge ? Session : Order}IdInput('');
            this.watchSubmitButton();
        }
    }

    watchSubmitButton = function()
    {
        this.unwatchSubmitButton();
        this.getSubmitButton().one('click', this.submitHandler);
    }

    unwatchSubmitButton = function()
    {
        this.getSubmitButton().off('click', this.submitHandler);
    }

    setupDisableHandlerValues = function()
    {
        window.fiservSubmitButtonHandler.setFact('{apm_id}_FORM_VALID', false);

        window.fiservSubmitButtonHandler.addBlocker(
            this.methodId,
            '{apm_lower}-ready',
            (buttonHandler) => buttonHandler.getFact('PRIMARY_PAYMENT_METHOD_NOT_REQURED') === false && buttonHandler.getFact('{apm_id}_FORM_VALID') === false
        );
    }

    setSubmitButtonEnabled = function(enabled)
    {
        window.fiservSubmitButtonHandler.setFact('{apm_id}_FORM_VALID', enabled);
    }

    getSdcFieldFrame = function(name)
    {
        switch (name)
        {
            // *** Add a case for each field name within fields that returns in the following format ***
            case "{field_name (camelCase)}":
                return $('#sdc-{field-name (snake case)}-frame');
        }

        return undefined;
    }

    getSdcFieldInvalidMessageContainer = function(name)
    {
        switch (name)
        {
            // *** Add a case for each field name within fields that returns in the following format ***
            case "{field_name (camelCase)}":
                return $('#sdc-{field-name (snake case)}-invalid-message');
        }

        return undefined;
    }

    getSdcInvalidFieldMessageText = function(name)
    {
        let invalidFields = this.formConfig['invalidFields'];

        switch (name)
        {
            // *** Add a case for each field name within fields that returns in the following format ***
            case "{field_name (camelCase)}":
                return invalidFields["{field_name (camelCase)}"];
        }

        return "";
    }

    fieldValidityHandler = function(data, frame, mess)
    {
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

    fieldFocusHandler = function(frame)
    {
        if (typeof(frame) !== "undefined")
        {
            if (frame[0].contains(document.activeElement) === true)
            {
                frame.addClass('sdc-focused-field');
            }
            else
            {
                frame.removeClass('sdc-focused-field');
            }
        }
    }

    mask = function(element, adapter, fieldParameter)
    {
        element.preventDefault();

        let field = element.target;
        let jQueryObject = $('#' + field.id);

        let id;
        if (!fieldParameter)
        {
            id = field.id.replace(/sdc-mask-/, "");
        }
        else
        {
            id = fieldParameter;
        }

        if (jQueryObject.hasClass('sdc-unmasking-icon'))
        {
            jQueryObject.removeClass('sdc-unmasking-icon');
            jQueryObject.addClass('sdc-masking-icon');
            adapter.unmask(id);
        }
        else
        {
            jQueryObject.removeClass('sdc-masking-icon');
            jQueryObject.addClass('sdc-unmasking-icon');
            adapter.mask(id);
        }
    }
}
```

---

## Step 4 — Add error messages (`cartridge/templates/resources/error.properties`)

- Add two new entries at the end of the file following the existing pattern:

#### Button Messages

- message.error.{apm_lower}.fatal=An error occurred while rendering the {apm_proper} button. Please try again later.
- message.error.{apm_lower}.failure=An error occurred while executing the {apm_proper} flow. Please try again later.

#### Iframe Messages
- message.error.{apm_lower}.fatal=An error occurred while loading the {apm_proper} form. Please try again later.
- message.error.{apm_lower}.captureFailCheckout=Failed to capture {apm_proper} payment. Please try again later.

---

# Important Notes

- For `transaction_type = charge`, the hidden input uses `fiservCommercehubPaymentFields.commercehubSessionId`. For `transaction_type = order`, use `fiservCommercehubPaymentFields.commercehubOrderId`
- The `getCommerceHub{apm_pascal}Enabled()` method name used in Steps 1d, 4, 5, and 6 must be identical
- Do NOT modify any existing payment method entries
- Do NOT edit any section of any file not explicitly outlined in the implementation checklist