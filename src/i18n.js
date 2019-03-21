// Prevent webpack from bundling modules required using customReq
const customReq = p => require(p)

const {remote} = require('electron')
const fs = require('fs')
const path = require('path')
const setting = remote != null ? remote.require('./setting') : customReq('./setting')

const lang = setting.get('app.lang')

exports.strings = {}

try {
    exports.strings = remote != null
        ? customReq(`./lang/${lang}.js`)
        : customReq(`../lang/${lang}.js`)
} catch (err) {}

const dolm = require('dolm').load(exports.strings)

exports.usedStrings = dolm.usedStrings
exports.t = dolm.t
exports.context = dolm.context

exports.serialize = function() {
    if (remote != null) {
        // Merge with dolm serialization result in main process

        let mainResult = remote.require('./i18n').serialize()
        let mainStrings = eval('(' + mainResult.js + ')')
        let mainUsedStrings = remote.require('./i18n').usedStrings

        for (context in mainStrings) {
            if (!(context in exports.strings)) {
                exports.strings[context] = mainStrings[context]
                exports.usedStrings[context] = mainUsedStrings[context]
            }
        }
    }

    let result = dolm.serialize()
    let js = `module.exports = ${result.js}`

    if (remote != null) {
        fs.writeFileSync(path.join(__dirname, 'lang', `${lang}.js`), js)
    }

    return result
}
