const {expect} = require('@playwright/test')
const {test} = require('./fixtures/electron-app')
const {loadSgfStringAndWait, waitForRender} = require('./helpers')

// Coverage for sabaki.toggleMoveAnnotation — the helper behind the
// "Toggle Good Move" / "Toggle Bad Move" menu items (menu.js). Move annotations
// (TE/IT/DO/BM) are mutually exclusive, so toggling one on must clear any other,
// and toggling the same one again clears it entirely. The exclusivity itself
// lives in setComment; this exercises the toggle-on/off + replace behavior end
// to end.

// Root plus a single Black move, so the current position is a real move node.
const SGF = '(;GM[1]FF[4]SZ[19];B[pd])'

function moveProp(page, prop) {
  return page.evaluate((p) => {
    const s = window.__sabaki
    const tree = s.state.gameTrees[s.state.gameIndex]
    const data = tree.get(s.state.treePosition).data
    return data[p] != null ? data[p] : null
  }, prop)
}

async function toggle(page, annotation) {
  await page.evaluate((a) => {
    const s = window.__sabaki
    s.toggleMoveAnnotation(s.state.treePosition, a)
  }, annotation)
  await waitForRender(page)
}

test.describe('toggleMoveAnnotation', () => {
  test.beforeEach(async ({page}) => {
    await loadSgfStringAndWait(page, SGF)
    await page.evaluate(() => window.__sabaki.goToEnd())
    await waitForRender(page)
  })

  test('toggles a move annotation on, then off', async ({page}) => {
    expect(await moveProp(page, 'TE')).toBeNull()

    await toggle(page, 'TE')
    expect(await moveProp(page, 'TE')).not.toBeNull()

    await toggle(page, 'TE')
    expect(await moveProp(page, 'TE')).toBeNull()
  })

  test('replaces an existing annotation instead of stacking them', async ({
    page,
  }) => {
    await toggle(page, 'TE')
    expect(await moveProp(page, 'TE')).not.toBeNull()
    expect(await moveProp(page, 'BM')).toBeNull()

    // Toggling Bad Move while Good Move is set must clear TE, not coexist —
    // a node can never be annotated as both good and bad.
    await toggle(page, 'BM')
    expect(await moveProp(page, 'BM')).not.toBeNull()
    expect(await moveProp(page, 'TE')).toBeNull()
  })
})
