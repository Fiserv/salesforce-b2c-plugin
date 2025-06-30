"use strict";

var Logger = require('dw/system/Logger');
const commercehubConfig = require('*/cartridge/scripts/utils/commercehubConfig');
const lvlMap = {
    'L1': 1,
    'L2': 2,
    'L3': 3,
}
const logLevel = lvlMap[commercehubConfig.getCommerceHubLoggingLevel()];

// For future enhancements...
function formatMessage(lvl, msg, orderNo)
{
    return '[L' + lvl + '] ' + (orderNo ? '[Order:' + orderNo + '] ' : '') + msg;
}

function logFatal(lvl, msg, orderNo) {
    if(lvl > logLevel)
        return;
    return Logger.getLogger('CommerceHub_FATAL', 'Fiserv').fatal(formatMessage(lvl, msg, orderNo));
}

function logError(lvl, msg, orderNo) {
    if(lvl > logLevel)
        return;
    return Logger.getLogger('CommerceHub_ERROR', 'Fiserv').error(formatMessage(lvl, msg, orderNo));
}

function logWarn(lvl, msg, orderNo) {
    if(lvl > logLevel)
        return;
    return Logger.getLogger('CommerceHub_WARN', 'Fiserv').warn(formatMessage(lvl, msg, orderNo));
}

function logInfo(lvl, msg, orderNo) {
    if(lvl > logLevel)
        return;
    return Logger.getLogger('CommerceHub_INFO', 'Fiserv').info(formatMessage(lvl, msg, orderNo));
}

function logDebug(lvl, msg, orderNo) {
    if(lvl > logLevel)
        return;
    return Logger.getLogger('CommerceHub_DEBUG', 'Fiserv').debug(formatMessage(lvl, msg, orderNo));
}

module.exports = {
    logFatal: logFatal,
    logError: logError,
    logWarn: logWarn,
    logInfo: logInfo,
    logDebug: logDebug
};