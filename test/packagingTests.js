import assert from 'assert'
import {readFileSync} from 'fs'
import {fileURLToPath} from 'url'
import {dirname, join} from 'path'

// main.js runs unbundled from the packaged asar, so any src/modules file it
// requires must be included by build.files -- which otherwise excludes
// src/modules entirely because the renderer is webpack-bundled. #1044 added a
// `require('./modules/utils')` without re-including the file, so the packaged
// v0.60.1 crashed on launch with "Cannot find module './modules/utils'"
// (#1058). This guards against that recurring; it's exactly the kind of bug the
// source-based e2e can't see.

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const mainSource = readFileSync(join(root, 'src', 'main.js'), 'utf8')

describe('main-process packaging', () => {
  it('build.files packages every src/modules file main.js requires', () => {
    const files = pkg.build.files
    const required = [
      ...mainSource.matchAll(/require\(\s*['"]\.\/modules\/([\w-]+)['"]\s*\)/g),
    ].map((m) => m[1])

    for (const mod of required) {
      const packagedPath = `src/modules/${mod}.js`
      assert.ok(
        files.includes(packagedPath),
        `main.js requires ./modules/${mod}, so build.files must list "${packagedPath}" to re-include it past the src/modules exclusion; otherwise the packaged app crashes with "Cannot find module".`,
      )
    }
  })
})
