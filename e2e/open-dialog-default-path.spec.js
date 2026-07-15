const {expect} = require('@playwright/test')
const {test} = require('./fixtures/electron-app')
const {loadSgfAndWait} = require('./helpers')
const path = require('path')

// #1061: opening a second file should default the Open dialog to the folder of
// the file you currently have open. Neither the old nor the new dialog code
// ever set defaultPath -- the previous "remembers the last folder" behavior was
// the native dialog's own memory, which the Electron upgrade in v0.60 stopped
// providing (falling back to Downloads on Windows). loadFile now passes
// defaultPath explicitly, derived from representedFilename.
//
// These tests assert what Sabaki hands the native dialog (the defaultPath in
// the options), not OS-level folder memory, so they're deterministic across
// platforms.

const sgfPath = path.resolve(
  __dirname,
  '..',
  'test',
  'sgf',
  'beginner_game.sgf',
)

// Replace the open dialog with a capturing stub that cancels, and clear any
// previously captured options.
async function captureOpenDialog(electronApp) {
  await electronApp.evaluate(({dialog}) => {
    globalThis.__openDialogOpts = null
    dialog.showOpenDialog = async (win, opts) => {
      globalThis.__openDialogOpts = opts
      return {canceled: true, filePaths: []}
    }
  })
}

async function triggerOpenDialog(page, electronApp) {
  await page.evaluate(() =>
    window.__sabaki.loadFile(null, {suppressAskForSave: true}),
  )
  return electronApp.evaluate(() => globalThis.__openDialogOpts)
}

test.describe('Open dialog default folder (#1061)', () => {
  test('defaults to the folder of the currently open file', async ({
    page,
    electronApp,
  }) => {
    await loadSgfAndWait(page, sgfPath)
    await captureOpenDialog(electronApp)

    const opts = await triggerOpenDialog(page, electronApp)

    expect(opts).toBeTruthy()
    expect(opts.defaultPath).toBe(path.dirname(sgfPath))
  })

  test('passes no defaultPath when no file is open', async ({
    page,
    electronApp,
  }) => {
    await captureOpenDialog(electronApp)

    const opts = await triggerOpenDialog(page, electronApp)

    expect(opts).toBeTruthy()
    expect(opts.defaultPath).toBeUndefined()
  })
})
