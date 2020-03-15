const path = require('path')
const {spawnSync} = require('child_process')
const {readFileSync, writeFileSync} = require('fs')
const dolmTools = require('dolm/tools')
const boardmatcherLibrary = require('@sabaki/boardmatcher/library')

let codeGlobs = ['src/**/*.js']
let getKeyPath = path.resolve(__dirname, './dolmGetKey.js')
let defaultPath = path.resolve(__dirname, '../i18n/en.i18n.js')
let templatePath = path.resolve(__dirname, '../i18n/template.i18n.js')

let spawnDolmGen = args =>
  spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    [
      'dolm',
      'gen',
      '--dolm-identifier',
      'i18n',
      '--get-key',
      getKeyPath,
      ...args
    ],
    {
      stdio: 'inherit'
    }
  )

let boardmatcherStringsArr = [
  ...boardmatcherLibrary.map(pattern => pattern.name),
  'Pass',
  'Take',
  'Atari',
  'Suicide',
  'Fill',
  'Connect',
  'Tengen',
  'Hoshi'
]

let boardmatcherStrings = {
  boardmatcher: Object.assign(
    {},
    ...boardmatcherStringsArr.map(str => ({[str]: str}))
  )
}

let boardmatcherStringsTemplate = {
  boardmatcher: Object.assign(
    {},
    ...boardmatcherStringsArr.map(str => ({[str]: null}))
  )
}

// Create default i18n file

spawnDolmGen(['-o', defaultPath, ...codeGlobs])

let defaultStrings = dolmTools.mergeStrings([
  dolmTools.safeModuleEval(readFileSync(defaultPath, 'utf8')),
  boardmatcherStrings
])

writeFileSync(
  defaultPath,
  'module.exports = ' + dolmTools.serializeStrings(defaultStrings)
)

// Create template i18n file

spawnDolmGen(['-t', '-o', templatePath, ...codeGlobs])

let templateStrings = dolmTools.mergeStrings([
  dolmTools.safeModuleEval(readFileSync(templatePath, 'utf8')),
  boardmatcherStringsTemplate
])

writeFileSync(
  templatePath,
  'module.exports = ' + dolmTools.serializeStrings(templateStrings)
)
