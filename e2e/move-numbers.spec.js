const {expect} = require('@playwright/test')
const {test} = require('./fixtures/electron-app')
const {
  loadSgfStringAndWait,
  gotoChildPath,
  waitForRender,
} = require('./helpers')

// Tests for the move-numbering view options (number from game start, from the
// current variation, or from the most recent hotspot).
//
// These drive the real Goban rendering and read the move-number labels that
// @sabaki/shudan paints onto each vertex. Shudan sets the vertex element's
// `title` attribute to the marker label, so a vertex numbered "3" produces a
// `.shudan-vertex` with title="3". When move numbers are enabled the Goban
// resets all other markers to null, so the only labelled vertices are the
// numbered moves.

// --- move-number helpers ---------------------------------------------------

async function setMoveNumbers(page, type) {
  await page.evaluate(async (t) => {
    await window.sabaki.setting.set('view.show_move_numbers', true)
    await window.sabaki.setting.set('view.move_numbers_type', t)
  }, type)

  await page.waitForFunction(
    (t) =>
      window.__sabaki.state.showMoveNumbers === true &&
      window.__sabaki.state.moveNumbersType === t,
    type,
  )
  await waitForRender(page)
}

// The sorted set of numeric move-number labels currently shown on the board.
async function moveNumberLabels(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('.shudan-vertex')]
      .map((v) => v.getAttribute('title'))
      .filter((t) => t != null && /^\d+$/.test(t))
      .map(Number)
      .sort((a, b) => a - b),
  )
}

// --- SGF fixtures ----------------------------------------------------------

// Linear game, four moves.
const LINEAR = '(;GM[1]FF[4]CA[UTF-8]SZ[19];B[dd];W[pp];B[dp];W[pd])'

// Branch at the second move (W[pp] has two children).
//   main:      root → dd → pp → dp → pd
//   variation: root → dd → pp → pd → dp
const MIDTREE_BRANCH =
  '(;GM[1]FF[4]CA[UTF-8]SZ[19];B[dd];W[pp]' +
  '(;B[dp];W[pd])' +
  '(;B[pd];W[dp]))'

// Hotspot (HO) on the second move (W[pp]).
const HOTSPOT = '(;GM[1]FF[4]CA[UTF-8]SZ[19];B[dd];W[pp]HO[1];B[dp];W[pd])'

// Two variations branching directly at the ROOT node.
//   main:      root → dd → pp
//   variation: root → pd → dp   (second child of root)
const ROOT_BRANCH =
  '(;GM[1]FF[4]CA[UTF-8]SZ[19]' + '(;B[dd];W[pp])' + '(;B[pd];W[dp]))'

// --- tests -----------------------------------------------------------------

test.describe('Move Numbering', () => {
  test.describe('working behavior', () => {
    test('"from game start" numbers every move starting at 1', async ({
      page,
    }) => {
      await loadSgfStringAndWait(page, LINEAR)
      await page.evaluate(() => window.__sabaki.goToEnd())
      await setMoveNumbers(page, 'start')

      // Four moves → labels 1,2,3,4. (The first move is "1", not "0".)
      expect(await moveNumberLabels(page)).toEqual([1, 2, 3, 4])
    })

    test('"from variation start" numbers from the first move after the branch', async ({
      page,
    }) => {
      await loadSgfStringAndWait(page, MIDTREE_BRANCH)
      // Into the variation: root → dd → pp → pd(child1) → dp.
      await gotoChildPath(page, [0, 0, 1, 0])
      await setMoveNumbers(page, 'variation')

      // The variation's two moves are numbered 1,2; the shared prefix
      // (dd, pp) is not numbered.
      expect(await moveNumberLabels(page)).toEqual([1, 2])
    })

    test('"from variation start" shows nothing while on the main line', async ({
      page,
    }) => {
      await loadSgfStringAndWait(page, MIDTREE_BRANCH)
      // Main line end: root → dd → pp → dp → pd.
      await gotoChildPath(page, [0, 0, 0, 0])
      await setMoveNumbers(page, 'variation')

      expect(await moveNumberLabels(page)).toEqual([])
    })

    test('"from hotspot" numbers from the move after the most recent hotspot', async ({
      page,
    }) => {
      await loadSgfStringAndWait(page, HOTSPOT)
      await page.evaluate(() => window.__sabaki.goToEnd())
      await setMoveNumbers(page, 'hotspot')

      // Hotspot is on move 2 (W[pp]); moves 3 and 4 are numbered 1,2.
      expect(await moveNumberLabels(page)).toEqual([1, 2])
    })

    test('"from variation start" numbers a variation that branches at the root', async ({
      page,
    }) => {
      await loadSgfStringAndWait(page, ROOT_BRANCH)
      // Second first-move variation: root → pd(child1) → dp. The root itself is
      // the branch point, and this line is off the main line, so its two moves
      // are numbered 1,2.
      await gotoChildPath(page, [1, 0])
      await setMoveNumbers(page, 'variation')

      expect(await moveNumberLabels(page)).toEqual([1, 2])
    })
  })
})
