/* eslint-disable prefer-regex-literals */
document.addEventListener("DOMContentLoaded", () => { // eslint-disable-line
    let extractInitializationData = function()
    {
        let data = {
            config: $('#fiserv-commercehub-tokenize-form-init-container').data('commercehub-initialization-data'),
            credentialsUrl: $('#fiserv-commercehub-tokenize-form-init-container').attr('data-commercehub-credentials')
        }
        $('#fiserv-commercehub-tokenize-form-init-container').remove();
        return data;
    }

    let form = new CommercehubTokenizationForm(extractInitializationData());
    form.initialize();
});