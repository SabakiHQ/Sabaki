// Prevent webpack from bundling modules required using customReq
const customReq = p => require(p)

const {remote} = require('electron')
const isRenderer = remote != null

const fs = require('fs')
const path = require('path')
const setting = isRenderer ? remote.require('./setting') : customReq('./setting')

const lang = setting.get('app.lang')

exports.strings = {}

try {
    exports.strings = isRenderer
        ? customReq(`./lang/${lang}.js`)
        : customReq(`../lang/${lang}.js`)
} catch (err) {}

const dolm = require('dolm').load(exports.strings)

exports.usedStrings = dolm.usedStrings
exports.t = dolm.t
exports.context = dolm.context

exports.serialize = function() {
    if (isRenderer) {
        // Merge with dolm serialization result in main process

        let mainI18n = remote.require('./i18n')
        let mainStrings = mainI18n.strings
        let mainUsedStrings = mainI18n.usedStrings

        for (context in mainStrings) {
            exports.strings[context] = mainStrings[context]
        }

        for (context in mainUsedStrings) {
            exports.usedStrings[context] = mainUsedStrings[context]
        }
    }

    let result = dolm.serialize()
    let js = `module.exports = ${result.js}`

    if (isRenderer) {
        fs.writeFileSync(path.join(__dirname, 'lang', `${lang}.js`), js)
    }

    return result
}
