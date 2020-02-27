import {extname} from 'path'
import i18n from '../../i18n.js'
import * as sgf from './sgf.js'
import * as ngf from './ngf.js'
import * as gib from './gib.js'

const t = i18n.context('fileformats')

let modules = {sgf, ngf, gib}
let extensions = Object.keys(modules).map(key => modules[key].meta)
let combinedExtensions = [].concat(...extensions.map(x => x.extensions))

export {sgf, ngf, gib}

export const meta = [
  {name: t('Game Records'), extensions: combinedExtensions},
  ...extensions
]

export function getModuleByExtension(extension) {
  return (
    modules[
      Object.keys(modules).find(key =>
        modules[key].meta.extensions.includes(extension.toLowerCase())
      )
    ] || sgf
  )
}

export function parseFile(filename, onProgress) {
  let extension = extname(filename).slice(1)
  let m = getModuleByExtension(extension)

  return m.parseFile(filename, onProgress)
}
