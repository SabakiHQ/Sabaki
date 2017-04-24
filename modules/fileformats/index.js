const {extname} = require('path')

let sgf = require('./sgf')
let ngf = require('./ngf')
let gib = require('./gib')

let modules = {sgf, ngf, gib}

exports = module.exports = modules

let extensions = Object.keys(modules).map(key => modules[key].meta)
let combinedExtensions = extensions.map(x => x.extensions)
    .reduce((acc, x) => [...acc, ...x], [])

exports.meta = [
    {name: 'Game Records', extensions: combinedExtensions},
    ...extensions
]

exports.getModuleByExtension = function(extension) {
    return modules[Object.keys(modules).find(key =>
        modules[key].meta.extensions.includes(extension.toLowerCase())
    )] || sgf
}

exports.parseFile = function(filename, onProgress) {
    let extension = extname(filename).slice(1)
    let m = exports.getModuleByExtension(extension)

    return m.parseFile(filename, onProgress)
}
