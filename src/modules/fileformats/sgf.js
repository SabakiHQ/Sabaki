const sgf = require('@sabaki/sgf')
const {getId} = require('../helper')

exports.meta = {
    name: 'Smart Game Format',
    extensions: ['sgf']
}

exports.parse = function(content, onProgress = () => {}) {
    return sgf.parse(content, {getId, onProgress})
}

exports.parseFile = function(filename, onProgress = () => {}) {
    return sgf.parseFile(filename, {getId, onProgress})
}
