const nativeRequire = eval('require')

const {remote} = require('electron')
const isElectron = process.versions.electron != null
const isRenderer = isElectron && remote != null
const fs = require('fs')
const dolm = require('dolm').load({})

const mainI18n = isRenderer ? remote.require('./i18n') : exports
const setting = isRenderer ? remote.require('./setting')
    : isElectron ? nativeRequire('./setting')
    : null

exports.t = dolm.t
exports.context = dolm.context

exports.loadStrings = function(strings) {
    if (isRenderer && window.sabaki != null) {
        mainI18n.loadStrings(strings)
        sabaki.buildMenu()
        sabaki.waitForRender()
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

exports.serialize = function(filename) {
    if (isRenderer) {
        // Merge with dolm serialization result in main process

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

    fs.writeFileSync(filename, js)

    return result
}

try {
    exports.loadLang(setting.get('app.lang'))
} catch (err) {
    exports.loadStrings({})
}

if (isRenderer) {
    setting.events.on('change', ({key, value}) => {
        if (key !== 'app.lang') return

        exports.loadLang(value)
    })
}
