'use strict';

// Standalone CVV toggle functionality

jQuery(document).ready(function() {
    function toggleCVVField() {
      var tokenizationCheckbox = jQuery('#CommerceHubTokenization');
       
        var isChecked = tokenizationCheckbox.is(':checked');
        
        // Try multiple container selection strategies
        var container = jQuery('#CommerceHubCVVEnableItem');
        
        if (container.length > 0) {
            if (isChecked) {
                container.show();
                container.css('display', '');
            } else {
                container.hide();
                container.css('display', 'none');
            }
        }
    }
    
    // Attach event handlers
    console.log('[CVV Toggle] Attaching event handlers');
    jQuery(document).on('change', '#CommerceHubTokenization', function() {
        console.log('[CVV Toggle] CHANGE event on tokenization checkbox');
        toggleCVVField();
    });
    
    jQuery(document).on('input', '#CommerceHubTokenization', function() {
        console.log('[CVV Toggle] INPUT event on tokenization checkbox');
        toggleCVVField();
    });
    
    console.log('[CVV Toggle] Setup complete');
});
