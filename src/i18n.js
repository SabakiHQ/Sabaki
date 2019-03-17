// Prevent webpack from bundling modules required using customReq
const customReq = p => require(p)

const {remote} = require('electron')
const fs = require('fs')
const path = require('path')
const setting = remote != null ? remote.require('./setting') : customReq('./setting')

const lang = setting.get('app.lang')
const strings = {}

try {
    strings = remote != null
        ? customReq(`./lang/${lang}.js`)
        : customReq(`../lang/${lang}.js`)
} catch (err) {}

const dolm = require('dolm').load(strings)

exports.context = function(...args) {
    return dolm.context(...args)
}

exports.serialize = function() {
    let result = dolm.serialize()
    let js = `module.exports = ${result.js}`

    fs.writeFileSync(path.join(__dirname, remote != null ? '.' : '..', 'lang', `${lang}.js`), js)

    return result
}
