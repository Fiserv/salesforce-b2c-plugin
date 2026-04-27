# Architecture

## Purpose
This document describes the high-level architecture, file paths, and implementation standards for the Fiserv Salesforce B2C Plugin

## High-Level Flow

1. `cartridges/fiserv/fiserv_commercehub/cartridge/fiservConstants/constants.js` Constants file for various constants used throughout the repository
2. `cartridges/fiserv/fiserv_commercehub/cartridge/forms/default` Holds files listing fields for frontend form components
3. `cartridges/fiserv/fiserv_commercehub/cartridge/mdoels` Holds all fiserv model classes for each APM (not including payment.js)
4. `cartridges/fiserv/fiserv_commercehub/cartridge/scripts` Contains various backend util files
5. `cartridges/fiserv/fiserv_commercehub/cartridge/scripts/hooks/payment/processor` Backend entrance points for processForm, Handle, and Authorize hooks for each APM (Includes externally called functions outside of our control)
6. `cartridges/fiserv/fiserv_commercehub/cartridge/scripts/utils` Includes a lot of files used for communication with Commerce Hub
7. `cartridges/fiserv/fiserv_commercehub/cartridge/scripts/utils/commercehubConfig` Primary file used for config information retrieval
8. `cartridges/fiserv/fiserv_commercehub/cartridge/scripts/utils/commercehubFrontendInitializationData.js` Primary file used to send required data for each APM to the frontend
9. `cartridges/fiserv/fiserv_commercehub/cartridge/static/default` Frontend files for all APMS
10. `cartridges/fiserv/fiserv_commercehub/cartridge/templates/defualt` Includes all frontend ISML (HTML files with added funcitonality) files
11. `cartridges/fiserv/fiserv_commercehub/cartridge/templates/resources` Includes all message files for text that might hit the frontend (built out to allow for globalized language configurations)
12. `site_import/metadata/system-objecttype-extensions.xml` File where config options are defined and included into APMs
13. `site_import/sites/RefArch/payment-processors.xml` Defines default values for configs
14. `cartridges/fiserv/fiserv_commercehub/cartridge/controllers/FiservSettings.js` File which organizes the frontend appearance of our custom config page