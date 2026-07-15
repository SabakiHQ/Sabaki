const {expect} = require('@playwright/test')
const {test} = require('./fixtures/electron-app')
const {loadSgfStringAndWait, gotoChildPath} = require('./helpers')

// #1069: a Markdown link in a node comment ([text](url)) crashed the comment
// sidebar. The custom react-markdown renderers in MarkdownContentDisplay were
// written for react-markdown v8; the v0.60 bump to v10 changed the
// component/children contract, so Link wrapped its <a> in a ContentDisplay with
// no `tag`. ContentDisplay then rendered h(undefined, ...) -- the link surfaced
// as the literal text "[object Object]" and its ref-based querySelectorAll
// threw, wedging the comment box for the rest of the session.
//
// The "]" that closes the link's "[text]" is SGF-escaped (\\]) so it stays
// inside the C[...] value instead of terminating the property early.
const SGF =
  '(;GM[1]FF[4]CA[UTF-8]SZ[19]' +
  ';B[pd]C[see [the link\\](http://example.com) here]' +
  ';W[dp]C[second node comment])'

test.describe('Markdown link in a comment (#1069)', () => {
  test('renders the link without crashing the comment box', async ({page}) => {
    const pageErrors = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    await loadSgfStringAndWait(page, SGF)
    // Play (read-only) mode renders the comment as Markdown via
    // MarkdownContentDisplay; the sidebar only refreshes while it's visible.
    await page.evaluate(() =>
      window.__sabaki.setState({showSidebar: true, showCommentBox: true}),
    )

    // The node whose comment holds the Markdown link.
    await gotoChildPath(page, [0])

    const comment = page.locator('#properties .comment')
    await comment.waitFor({state: 'attached'})

    // The link renders as a real external anchor, not the text "[object Object]".
    const link = comment.locator('a.comment-external')
    await expect(link).toHaveAttribute('href', 'http://example.com')
    await expect(link).toHaveText('the link')
    expect(await comment.innerText()).not.toContain('object Object')

    // The comment box keeps updating on further navigation (no wedge/freeze).
    await gotoChildPath(page, [0, 0])
    await expect(comment).toContainText('second node comment')

    // No render-time exception from the comment renderers.
    expect(pageErrors.join('\n')).not.toContain('querySelectorAll')
  })

  // The same v8->v10 mismatch left Heading reading a `level` prop that v10 no
  // longer passes, so every Markdown heading rendered as <hundefined>.
  test('renders a Markdown heading with the right tag', async ({page}) => {
    await loadSgfStringAndWait(page, '(;GM[1]FF[4]SZ[19];B[pd]C[## Section])')
    await page.evaluate(() =>
      window.__sabaki.setState({showSidebar: true, showCommentBox: true}),
    )
    await gotoChildPath(page, [0])

    const heading = page.locator('#properties .comment h2')
    await expect(heading).toHaveText('Section')
  })
})
