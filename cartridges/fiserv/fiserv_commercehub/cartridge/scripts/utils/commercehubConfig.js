const dwSystem = require('dw/system');
const currentSite = dwSystem.Site.getCurrent();

function getSitePreference(field)
{
    let preference = null;
    if (currentSite && currentSite.getCustomPreferenceValue(field))
    {
        preference = currentSite.getCustomPreferenceValue(field);
    }
    return preference;
}

const commerceHubExport = 
{
    getCommerceHubMerchantId()
    {
        return getSitePreference('CommerceHubMerchantID');
    },
 
    getCommerceHubTerminalId()
    {
        return getSitePreference('CommerceHubTerminalID');
    },
  
    getCommerceHubApiKey()
    {
        return getSitePreference('CommerceHubAPIKey');
    },
   
    // this gotta be removed
    // just here for testing
    getCommerceHubApiSecret()
    {
        return getSitePreference('CommerceHubAPISecret');
    },

    getCommerceHubApiEnvironment()
    {
        return getSitePreference('CommerceHubAPIEnvironment');
    },

    getCommerceHubPaymentType()
    {
        return getSitePreference('CommerceHubPaymentType');
    },

    getCommerceHubTokenization()
    {
        return getSitePreference('CommerceHubTokenization');
    },

    getCommerceHubStandaloneSpa()
    {
        return getSitePreference('CommerceHubStandaloneSPA');
    }
};

module.exports = commerceHubExport;