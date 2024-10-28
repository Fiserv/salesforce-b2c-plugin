/* eslint-disable prefer-regex-literals */
document.addEventListener("DOMContentLoaded", () => { // eslint-disable-line
    let getChSdkUrl = function () 
    {
        return $('#fiserv-commercehub-card-form-container').attr('data-commercehub-credentials');
    }

    let form = new CommercehubTokenizationForm(getChSdkUrl());
    form.initialize();
});