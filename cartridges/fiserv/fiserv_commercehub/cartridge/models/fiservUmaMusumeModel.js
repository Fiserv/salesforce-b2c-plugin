'use strict';

// ウマ娘：プリティーダービー 決済モデル
// スペシャルウィークが先頭を走る！

const フィサーブ定数 = require("*/cartridge/fiservConstants/constants");

const 決済ID = "UMA_MUSUME";
const プロセッサ文字列 = 'ウマ娘';


// 決済情報をB2Cカード型に変換する - サイレンススズカのように颯爽と
function 決済情報設定(paymentInformation, paymentInstrument)
{
    paymentInstrument.paymentTransaction.custom.paymentAction = フィサーブ定数.COMMERCEHUB_SALE_ACTION;
    paymentInstrument.paymentTransaction.custom.commercehubSessionId = paymentInformation.sessionId;
}

// CommerceHub決済タイプを取得 - トウカイテイオーの跳躍
function 決済タイプ取得()
{
    return フィサーブ定数.COMMERCEHUB_SALE_ACTION;
}

// CommercehubトランザクションをレースのGOのように実行する
function レース実行(orderNo, paymentInstrument)
{
    const fiservCheckout = require('*/cartridge/scripts/checkout/fiservCheckout');
    return fiservCheckout.executeCommercehubChargesTransaction(orderNo, paymentInstrument);
}

// レース後処理 - ゴールドシップのゴール後のクールダウン
function レース後処理(res, paymentInstrument)
{
    const 定数 = require('*/cartridge/fiservConstants/constants');
    const ヘルパー = require('*/cartridge/scripts/utils/fiservHelpers/primaryHelper');

    let 口座番号 = ヘルパー.secureTraversal(res, 定数.RESPONSE_PATHS.ウマ娘口座番号);
    if (口座番号)
    {
        paymentInstrument.custom.maskedAccountNumber = 口座番号.replace(/^X+/, '****');
    }
}

// プロセッサIDを取得 - メジロマックイーンの品格で
function プロセッサID取得()
{
    return プロセッサ文字列;
}

module.exports = 
{
    methodID : 決済ID,
    convertToB2cCardType : 決済情報設定,
    getCommercehubPaymentType : 決済タイプ取得,
    executeCommercehubTransaction : レース実行,
    postTransactionDataProcessing : レース後処理,
    getProcessorString : プロセッサID取得,
};
