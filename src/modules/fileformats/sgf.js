const sgf = require('@sabaki/sgf')

const i18n = require('../../i18n')
const {getId} = require('../helper')
const gametree = require('../gametree')

const t = i18n.context('fileformats')

exports.meta = {
  name: t('Smart Game Format'),
  extensions: ['sgf', 'rsgf']
}

let toGameTrees = rootNodes =>
  rootNodes.map(root => gametree.new({getId, root}))

exports.parse = function(content, onProgress = () => {}) {
  let rootNodes = sgf.parse(content, {getId, onProgress})
  return toGameTrees(rootNodes)
}

exports.parseFile = function(filename, onProgress = () => {}) {
  let rootNodes = sgf.parseFile(filename, {getId, onProgress})
  return toGameTrees(rootNodes)
}
