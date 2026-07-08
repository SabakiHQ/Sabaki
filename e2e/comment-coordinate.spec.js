const {expect} = require('@playwright/test')
const {test} = require('./fixtures/electron-app')
const {loadSgfStringAndWait, waitForRender} = require('./helpers')

// #844: ctrl+click on an intersection in edit mode appends the coordinate to
// the current node's comment. The comment textarea must refresh to show it;
// before the fix the textarea (controlled by CommentBox's own state) kept the
// stale value because it only re-synced when the tree position changed, so the
// coordinate never appeared and the next blur committed the stale text back,
// dropping it.

const SGF = '(;GM[1]FF[4]CA[UTF-8]SZ[19];B[pd])'

test.describe('ctrl+click coordinate into comment (#844)', () => {
  test('refreshes the comment textarea with the clicked coordinate', async ({
    page,
  }) => {
    await loadSgfStringAndWait(page, SGF)
    await page.evaluate(() => window.__sabaki.goToEnd())
    await page.evaluate(() => window.__sabaki.setMode('edit'))
    // Show the sidebar/comment box, as when editing a comment for real. Sidebar
    // only re-renders (and so refreshes CommentBox) while it's visible, so an
    // in-place comment change is invisible with the sidebar collapsed.
    await page.evaluate(() =>
      window.__sabaki.setState({showSidebar: true, showCommentBox: true}),
    )
    await waitForRender(page)

    const textarea = page.locator('#properties textarea')
    await textarea.waitFor({state: 'attached'})
    // Let CommentBox's navigation debounce (graph.delay = 100ms) settle, so its
    // trailing setState doesn't clobber what we add next.
    await page.waitForTimeout(300)
    expect((await textarea.inputValue()).trim()).toBe('')

    // The coordinate the ctrl+click handler will compute for [3, 3].
    const coord = await page.evaluate(() =>
      window.__sabaki.inferredState.board.stringifyVertex([3, 3]),
    )

    await page.evaluate(() =>
      window.__sabaki.clickVertex([3, 3], {ctrlKey: true}),
    )

    // Textarea reflects the coordinate (this is the fix).
    await expect(textarea).toHaveValue(new RegExp(coord))
    // ...and it's committed on the node.
    const comment = await page.evaluate(() => {
      const s = window.__sabaki
      const tree = s.state.gameTrees[s.state.gameIndex]
      return tree.get(s.state.treePosition).data.C[0]
    })
    expect(comment).toContain(coord)
  })
})
