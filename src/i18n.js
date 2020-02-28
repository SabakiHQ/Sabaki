const nativeRequire = eval('require')

const {remote} = require('electron')
const isElectron = process.versions.electron != null
const isRenderer = isElectron && remote != null
const dolm = require('dolm').load({})

const mainI18n = isRenderer ? remote.require('./i18n') : exports
const setting = isRenderer
  ? remote.require('./setting')
  : isElectron
  ? nativeRequire('./setting')
  : null

exports.t = dolm.t
exports.context = dolm.context

exports.loadStrings = function(strings) {
  if (isRenderer) {
    mainI18n.loadStrings(strings)
  }

  dolm.load(strings)

  exports.strings = strings
  exports.usedStrings = dolm.usedStrings
}

exports.loadFile = function(filename) {
  exports.loadStrings(nativeRequire(filename))
}

exports.loadLang = function(lang) {
  exports.loadFile(`${isRenderer ? '.' : '..'}/lang/${lang}.js`)
}

try {
  exports.loadLang(setting.get('app.lang'))
} catch (err) {
  exports.loadStrings({})
}
