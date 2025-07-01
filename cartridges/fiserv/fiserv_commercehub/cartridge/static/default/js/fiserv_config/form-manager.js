var configChanges = {};
var preferenceValues;
var dependencyList = {};
var dependencyCounter = {};
var scrollContainerTracker = {};
var saveURL;

function instantiate()
{
    let instantiationDomElement = jQuery('#instantiationParams');
    preferenceValues = JSON.parse(instantiationDomElement.attr('preference-values'));
    saveURL = instantiationDomElement.attr('save-url');
    instantiationDomElement.remove();

    // Basic input tracking
    jQuery('input.configField, select.configField, textarea.configField').on("input", function() {
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

    // Dependency code
    for(let key in preferenceValues)
    {
        if(preferenceValues[key].dependencies != null)
        {
            let dependencies = preferenceValues[key].dependencies;
            for(let i = 0 ; i < dependencies.length; i++)
            {
                if(dependencyList[dependencies[i].id] === undefined)
                {
                    dependencyList[dependencies[i].id] = []
                }
                if(dependencyCounter[key] === undefined)
                {
                    dependencyCounter[key] = 0;
                }
                jQuery('#' + dependencies[i].id).on('input', function() {
                    if(jQuery(this).is(':checked'))
                    {
                        jQuery('#' + key).prop('disabled', false);
                        dependencyCounter[key]--;
                        if(dependencyCounter[key] === 0)
                        {
                            jQuery('#' + key + 'Item').show();
                        }
                    }
                    else
                    {
                        jQuery('#' + key).prop('disabled', true);
                        if(dependencyCounter[key] === 0)
                        {
                            jQuery('#' + key + 'Item').hide();
                        }
                        dependencyCounter[key]++;
                    }
                });
                if(!jQuery('#' + dependencies[i].id).is(':checked'))
                {
                    jQuery('#' + key).prop('disabled', true);
                    dependencyCounter[key]++;
                    jQuery('#' + key + 'Item').hide();
                }
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
            response = err.responseJSON;
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
        if(queryObject.attr('type') !== 'checkbox')
        {
            queryObject.val(preferenceValues[key].currentValue);
        }
        else
        {
            queryObject.prop('checked', preferenceValues[key].currentValue);
        }
        if(dependencyList[key])
        {
            queryObject.trigger('input');
        }
    });

    configChanges = {};
    jQuery('#saveButton').prop('disabled', true);
}