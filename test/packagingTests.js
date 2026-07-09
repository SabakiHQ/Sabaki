import assert from 'assert'
import {readFileSync} from 'fs'
import {fileURLToPath} from 'url'
import {dirname, join} from 'path'

// main.js runs unbundled from the packaged asar, so it must not require from
// src/modules or src/components -- those are renderer code, compiled into
// bundle.js and dropped from the package by the build.files filter. #1044 broke
// this by requiring src/modules/utils from main.js, so the packaged v0.60.1
// crashed on launch with "Cannot find module './modules/utils'" (#1058). The
// source-based e2e can't catch it (it runs from source, not the asar). Pure
// main-process logic belongs at the src root (e.g. src/argv.js) instead. See the
// "Process boundaries" note in CLAUDE.md.

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const mainSource = readFileSync(join(root, 'src', 'main.js'), 'utf8')

describe('main-process module boundary', () => {
  it('main.js does not require renderer modules (src/modules, src/components)', () => {
    const crossings = [
      ...mainSource.matchAll(
        /require\(\s*['"]\.\/(modules|components)\/([\w-]+)['"]\s*\)/g,
      ),
    ].map((m) => `./${m[1]}/${m[2]}`)

    assert.deepStrictEqual(
      crossings,
      [],
      `main.js runs unbundled from the asar but requires renderer module(s): ${crossings.join(
        ', ',
      )}. build.files excludes src/modules and src/components, so the packaged app would crash with "Cannot find module". Move that logic to a src-root main-process module (see src/argv.js).`,
    )
  })
})
