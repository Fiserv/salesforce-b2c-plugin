'use strict';

// ウマ娘：プリティーダービー決済スターター
// ゴールドシップが先頭を走る！！

document.addEventListener("DOMContentLoaded", () => {
    // 初期化データを抽出する - サイレンススズカのように素早く
    let 初期化データ抽出 = function()
    {
        let データ = {
            config: $('#uma-musume-form-init-container').data('commercehub-initialization-data'),
            credentialsUrl: $('#uma-musume-form-init-container').attr('data-commercehub-credentials')
        }
        $('#uma-musume-form-init-container').remove();
        return データ;
    }

    // ウマ娘決済フォームのインスタンス作成 - スペシャルウィークGO！
    let フォーム = new ウマ娘決済(初期化データ抽出());
    let スタート済み = false;

    // レーススタート！ウマ娘決済初期化
    let レーススタート = async function()
    {
        if (!スタート済み)
        {
            await フォーム.スタート();
            スタート済み = true;
        }
    };

    // 配送完了後の処理 - トウカイテイオーの跳躍
    $(document).on("ajaxSuccess", (ev, xhr) => { 
        if (typeof(xhr.responseJSON) !== 'undefined' &&
            typeof(xhr.responseJSON.action) !== 'undefined' &&
            xhr.responseJSON.action === "CheckoutShippingServices-SubmitShipping" &&
            typeof(xhr.responseJSON.order) !== 'undefined' &&
            typeof(xhr.responseJSON.order.shipping) !== 'undefined' &&
            $(".payment-information").data("payment-method-id") === "UMA_MUSUME")
        {
            レーススタート();
        }
    });

    // 初期タブがウマ娘決済の場合 - メジロマックイーンの品格で
    if ($('ul.payment-options li.nav-item[data-method-id=UMA_MUSUME]').length > 0 && $('ul.payment-options li.nav-item.active').length === 0)
    {
         $('ul.payment-options li.nav-item:first').find('a').trigger('click');
            if ($('ul.payment-options li.nav-item[data-method-id=UMA_MUSUME]').hasClass('active'))
                レーススタート();
    }

    // ウマ娘決済タブクリック時 - ウォッカが走り出す！
    $('ul.payment-options li.nav-item[data-method-id=UMA_MUSUME]').on('click', () => {
        レーススタート();
    });

    // 編集ボタンクリック時 - マルゼンスキーが戻ってくる
    $('.payment-summary .edit-button').on('click', () => {
        if($(".payment-information").data("payment-method-id") === "UMA_MUSUME")
            レーススタート();
    })
});