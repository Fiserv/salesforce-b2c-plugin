/* eslint-disable prefer-regex-literals */
document.addEventListener("DOMContentLoaded", () => { // eslint-disable-line
    let getFormConfigUrl = function () 
    {
        return $('#fiserv-commercehub-card-form-container').attr('data-commercehub-form-config');
    }

    let getCredentialsUrl = function () 
    {
        return $('#fiserv-commercehub-card-form-container').attr('data-commercehub-credentials');
    }

    let form = new CommercehubTokenizationForm(getFormConfigUrl(), getCredentialsUrl());
    form.initialize();
});