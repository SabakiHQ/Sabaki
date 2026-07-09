import assert from 'assert'

import {getOpenFileFromArgv} from '../src/argv.js'

// Backs the launch-time "open this file" handling in main.js. argv[0] is always
// the binary; the file to open (if any) is somewhere in the rest, mixed with
// flags and the app entry point. See issue #954.
describe('getOpenFileFromArgv', () => {
  const dev = '/opt/electron' // dev: `electron . [flags] [file]`
  const devRenamed = '/usr/bin/electron42' // some Linux distros rename it
  const macApp = '/Applications/Sabaki.app/Contents/MacOS/Sabaki'
  const winExe = 'C:\\Program Files\\Sabaki\\Sabaki.exe'
  const linuxBin = '/opt/Sabaki/sabaki'
  const file = '/home/u/game.sgf'

  it('returns null when only the binary is present', () => {
    assert.strictEqual(getOpenFileFromArgv([macApp]), null)
    assert.strictEqual(getOpenFileFromArgv([]), null)
  })

  it('reads a file passed to a packaged app', () => {
    assert.strictEqual(getOpenFileFromArgv([winExe, file]), file)
    assert.strictEqual(getOpenFileFromArgv([macApp, file]), file)
    assert.strictEqual(getOpenFileFromArgv([linuxBin, file]), file)
  })

  it('skips the dev-mode "." entry', () => {
    assert.strictEqual(getOpenFileFromArgv([dev, '.']), null)
    assert.strictEqual(getOpenFileFromArgv([dev, '.', file]), file)
  })

  it('works regardless of the binary name (renamed Linux electron)', () => {
    assert.strictEqual(getOpenFileFromArgv([devRenamed, '.', file]), file)
    assert.strictEqual(getOpenFileFromArgv([devRenamed, '.']), null)
  })

  it('ignores injected flags (snap/AppImage --no-sandbox, #954)', () => {
    assert.strictEqual(getOpenFileFromArgv([linuxBin, '--no-sandbox']), null)
    assert.strictEqual(
      getOpenFileFromArgv([linuxBin, '--no-sandbox', file]),
      file,
    )
    assert.strictEqual(getOpenFileFromArgv([dev, '.', '--inspect', file]), file)
    assert.strictEqual(
      getOpenFileFromArgv([winExe, '--disable-gpu', file]),
      file,
    )
  })

  it('ignores single-dash args (e.g. macOS -psn_)', () => {
    assert.strictEqual(getOpenFileFromArgv([macApp, '-psn_0_12345']), null)
    assert.strictEqual(
      getOpenFileFromArgv([macApp, '-psn_0_12345', file]),
      file,
    )
  })

  it('skips the packaged .asar entry', () => {
    assert.strictEqual(getOpenFileFromArgv([dev, '/app/app.asar', file]), file)
    assert.strictEqual(getOpenFileFromArgv([dev, '/app/app.asar/']), null)
  })
})
