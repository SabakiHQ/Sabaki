import * as sgf from '@sabaki/sgf'
import i18n from '../../i18n.js'
import {getId} from '../helper.js'
import * as gametree from '../gametree.js'

const t = i18n.context('fileformats')

export const meta = {
  name: t('Smart Game Format'),
  extensions: ['sgf', 'rsgf']
}

let toGameTrees = rootNodes =>
  rootNodes.map(root => gametree.new({getId, root}))

export function parse(content, onProgress = () => {}) {
  let rootNodes = sgf.parse(content, {getId, onProgress})
  return toGameTrees(rootNodes)
}

export function parseFile(filename, onProgress = () => {}) {
  let rootNodes = sgf.parseFile(filename, {getId, onProgress})
  return toGameTrees(rootNodes)
}
