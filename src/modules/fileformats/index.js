const fs = require('fs')
const {extname} = require('path')
const t = require('../../i18n').context('fileformats')

let sgf = require('./sgf')
let ngf = require('./ngf')
let gib = require('./gib')

let modules = {sgf, ngf, gib}

exports = module.exports = Object.assign({}, modules)

let extensions = Object.keys(modules).map(key => modules[key].meta)
let combinedExtensions = [].concat(...extensions.map(x => x.extensions))

exports.meta = [
    {name: t('Game Records'), extensions: combinedExtensions},
    ...extensions
]

exports.getModuleByExtension = function(extension) {
    return modules[Object.keys(modules).find(key =>
        modules[key].meta.extensions.includes(extension.toLowerCase())
    )] || sgf
}

exports.parseFile = function(file, onProgress, callback) {
    let extension = extname(file.name).slice(1)
    let m = exports.getModuleByExtension(extension)

    fs.readFile(file, (err, content) => {
        callback({trees: m.parse(content, onProgress)})
    })
}
