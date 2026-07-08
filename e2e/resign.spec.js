const {expect} = require('@playwright/test')
const {test} = require('./fixtures/electron-app')
const {loadSgfStringAndWait, waitForRender} = require('./helpers')

// #915: Play -> Resign recorded a pass but never set the game result, because
// makeResign built the RE update on a stale tree and never committed it. After
// a black move (white to play), resigning should record RE = "B+Resign".
const SGF = '(;GM[1]FF[4]SZ[19];B[pd])'

test.describe('resign (#915)', () => {
  test('records the game result on the root', async ({page}) => {
    await loadSgfStringAndWait(page, SGF)
    await page.evaluate(() => window.__sabaki.goToEnd())
    await page.evaluate(() => window.__sabaki.makeResign())
    await waitForRender(page)

    const re = await page.evaluate(() => {
      const s = window.__sabaki
      const tree = s.state.gameTrees[s.state.gameIndex]
      return tree.root.data.RE ? tree.root.data.RE[0] : null
    })

    expect(re).toBe('B+Resign')
  })
})
