const {expect} = require('@playwright/test')
const {test} = require('./fixtures/electron-app')
const {loadSgfStringAndWait, waitForRender} = require('./helpers')

// Tests for the game-tree node right-click menu (openNodeMenu).
//
// That menu is a *native* Electron menu, so it can't be opened or clicked
// through the DOM. Instead these tests drive the template that openNodeMenu
// builds (exposed as getNodeMenuTemplate) and the action it wires up
// (openCommentEditor) via the window.__sabaki singleton.
//
// Covers the #940 rework: the old global "Show Comments" toggle was removed
// from this node-specific menu and replaced by a node-specific "Add/View
// Comment" item inside the Annotate submenu.

const LINEAR = '(;GM[1]FF[4]CA[UTF-8]SZ[19];B[dd];W[pp];B[dp])'

// The last (deepest) move node of a linear game.
async function lastMoveId(page) {
  return page.evaluate(() => {
    const tree =
      window.__sabaki.state.gameTrees[window.__sabaki.state.gameIndex]
    let node = tree.root
    while (node.children.length > 0) node = node.children[0]
    return node.id
  })
}

// Every label in the node menu template, with '&' mnemonic markers stripped.
async function nodeMenuLabels(page, treePosition) {
  return page.evaluate((id) => {
    const strip = (s) => (typeof s === 'string' ? s.replace(/&/g, '') : s)
    const walk = (items) =>
      items.flatMap((item) =>
        item && item.label
          ? [strip(item.label), ...(item.submenu ? walk(item.submenu) : [])]
          : [],
      )
    return walk(window.__sabaki.getNodeMenuTemplate(id))
  }, treePosition)
}

test.describe('Game tree node menu', () => {
  test('Annotate submenu offers "Add/View Comment" and the global show-comments toggle is gone', async ({
    page,
  }) => {
    await loadSgfStringAndWait(page, LINEAR)
    const id = await lastMoveId(page)

    const labels = await nodeMenuLabels(page, id)

    expect(labels).toContain('Annotate')
    expect(labels).toContain('Add/View Comment')

    // The old node-menu global toggle must not be present anymore. (It still
    // lives in the View menu; it just shouldn't be in this node-specific menu.)
    expect(labels.some((label) => /show comments/i.test(label))).toBe(false)
  })

  test('"Add/View Comment" navigates to the node, reveals the comment box, and enters edit mode', async ({
    page,
  }) => {
    await loadSgfStringAndWait(page, LINEAR)

    // Clean slate: comments hidden, parked on the root. The app launches in
    // play mode, and view.show_comments defaults to false.
    await page.evaluate(async () => {
      await window.sabaki.setting.set('view.show_comments', false)
      window.__sabaki.setState({showCommentBox: false})
      window.__sabaki.goToBeginning()
    })
    await waitForRender(page)

    const id = await lastMoveId(page)

    // Invoke the actual menu item's click handler from the built template, so
    // the test exercises the menu wiring (not just openCommentEditor directly).
    await page.evaluate((targetId) => {
      const strip = (s) => (typeof s === 'string' ? s.replace(/&/g, '') : s)
      const find = (items) => {
        for (const item of items) {
          if (item && strip(item.label) === 'Add/View Comment') return item
          if (item && item.submenu) {
            const found = find(item.submenu)
            if (found) return found
          }
        }
        return null
      }

      const item = find(window.__sabaki.getNodeMenuTemplate(targetId))
      item.click()
    }, id)

    await page.waitForFunction(
      (targetId) =>
        window.__sabaki.state.showCommentBox === true &&
        window.__sabaki.state.mode === 'edit' &&
        window.__sabaki.state.treePosition === targetId,
      id,
    )

    // The preference is persisted, so the comment box stays open afterwards.
    const persisted = await page.evaluate(() =>
      window.sabaki.setting.get('view.show_comments'),
    )
    expect(persisted).toBe(true)
  })
})
