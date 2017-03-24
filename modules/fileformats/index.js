let sgf = require('./sgf')
let ngf = require('./ngf')
let gib = require('./gib')

exports = module.exports = {sgf, ngf, gib}

let extensions = [sgf, gib, ngf].map(x => x.meta)
let combinedExtensions = extensions.map(x => x.extensions)
    .reduce((acc, x) => [...acc, ...x], [])

exports.meta = [
    {name: 'Game Records', extensions: combinedExtensions},
    ...extensions
]
