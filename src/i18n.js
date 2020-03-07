const nativeRequire = eval('require')

const {remote} = require('electron')
const isElectron = process.versions.electron != null
const isRenderer = isElectron && remote != null
const {load: dolmLoad, getKey} = require('dolm')

const dolm = dolmLoad({}, exports.getKey)
const mainI18n = isRenderer ? remote.require('./i18n') : null
const setting = isRenderer
  ? remote.require('./setting')
  : isElectron
  ? nativeRequire('./setting')
  : null

let appLang = setting == null ? undefined : setting.get('app.lang')

exports.t = dolm.t
exports.context = dolm.context

exports.formatNumber = function(num) {
  return new Intl.NumberFormat(appLang).format(num)
}

exports.getKey = function(input, params = {}) {
  let key = getKey(input, params)
  return key.replace(/&(?=\w)/g, '')
}

exports.loadStrings = function(strings) {
  if (isRenderer) {
    mainI18n.loadStrings(strings)
  }

  dolm.load(strings)
}

exports.loadFile = function(filename) {
  exports.loadStrings(nativeRequire(filename))
}

exports.loadLang = function(lang) {
  appLang = lang
  exports.loadFile(`${isRenderer ? '.' : '..'}/i18n/${lang}.i18n.js`)
}

try {
  exports.loadLang(appLang)
} catch (err) {
  exports.loadStrings({})
}
