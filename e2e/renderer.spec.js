const {expect} = require('@playwright/test')
const path = require('path')
const {test} = require('./fixtures/electron-app')
const {loadSgfAndWait, getTreeDepth, waitForGameLoad} = require('./helpers')

test.describe('Renderer Integration Tests', () => {
  test.describe('Navigation', () => {
    test.beforeEach(async ({page}) => {
      const sgfPath = path.resolve(
        __dirname,
        '..',
        'test',
        'sgf',
        'pro_game.sgf',
      )

      await loadSgfAndWait(page, sgfPath)
    })

    test('goStep navigates forward and backward', async ({page}) => {
      await page.evaluate(() => {
        for (let i = 0; i < 5; i++) {
          window.__sabaki.goStep(1)
        }
      })

      expect(await getTreeDepth(page)).toBe(5)

      await page.evaluate(() => {
        for (let i = 0; i < 3; i++) {
          window.__sabaki.goStep(-1)
        }
      })

      expect(await getTreeDepth(page)).toBe(2)
    })

    test('goToEnd and goToBeginning jump correctly', async ({page}) => {
      await page.evaluate(() => {
        window.__sabaki.goToEnd()
      })

      const stonesAtEnd = await page.evaluate(() => {
        return document.querySelectorAll('.shudan-sign_1, .shudan-sign_-1')
          .length
      })
      expect(stonesAtEnd).toBeGreaterThan(0)

      await page.evaluate(() => {
        window.__sabaki.goToBeginning()
      })

      const isAtRoot = await page.evaluate(() => {
        const tree =
          window.__sabaki.state.gameTrees[window.__sabaki.state.gameIndex]
        return window.__sabaki.state.treePosition === tree.root.id
      })
      expect(isAtRoot).toBe(true)
    })

    test('arrow key navigation moves through game tree', async ({page}) => {
      await page.evaluate(() => {
        window.__sabaki.goToBeginning()
      })

      expect(await getTreeDepth(page)).toBe(0)

      // ArrowDown triggers startAutoscrolling, which calls goStep(1)
      // synchronously on the first tick. Poll for the state change
      // rather than using a fixed timeout.
      await page.keyboard.down('ArrowDown')

      await page.waitForFunction(
        () => {
          const tree =
            window.__sabaki.state.gameTrees[window.__sabaki.state.gameIndex]
          return window.__sabaki.state.treePosition !== tree.root.id
        },
        {timeout: 5000},
      )

      await page.keyboard.up('ArrowDown')

      expect(await getTreeDepth(page)).toBeGreaterThan(0)
    })
  })

  test.describe('Dialog Stubbing', () => {
    test('file open dialog can be stubbed', async ({electronApp, page}) => {
      const sgfPath = path.resolve(
        __dirname,
        '..',
        'test',
        'sgf',
        'beginner_game.sgf',
      )

      // Stub the open dialog in the main process so showOpenDialog returns
      // a specific file path instead of showing a native dialog.
      await electronApp.evaluate(({dialog}, filePath) => {
        dialog.showOpenDialog = async () => ({
          canceled: false,
          filePaths: [filePath],
        })
      }, sgfPath)

      // loadFile() without args triggers the showOpenDialog stub
      await page.evaluate(() => {
        window.__sabaki.loadFile()
      })

      await waitForGameLoad(page)

      const hasChildren = await page.evaluate(() => {
        const tree =
          window.__sabaki.state.gameTrees[window.__sabaki.state.gameIndex]
        return tree.root.children.length > 0
      })
      expect(hasChildren).toBe(true)
    })
  })

  test.describe('Board Interaction', () => {
    test('clicking vertex in edit mode places a stone', async ({page}) => {
      await page.evaluate(() => {
        window.__sabaki.setMode('edit')
      })

      await page.waitForFunction(
        () => window.__sabaki && window.__sabaki.state.mode === 'edit',
      )

      const stonesBefore = await page.evaluate(() => {
        return document.querySelectorAll('.shudan-sign_1, .shudan-sign_-1')
          .length
      })

      const vertex = page.locator('.shudan-vertex').nth(50)
      await vertex.click()

      await page.waitForFunction(
        (before) => {
          const current = document.querySelectorAll(
            '.shudan-sign_1, .shudan-sign_-1',
          ).length
          return current > before
        },
        stonesBefore,
        {timeout: 5000},
      )

      const stonesAfter = await page.evaluate(() => {
        return document.querySelectorAll('.shudan-sign_1, .shudan-sign_-1')
          .length
      })
      expect(stonesAfter).toBeGreaterThan(stonesBefore)
    })

    test('new file creates empty board', async ({page}) => {
      await page.evaluate(() => {
        window.__sabaki.newFile()
      })

      await page.waitForFunction(
        () => {
          if (!window.__sabaki) return false
          const tree =
            window.__sabaki.state.gameTrees[window.__sabaki.state.gameIndex]
          return tree && tree.root.children.length === 0
        },
        {timeout: 5000},
      )

      const stonesOnBoard = await page.evaluate(() => {
        return document.querySelectorAll('.shudan-sign_1, .shudan-sign_-1')
          .length
      })
      expect(stonesOnBoard).toBe(0)
    })
  })
})
