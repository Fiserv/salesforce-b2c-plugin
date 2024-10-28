"use strict";

var Logger = require('dw/system/Logger');
function fatal_log(msg) {
  return Logger.getLogger('CommerceHub_fatal', 'Fiserv').fatal(msg);
}
function error_log(msg) {
  return Logger.getLogger('CommerceHub_error', 'Fiserv').error(msg);
}
function debug_log(msg) {
  return Logger.getLogger('CommerceHub_debug', 'Fiserv').debug(msg);
}
function info_log(msg) {
  return Logger.getLogger('CommerceHub_info', 'Fiserv').info(msg);
}
module.exports = {
  fatal_log: fatal_log,
  error_log: error_log,
  debug_log: debug_log,
  info_log: info_log
};