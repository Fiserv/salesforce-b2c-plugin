'use strict';

var configChanges = {};
var preferenceValues;
var dependencyList = {};
var dependencyCounter = {};
var scrollContainerTracker = {};
var saveURL;

function instantiate()
{
    console.log('[Form Manager] instantiate() called');
    let instantiationDomElement = jQuery('#instantiationParams');
    preferenceValues = JSON.parse(instantiationDomElement.attr('preference-values'));
    saveURL = instantiationDomElement.attr('save-url');
    instantiationDomElement.remove();

    // Basic input tracking
    jQuery('input.configField, select.configField, textarea.textBoxConfigField').on("input", function() {
        let newValue = jQuery(this).val();
        if(jQuery(this).attr('type') === 'checkbox') {
            newValue = jQuery(this).is(':checked');
        }
        if(newValue === '')
        {
            newValue = '\0';
        }

        configChanges[jQuery(this).attr('id')] = newValue;
        jQuery('#saveButton').prop('disabled', false);
    });

    // Handle CVV field visibility based on tokenization checkbox
    function toggleCVVField() {
        console.log('[CVV Toggle] Function called');
        let tokenizationCheckbox = jQuery('#CommerceHubTokenization');
        console.log('[CVV Toggle] Tokenization checkbox found:', tokenizationCheckbox.length > 0);
        console.log('[CVV Toggle] Tokenization checked:', tokenizationCheckbox.is(':checked'));
        
        // Try multiple strategies to find the CVV field container
        let cvvField = jQuery('#CommerceHubCVVEnable');
        console.log('[CVV Toggle] CVV field found:', cvvField.length > 0);
        
        let cvvFieldContainer = null;
        
        // Strategy 1: Try closest with configFieldContainer class
        cvvFieldContainer = cvvField.closest('.configFieldContainer');
        console.log('[CVV Toggle] Strategy 1 (.configFieldContainer):', cvvFieldContainer.length);
        
        // Strategy 2: Try parent's parent (field -> container -> row)
        if (!cvvFieldContainer.length) {
            cvvFieldContainer = cvvField.parent().parent();
            console.log('[CVV Toggle] Strategy 2 (parent.parent):', cvvFieldContainer.length);
        }
        
        // Strategy 3: Find by ID if it exists
        if (!cvvFieldContainer.length) {
            cvvFieldContainer = jQuery('#CommerceHubCVVEnableItem');
            console.log('[CVV Toggle] Strategy 3 (#CommerceHubCVVEnableItem):', cvvFieldContainer.length);
        }
        
        // Strategy 4: Find the label and get its parent container
        if (!cvvFieldContainer.length) {
            let label = jQuery('label[for="CommerceHubCVVEnable"]');
            if (label.length) {
                cvvFieldContainer = label.closest('div').parent();
                console.log('[CVV Toggle] Strategy 4 (label parent):', cvvFieldContainer.length);
            }
        }
        
        if (tokenizationCheckbox.length && cvvFieldContainer && cvvFieldContainer.length) {
            console.log('[CVV Toggle] Container HTML:', cvvFieldContainer.prop('outerHTML').substring(0, 200));
            if (tokenizationCheckbox.is(':checked')) {
                console.log('[CVV Toggle] Showing CVV field');
                cvvFieldContainer.show();
                cvvFieldContainer.css('display', '');
            } else {
                console.log('[CVV Toggle] Hiding CVV field');
                cvvFieldContainer.hide();
                cvvFieldContainer.css('display', 'none');
            }
        } else {
            console.log('[CVV Toggle] ERROR: Could not find required elements');
            console.log('[CVV Toggle] Tokenization checkbox:', tokenizationCheckbox.length);
            console.log('[CVV Toggle] CVV container:', cvvFieldContainer ? cvvFieldContainer.length : 0);
        }
    }
    
    // Initial check on page load with longer delay
    setTimeout(function() {
        console.log('[CVV Toggle] Initial load toggle');
        toggleCVVField();
    }, 500);
    
    // Watch for changes to tokenization checkbox
    jQuery('#CommerceHubTokenization').on('change', function() {
        console.log('[CVV Toggle] Change event fired');
        toggleCVVField();
    });
    jQuery('#CommerceHubTokenization').on('input', function() {
        console.log('[CVV Toggle] Input event fired');
        toggleCVVField();
    });
    jQuery('#CommerceHubTokenization').on('click', function() {
        console.log('[CVV Toggle] Click event fired');
        setTimeout(toggleCVVField, 50);
    });

    // Dependency code
    for(let key in preferenceValues)
    {
        if(preferenceValues[key].dependencies != null)
        {
            let dependencies = preferenceValues[key].dependencies;
            for(let i = 0 ; i < dependencies.length; i++)
            {
                addDependencyEvents(dependencies[i], key);
            }
        }
        if(preferenceValues[key].nonInputDependencies != null)
        {
            let nonInputDependencies = preferenceValues[key].nonInputDependencies;
            for(let i = 0 ; i < nonInputDependencies.length; i++)
            {
                addDependencyEvents(key, nonInputDependencies[i]);
            }
        }
    }

    // Scroll bar functionality
    jQuery('.configScrollOptionContainer').first().addClass('scrollLocation');
    jQuery('.scrollLabel').on("click", function() {
        jQuery('#' + jQuery(this).attr('name'))[0].scrollIntoView({ block: 'start', behavior: 'smooth'});
        let configScrollOptionContainerQuery = jQuery('.configScrollOptionContainer');
        configScrollOptionContainerQuery.addClass('noLocation');
        // Minor timeout to account for jump time
        setTimeout(() => {
            configScrollOptionContainerQuery.removeClass('scrollLocation');
            configScrollOptionContainerQuery.removeClass('noLocation');
            jQuery(this).parent().addClass('scrollLocation');
        }, 1000);
    });

    // This might be more complex than it needs to be, but I like it this way personally...
    jQuery('.customModule-card').on('scroll', function() {
        let pageQuery = jQuery('.customModule-card')
        let pageOffset = pageQuery.offset().top;
        let pageHalfHeight = pageQuery.outerHeight() / 2;
        jQuery('.configGroupContainer').each(function() {
            let titleQuery = jQuery(this);
            let id = titleQuery.attr('id');
            let titleOffset = titleQuery.offset().top - parseInt(titleQuery.css('padding-top'));
            let distFromHalf = pageOffset + pageHalfHeight - titleOffset;
            let distFromTop = pageOffset - titleOffset;

            // If titleOffset is not above the halfway point or is above the top of the page, don't consider it...
            if(distFromHalf < 0 || distFromTop > 0)
            {
                if(scrollContainerTracker[id] !== undefined) // Delete the value if it's in the list
                {
                    delete scrollContainerTracker[id];
                }
                return;
            }
            else // Else, update it's distance value...
            {
                scrollContainerTracker[id] = distFromHalf;
            }
        });

        // Check for min distance from center and set it as the selected scroll section
        let min = -1;
        let minId = null;
        for(let scrollId in scrollContainerTracker)
        {
            if(min === -1 || min > scrollContainerTracker[scrollId])
            {
                minId = scrollId;
                min = scrollContainerTracker[scrollId];
            }
        }

        // If no new Id. return to prevent unsetting last id...
        if(minId === null)
            return;

        let configScrollOptionContainerQuery = jQuery('.configScrollOptionContainer');
        configScrollOptionContainerQuery.removeClass('scrollLocation');
        configScrollOptionContainerQuery.children('[name=' + minId + ']').parent().addClass('scrollLocation');
    });

    // Code to hide form config side scrolling
    jQuery('.customModule-card').on('scroll', function() {
        let pageQuery = jQuery('.customModule-card')
        let pageOffset = pageQuery.offset().top;
        let pageHalfHeight = pageQuery.outerHeight() / 2;
        jQuery('.formContainer').each(function() {
            let containerQuery = jQuery(this);
            let id = containerQuery.attr('name');
            let titleOffsetTop = containerQuery.offset().top;
            let titleOffsetBottom = titleOffsetTop + containerQuery.outerHeight(true);
            let topDistFromHalf = pageOffset + pageHalfHeight - titleOffsetTop;
            let bottomDistFromHalf = pageOffset + pageHalfHeight - titleOffsetBottom;

            // Render scroll sections with data attribute equal to form container names
            if(topDistFromHalf > 0 && bottomDistFromHalf < 0)
            {
                jQuery('.formScrollOption[data-form-name=' + id + ']').removeClass('hidden');
            }
            else
            {
                jQuery('.formScrollOption[data-form-name=' + id + ']').addClass('hidden');
            }
        });
    });
}

function addDependencyEvents(dependency, key)
{
    if(dependencyList[dependency] === undefined)
    {
        dependencyList[dependency] = [];
    }
    if(dependencyCounter[key] === undefined)
    {
        dependencyCounter[key] = 0;
    }
    jQuery('#' + dependency).on('input', function() {
        if(jQuery(this).is(':checked'))
        {
            jQuery('#' + key).prop('disabled', false);
            dependencyCounter[key]--;
            if(dependencyCounter[key] === 0)
            {
                jQuery('#' + key + 'Item, #' + key).show();
            }
        }
        else
        {
            jQuery('#' + key).prop('disabled', true);
            if(dependencyCounter[key] === 0)
            {
                jQuery('#' + key + 'Item, #' + key).hide();
            }
            dependencyCounter[key]++;
        }
    });
    if(!jQuery('#' + dependency).is(':checked'))
    {
        jQuery('#' + key).prop('disabled', true);
        dependencyCounter[key]++;
        jQuery('#' + key + 'Item').hide();
    }
}

// Error message function
function showMessage(msg, status)
{
    let statusClass = 'Message';
    switch(status) {
        case 0:
            statusClass = 'fail' + statusClass;
            break;
        case 1:
            statusClass = 'success' + statusClass;
            break;
        case 2:
            statusClass = 'warn' + statusClass;
            break;
    }
    let messageQuery = jQuery("#messageContainer").prepend('<div class="messageBlock ' + statusClass + '">' + msg + '</div>').children(':first-child');
    setTimeout(function() {
        messageQuery.addClass('removeMessage');
        setTimeout(function() {
            messageQuery.remove();
        }, 500);
    }, 5000);
}

// Displays the errors on failed saves
function listErrors(errorFields)
{
    for(let key in errorFields)
    {
        let errorField = jQuery('#' + key + 'Alert');
        errorField.children().removeClass();
        errorField.children().addClass('fieldError');
        errorField.children().text(errorFields[key]);
        errorField.removeClass('hidden');
    }
}

// Displays the warnings on imperfect saves
function listWarnings(warnFields)
{
    for(let i = 0; i < warnFields.length; i++)
    {
        let warnField = jQuery('#' + warnFields[i] + 'Alert');
        warnField.children().removeClass();
        warnField.children().addClass('fieldWarn');
        warnField.children().html("Mandatory field not set.<br>You will not be able to process payments.");
        warnField.removeClass('hidden');
    }
}

// Send the changes to the backend
function applyChanges()
{
    jQuery('.alertDetail').addClass('hidden');
    if(Object.keys(configChanges).length === 0)
    {
        return;
    }
    jQuery.ajax({
        url: saveURL,
        cache: false,
        dataType: 'json',
        type: "POST",
        data: configChanges,
        success: function(response) {
            showMessage(response.successMessage, 1);
            for(let key in configChanges)
            {
                if(configChanges[key] === '\0')
                    configChanges[key] = '';
                preferenceValues[key].currentValue = configChanges[key];
            }
            if(response.warn)
            {
                showMessage(response.warnMessage, 2);
                listWarnings(response.warnList);
            }
            configChanges = {};
            jQuery('#saveButton').prop('disabled', true);
            jQuery('.headerContainer')[0].scrollIntoView({ block: 'start', behavior: 'smooth'});
        },
        error: function(err) {
            let response = err.responseJSON;
            if(response.success)
            {
                // Partial success, need to update and remove successful fields in configChanges...
                let tmpConfig = {};
                for(let key in response.errorList)
                {
                    tmpConfig[key] = configChanges[key];
                    delete configChanges[key]; 
                }
                for(let key in configChanges)
                {
                    if(configChanges[key] === '\0')
                        configChanges[key] = '';
                    preferenceValues[key].currentValue = configChanges[key];
                }
                configChanges = tmpConfig;
                showMessage(response.successMessage, 1);
            }
            if(response.warn)
            {
                showMessage(response.warnMessage, 2);
                listWarnings(response.warnList);
            }
            listErrors(response.errorList);
            showMessage(response.errorMessage, 0);
            jQuery('.headerContainer')[0].scrollIntoView({ block: 'start', behavior: 'smooth'});
        }
    });
}

// Self explanatory
function clearChanges()
{
    Object.keys(configChanges).forEach(key => {
        let queryObject = jQuery('#' + key);
        let valueChanged = false;
        if(queryObject.attr('type') !== 'checkbox')
        {
            if(queryObject.val() !== preferenceValues[key].currentValue)
            {
                queryObject.val(preferenceValues[key].currentValue);
                valueChanged = true;
            }
        }
        else
        {
            if(queryObject.prop('checked') !== preferenceValues[key].currentValue)
            {
                queryObject.prop('checked', preferenceValues[key].currentValue);
                valueChanged = true;
            }
        }
        if(valueChanged && dependencyList[key])
        {
            queryObject.trigger('input');
        }
    });

    configChanges = {};
    jQuery('#saveButton').prop('disabled', true);
}