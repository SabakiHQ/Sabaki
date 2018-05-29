const sgf = require('@sabaki/sgf')
const {getId} = require('../helper')

exports.meta = {
    name: 'Smart Game Format',
    extensions: ['sgf']
}

exports.parse = function(content, onProgress = () => {}, ignoreEncoding = false) {
    let encoding = ignoreEncoding ? null : 'ISO-8859-1'
    return sgf.parse(content, {getId, onProgress, encoding})
}

exports.parseFile = function(filename, onProgress = () => {}) {
    return sgf.parseFile(filename, {getId, onProgress})
}
