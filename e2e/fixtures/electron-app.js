const {test: base, _electron: electron} = require('@playwright/test')
const path = require('path')
const fs = require('fs')
const os = require('os')

const test = base.extend({
  electronApp: async ({}, use) => {
    // Create isolated temp directory for settings
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sabaki-e2e-'))

    // Pre-seed settings to disable animations, sounds, update checks, etc.
    const settings = {
      'app.startup_check_updates': false,
      'app.startup_check_updates_delay': 100000,
      'app.loadgame_delay': 0,
      'app.hide_busy_delay': 0,
      'sound.enable': false,
      'view.animated_stone_placement': false,
      'view.fuzzy_stone_placement': false,
      'gtp.move_delay': 0,
      'game.goto_end_after_loading': false,
      'file.show_reload_warning': false,
      'infooverlay.duration': 0,
    }

    // app.getPath('userData') returns <userDataDir>/Sabaki when
    // --user-data-dir is set, so write settings into that subdirectory.
    const appDataDir = path.join(tmpDir, 'Sabaki')
    fs.mkdirSync(appDataDir, {recursive: true})
    fs.mkdirSync(path.join(appDataDir, 'themes'), {recursive: true})

    fs.writeFileSync(
      path.join(appDataDir, 'settings.json'),
      JSON.stringify(settings, null, 2),
    )

    const electronPath = require('electron')
    const appPath = path.resolve(__dirname, '..', '..')

    // On Linux CI, the chrome-sandbox binary requires setuid root permissions
    // which aren't available. Disable the sandbox in CI environments.
    const args = [appPath, `--user-data-dir=${tmpDir}`]
    if (process.env.CI) {
      args.push('--no-sandbox')
    }

    const app = await electron.launch({
      executablePath: electronPath,
      args,
      env: {
        ...process.env,
        SABAKI_E2E: '1',
      },
    })

    // Stub all dialog functions in the main process to prevent native OS
    // dialogs from blocking tests. Without these stubs, any dialog call
    // (save prompt, error box, file picker) would block the process until
    // manually dismissed.
    await app.evaluate(({dialog}) => {
      dialog.showMessageBox = async () => ({response: 1})
      dialog.showOpenDialog = async () => ({canceled: true, filePaths: []})
      dialog.showSaveDialog = async () => ({canceled: true})
      dialog.showErrorBox = (title, content) => {
        console.error(`[showErrorBox] ${title}\n${content}`)
      }
    })

    await use(app)

    // Teardown: use app.exit() to force-quit immediately.
    // app.quit() triggers beforeunload handlers which set evt.returnValue,
    // causing CDP "handleJavaScriptDialog" errors in Playwright.
    // app.exit() skips all lifecycle events and exits the process cleanly.
    try {
      await app.evaluate(({app}) => {
        app.exit(0)
      })
    } catch (e) {
      // App may already be closed
    }

    try {
      await app.close()
    } catch (e) {
      // App may already be closed
    }

    // Clean up temp directory
    try {
      fs.rmSync(tmpDir, {recursive: true, force: true})
    } catch (e) {
      // Best effort cleanup
    }
  },

  page: async ({electronApp}, use) => {
    // Wait for the first window
    const page =
      electronApp.windows().length > 0
        ? electronApp.windows()[0]
        : await electronApp.firstWindow()

    // Auto-dismiss any JavaScript dialogs (e.g. beforeunload prompts).
    // Sabaki's beforeunload handler sets returnValue which can trigger
    // dialog events that block Playwright operations.
    page.on('dialog', async (dialog) => {
      await dialog.accept()
    })

    // Wait for the app to fully render
    await page.waitForSelector('#goban', {timeout: 30000})

    await use(page)
  },
})

module.exports = {test}
