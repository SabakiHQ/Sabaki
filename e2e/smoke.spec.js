const {expect} = require('@playwright/test')
const path = require('path')
const {test} = require('./fixtures/electron-app')
const {waitForGameLoad, loadSgfAndWait} = require('./helpers')

test.describe('Smoke Tests', () => {
  test('app launches and creates a window', async ({electronApp}) => {
    const windows = electronApp.windows()
    expect(windows.length).toBeGreaterThanOrEqual(1)
  })

  test('window title contains "Sabaki"', async ({page}) => {
    const title = await page.title()
    expect(title).toContain('Sabaki')
  })

  test('no black screen — goban renders', async ({page}) => {
    const goban = page.locator('#goban')
    await expect(goban).toBeVisible()

    // Verify board intersections render (19x19 = 361 vertices minimum for default board)
    const vertices = page.locator('.shudan-vertex')
    const count = await vertices.count()
    expect(count).toBeGreaterThanOrEqual(81) // At least 9x9
  })

  test('main layout elements present', async ({page}) => {
    await expect(page.locator('#main')).toBeVisible()
    await expect(page.locator('#bar')).toBeVisible()
    await expect(page.locator('#mainlayout')).toBeVisible()
  })

  test('load SGF via IPC from main process', async ({electronApp, page}) => {
    const sgfPath = path.resolve(__dirname, '..', 'test', 'sgf', 'pro_game.sgf')

    // Load file through the main→renderer IPC channel (webContents.send),
    // which mirrors how Electron sends load-file events (e.g. open-file, CLI arg).
    await electronApp.evaluate(({BrowserWindow}, filePath) => {
      const win = BrowserWindow.getAllWindows()[0]
      win.webContents.send('load-file', filePath)
    }, sgfPath)

    await waitForGameLoad(page)

    // Navigate to end so stones are visible
    await page.evaluate(() => {
      window.__sabaki.goToEnd()
    })

    // Verify some stones appeared on the board
    const stones = page.locator('.shudan-sign_1, .shudan-sign_-1')
    const stoneCount = await stones.count()
    expect(stoneCount).toBeGreaterThan(0)
  })

  test('load SGF via sabaki singleton', async ({page}) => {
    const sgfPath = path.resolve(
      __dirname,
      '..',
      'test',
      'sgf',
      'beginner_game.sgf',
    )

    await loadSgfAndWait(page, sgfPath)

    const hasChildren = await page.evaluate(() => {
      const tree =
        window.__sabaki.state.gameTrees[window.__sabaki.state.gameIndex]
      return tree.root.children.length > 0
    })
    expect(hasChildren).toBe(true)
  })

  test('window resize', async ({electronApp, page}) => {
    const browserWindow = await electronApp.browserWindow(page)
    await browserWindow.evaluate((win) => win.setContentSize(800, 600))

    // Poll until the resize takes effect rather than using a fixed timeout.
    await expect(async () => {
      const size = await browserWindow.evaluate((win) => win.getContentSize())
      expect(size).toEqual([800, 600])
    }).toPass({timeout: 5000})
  })
})
