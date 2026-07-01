const {expect} = require('@playwright/test')
const {test} = require('./fixtures/electron-app')

test.describe('Settings cache', () => {
  // Canary: the fixture pre-seeds settings.json at the userData root. That path
  // was wrong for months (it wrote to a <userData>/Sabaki subdir that the app
  // never reads), so pre-seeded settings silently never loaded and the whole
  // suite ran on defaults. The fixture sets sound.enable=false while the default
  // is true — so a wrong value here means the file wasn't read.
  test('the e2e fixture actually loads pre-seeded settings', async ({page}) => {
    const soundEnable = await page.evaluate(() =>
      window.sabaki.setting.get('sound.enable'),
    )

    expect(soundEnable).toBe(false)
  })

  // The renderer receives every setting at startup (setting:getAllSync returns
  // all of them, no per-key allowlist), so none can be silently absent. Each key
  // below had drifted out of the old settingsKeys allowlist and returned
  // undefined at startup until the setting was changed live.
  test('every setting reaches the renderer at startup', async ({page}) => {
    const missing = await page.evaluate(() =>
      [
        'view.move_numbers_type',
        'view.winrategraph_blunderthreshold_scorelead',
        'app.enable_hardware_acceleration',
        'app.startup_check_updates',
      ].filter((key) => window.sabaki.setting.get(key) === undefined),
    )

    expect(missing).toEqual([])
  })
})
