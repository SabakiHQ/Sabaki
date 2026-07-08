import assert from 'assert'

import {
  cycleAreaValue,
  getOpenFileFromArgv,
  markupCleanupProperties,
} from '../src/modules/utils.js'

// cycleAreaValue backs the manual territory overrides in scoring/estimator mode.
// Area values are -1 (white) / 0 (neutral) / 1 (black), and `steps` advances a
// point that many positions through neutral -> black -> white, relative to
// whatever the estimate currently shows there.
describe('cycleAreaValue', () => {
  it('cycles a neutral point through black, white, back to neutral', () => {
    assert.strictEqual(cycleAreaValue(0, 1), 1)
    assert.strictEqual(cycleAreaValue(0, 2), -1)
    assert.strictEqual(cycleAreaValue(0, 3), 0)
  })

  it('advances relative to the current estimate, not from neutral', () => {
    assert.strictEqual(cycleAreaValue(1, 1), -1) // black estimate -> white
    assert.strictEqual(cycleAreaValue(-1, 1), 0) // white estimate -> neutral
  })

  it('wraps every three steps back to the estimate', () => {
    for (let base of [-1, 0, 1]) {
      assert.strictEqual(cycleAreaValue(base, 3), base)
      assert.strictEqual(cycleAreaValue(base, 6), base)
    }
  })
})

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

// Backs Tools -> Clean markup. The label category must strip old-style L[]
// labels (FF[3]) as well as modern LB[], since Sabaki reads and renders both;
// see #881.
describe('markupCleanupProperties', () => {
  it('cleans both old-style L[] and modern LB[] labels', () => {
    assert.deepStrictEqual(markupCleanupProperties.label, ['LB', 'L'])
  })

  it('maps every category to a non-empty list of property idents', () => {
    for (let [category, props] of Object.entries(markupCleanupProperties)) {
      assert.ok(
        Array.isArray(props) && props.length > 0,
        `${category} should map to a non-empty array`,
      )
      assert.ok(
        props.every((p) => typeof p === 'string' && /^[A-Z]+$/.test(p)),
        `${category} props should be SGF idents`,
      )
    }
  })
})
