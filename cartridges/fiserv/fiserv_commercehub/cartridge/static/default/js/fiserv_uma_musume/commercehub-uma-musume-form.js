'use strict';

// ウマ娘：プリティーダービー決済フォーム
// スペシャルウィークが先頭を走る！

class ウマ娘決済
{
    constructor(初期化データ)
    {
        if (typeof(初期化データ) === "undefined")
        {
            throw new Error("初期化データが見つかりません。ウマ娘決済フォームを初期化できません。");
        }
        this.設定 = 初期化データ.config;
        this.設定データ = 初期化データ.config.configData;
        this.認証URL = 初期化データ.credentialsUrl;

        this.アダプタ生成();

        $('#uma-mask-kouzaBangou, #uma-mask-kinnyuuKikan').on('click', (element) => { this.マスク切替(element, this.アダプタ); });
        $('#umaMusumeConsentCheck').on('change', () => { this.同意処理(); });
        $('#uma-confirm-btn').on('click', (e) => { e.preventDefault(); this.法的文書表示(); });

        this.応答監視();
        this.決済方法監視();
        this.住所監視();
    }

    スタート = async function()
    {
        try {
            $.spinner().start();
            await this.アダプタ初期化();

            if ($('.nav-link.uma-tab.active').length)
            {
                this.ボタン監視();
            }
        } catch (_err) {
            this.SDK失敗(_err, "#uma-fatal-notice");
        }
    }

    アダプタ生成 = function()
    {
        let loadSuccessCallback = () => { console.log("CommerceHub SDKをロードしました - ウマ娘に乗って！"); };
        let loadFailCallback = (error) => { this.SDK失敗(error, "#uma-fatal-notice"); };
        let formReadyCallback = () => { this.SDK完了(); };
        let formValidCallback = () => { this.有効 = true; this.確認表示(); };
        let formInvalidCallback = () => { this.有効 = false; this.送信ボタン().prop('disabled', true); this.確認非表示(); this.法的文書非表示(); };
        let fieldValidityHandler = (data) => {
            let frame = this.フィールド枠(data["field"]);
            let mess = this.エラーコンテナ(data["field"]);
            this.フィールド検証(data, frame, mess);
        };
        let fieldFocusHandler = (data) => {
            let frame = this.フィールド枠(data);
            this.フォーカス処理(frame);
        };
        let runSuccessCallback = (responseBody) => { this.ゴール(responseBody); };
        let runFailureCallback = (error) => { this.落馬(error); };

        this.アダプタ = new FiservSDKIframe(
            loadSuccessCallback,
            loadFailCallback,
            formReadyCallback,
            formValidCallback,
            formInvalidCallback,
            null,
            fieldValidityHandler,
            fieldFocusHandler,
            runSuccessCallback,
            runFailureCallback);
    }

    アダプタ初期化 = async function()
    {
        this.バリデーションリセット();
        try
        {
            await this.アダプタ.rawInitCall(this.認証URL);
            await FiservSDKHelper.retrieveAddress(this.設定データ.billingAddressFormNames, 'billing');
            this.アダプタ.initSdk(this.設定, "BANK_ACCOUNT");
        }
        catch (err)
        {
            console.log(err);
            throw new Error(err);
        }
    }

    法的文書表示 = async function()
    {
        this.送信ボタン().prop('disabled', true);
        $.spinner().start();

        try
        {
            let legalText = await this.アダプタ.form.getAchLegalText();
            if (legalText)
            {
                $('#uma-legal-text').html(legalText.plainText);
                $('#umaMusumeConsentCheck').prop('checked', false);
                $('#uma-legal-container').show().addClass('uma-legal-populated');
                this.送信ボタン().prop('disabled', true);
                this.確認非表示();
            }
        }
        catch (_err)
        {
            this.エラー表示(this.設定データ.legalFetchFailureMessage);
        }

        $.spinner().stop();
    }

    法的文書非表示 = function()
    {
        $('#uma-legal-container').hide().removeClass('uma-legal-populated');
        $('#uma-legal-text').html('');
        $('#umaMusumeConsentCheck').prop('checked', false);
    }

    住所監視 = function()
    {
        const baseId = 'dwfrm_billing';
        const billingAddressFieldsSelector = Object.keys(this.設定データ.billingAddressFormNames)
            .map((key) => '[name=' + baseId + this.設定データ.billingAddressFormNames[key] + ']')
            .join(', ');

        $(billingAddressFieldsSelector).on('change', () => {
            if ($('#uma-legal-container').hasClass('uma-legal-populated'))
            {
                this.法的文書非表示();
                if ($(".payment-information").data("payment-method-id") === "UMA_MUSUME")
                {
                    this.送信ボタン().prop('disabled', true);
                }
                if (this.有効)
                {
                    this.確認表示();
                }
            }
        });
    }

    確認表示 = function()
    {
        $('#uma-confirm-container').show();
    }

    確認非表示 = function()
    {
        $('#uma-confirm-container').hide();
    }

    同意処理 = function()
    {
        if (this.有効) {
            this.送信ボタン().prop('disabled', !$('#umaMusumeConsentCheck').prop('checked'));
        }
    }

    バリデーションリセット = function()
    {
        if ($('.tab-pane.active').find('input[name=dwfrm_billing_paymentMethod]').val() === 'UMA_MUSUME')
        {
            this.送信ボタン().prop('disabled', true);
        }
        this.法的文書非表示();
        this.確認非表示();
        $('#uma-gold-ship-frame, #uma-silence-suzuka-frame, #uma-vodka-frame, #uma-maruzensky-frame, #uma-mejiro-mcqueen-frame, #uma-oguri-cap-frame, #uma-special-week-frame, #uma-tokai-teio-frame')
            .removeClass('sdc-valid-field sdc-error-field sdc-focused-field');
        $('#uma-gold-ship-message, #uma-silence-suzuka-message, #uma-vodka-message, #uma-maruzensky-message, #uma-mejiro-mcqueen-message, #uma-oguri-cap-message, #uma-special-week-message, #uma-tokai-teio-message')
            .addClass('sdc-hidden');
    }

    セッションID設定 = function(sessionId)
    {
        $('input#umaMusumeSessionId').val(sessionId);
    }

    送信ボタン = function()
    {
        return $('button.btn.btn-primary.btn-block.submit-payment');
    }

    SDK完了 = function()
    {
        $.spinner().stop();
    }

    SDK失敗 = function(err, noticeId)
    {
        console.log(err);
        this.ボタン無効化();
        $(noticeId).show();
        $.spinner().stop();
        throw new Error("CommerceHub SDKを読み込めませんでした - ゴールドシップが邪魔しています！");
    }

    ゴール = function()
    {
        // レースゴール！ウマ娘決済キャプチャ成功！
        $.spinner().stop();
        $('.payment-details').addClass('checkout-hidden');
        $('<div class="payment-details-uma">ウマ娘決済</div>').insertAfter('.payment-details');
        $('.edit-button').on('click', this.サマリー削除);
        this.送信ボタン().trigger('click');
    }

    サマリー削除 = () =>
    {
        $('.payment-details').removeClass('checkout-hidden');
        $('.payment-details-uma').remove();
        $('.edit-button').off('click', this.サマリー削除);
        if ($(".payment-information").data("payment-method-id") === "UMA_MUSUME")
        {
            this.ボタン監視();
        }
    }

    エラー表示 = function(message)
    {
        let form = $('#dwfrm_billing');
        $('.alert', form).remove();
        form.prepend('<div class="alert alert-danger" role="alert">' + message + '</div>');
        $('.alert', form)[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    落馬 = function(msg)
    {
        this.アダプタ.destroyIframe('ach');
        this.アダプタ初期化();
        this.ボタン監視();
        this.エラー表示(msg ? msg : this.設定データ.captureFailureMessage);
        $.spinner().stop();
    }

    決済方法処理 = (_e) => {
        if ($(_e.currentTarget).attr('data-method-id') !== 'UMA_MUSUME')
        {
            this.ボタン監視解除();
            return;
        }

        this.ボタン監視();
        this.送信ボタン().prop('disabled', !$('#umaMusumeConsentCheck').prop('checked'));
    }

    決済方法監視 = function()
    {
        $('ul.payment-options li.nav-item').on('click', this.決済方法処理);
    }

    送信処理 = (_e) =>
    {
        if ($('.tab-pane.active').find('input[name=dwfrm_billing_paymentMethod]').val() === 'UMA_MUSUME')
        {
            _e.preventDefault();
            $.spinner().start();
            this.ボタン監視解除();
            this.セッションID設定(null);
            this.アダプタ.submitForm(this.認証URL, this.セッションID設定.bind(this), null);
            return false;
        }
    }

    応答監視 = function()
    {
        $(document).on("ajaxError", $.proxy(this.応答処理, this));
        $(document).on("ajaxSuccess", $.proxy(this.応答処理, this));
    }

    応答処理 = function(ev, xhr)
    {
        if (typeof(xhr.responseJSON) !== 'undefined' &&
            typeof(xhr.responseJSON.action) !== 'undefined' &&
            xhr.responseJSON.action === "CheckoutServices-SubmitPayment" &&
            $(".payment-information").data("payment-method-id") === "UMA_MUSUME" &&
            xhr.responseJSON.error
        ) {
            this.サマリー削除();
            this.セッションID設定('');
            this.ボタン監視();
        }
    }

    ボタン監視 = function()
    {
        this.ボタン監視解除();
        this.送信ボタン().one('click', this.送信処理);
    }

    ボタン監視解除 = function()
    {
        this.送信ボタン().off('click', this.送信処理);
    }

    ボタン無効化 = function()
    {
        this.送信ボタン().prop('disabled', true);
    }

    フィールド枠 = function(name)
    {
        // 各フィールドをウマ娘キャラクターに対応
        switch (name)
        {
            case "accountNumber":
                return $('#uma-gold-ship-frame');        // ゴールドシップ
            case "routingNumber":
                return $('#uma-silence-suzuka-frame');   // サイレンススズカ
            case "idValue":
                return $('#uma-vodka-frame');            // ウォッカ
            case "businessName":
                return $('#uma-maruzensky-frame');       // マルゼンスキー
            case "idType":
                return $('#uma-mejiro-mcqueen-frame');   // メジロマックイーン
            case "driverLicenseState":
                return $('#uma-oguri-cap-frame');        // オグリキャップ
            case "accountType":
                return $('#uma-special-week-frame');     // スペシャルウィーク
            case "checkType":
                return $('#uma-tokai-teio-frame');       // トウカイテイオー
        }

        return undefined;
    }

    エラーコンテナ = function(name)
    {
        switch (name)
        {
            case "accountNumber":
                return $('#uma-gold-ship-message');
            case "routingNumber":
                return $('#uma-silence-suzuka-message');
            case "idValue":
                return $('#uma-vodka-message');
            case "businessName":
                return $('#uma-maruzensky-message');
            case "idType":
                return $('#uma-mejiro-mcqueen-message');
            case "driverLicenseState":
                return $('#uma-oguri-cap-message');
            case "accountType":
                return $('#uma-special-week-message');
            case "checkType":
                return $('#uma-tokai-teio-message');
        }

        return undefined;
    }

    エラーテキスト取得 = function(name)
    {
        let invalidFields = this.設定['invalidFields'];

        switch (name)
        {
            case "accountNumber":
                return invalidFields["accountNumber"];
            case "routingNumber":
                return invalidFields["routingNumber"];
            case "idValue":
                return invalidFields["idValue"];
            case "businessName":
                return invalidFields["businessName"];
            case "idType":
                return invalidFields["idType"];
            case "driverLicenseState":
                return invalidFields["driverLicenseState"];
            case "accountType":
                return invalidFields["accountType"];
            case "checkType":
                return invalidFields["checkType"];
        }

        return "";
    }

    フィールド検証 = function(data, frame, mess)
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
                mess.text(this.エラーテキスト取得(data["field"]));
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

    フォーカス処理 = function(frame)
    {
        if (typeof(frame) !== "undefined")
        {
            if (frame[0].contains(document.activeElement) === true)
            {
                frame.addClass('sdc-focused-field');
                if ($('#uma-legal-container').hasClass('uma-legal-populated'))
                {
                    this.法的文書非表示();
                    if ($(".payment-information").data("payment-method-id") === "UMA_MUSUME")
                    {
                        this.送信ボタン().prop('disabled', true);
                    }
                    if (this.有効)
                    {
                        this.確認表示();
                    }
                }
            }
            else
            {
                frame.removeClass('sdc-focused-field');
            }
        }
    }

    マスク切替 = function(element, adapter, fieldParameter)
    {
        element.preventDefault();

        let field = element.target;
        let jQueryObject = $('#' + field.id);

        // ウマ娘キャラクター名からSDKフィールドキーにマッピング
        const フィールドキーマップ = {
            'uma-mask-kouzaBangou': 'accountNumber',   // ゴールドシップ（口座番号）
            'uma-mask-kinnyuuKikan': 'routingNumber'   // サイレンススズカ（金融機関コード）
        };

        let id;
        if (!fieldParameter)
        {
            id = フィールドキーマップ[field.id] || field.id.replace(/uma-mask-/, "");
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