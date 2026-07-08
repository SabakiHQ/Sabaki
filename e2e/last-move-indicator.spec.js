const {expect} = require('@playwright/test')
const {test} = require('./fixtures/electron-app')
const {loadSgfStringAndWait, waitForRender} = require('./helpers')

// #904: the last-move indicator is a Shudan `point` marker, rendered as an SVG
// dot since Shudan 1.7. Older themes (e.g. upsided's Happy Stones / BadukTV)
// set `background` on it -- a leftover from when it was a <div> -- which painted
// a solid square over the whole vertex. Sabaki now neutralizes that with an
// !important rule so the indicator renders regardless of theme.
const SGF = '(;GM[1]FF[4]SZ[19];B[pd])'

test.describe('last-move indicator (#904)', () => {
  test('ignores a theme background on the point marker', async ({page}) => {
    await loadSgfStringAndWait(page, SGF)
    await page.evaluate(() => window.__sabaki.goToEnd())
    await waitForRender(page)

    // The last move (pd, a black stone -> sign_1) carries a point marker.
    const marker = page
      .locator('.shudan-vertex.shudan-marker_point .shudan-marker')
      .first()
    await marker.waitFor({state: 'attached'})

    // Inject a theme-style rule like the ones that broke the indicator; it
    // loads after Sabaki's stylesheet, exactly as a theme would.
    await page.evaluate(() => {
      const s = document.createElement('style')
      s.textContent =
        '.shudan-vertex.shudan-marker_point.shudan-sign_1 .shudan-marker { background: rgb(255, 0, 0); }'
      document.head.appendChild(s)
    })
    await waitForRender(page)

    const bg = await page.evaluate(() => {
      const el = document.querySelector(
        '.shudan-vertex.shudan-marker_point .shudan-marker',
      )
      return getComputedStyle(el).backgroundColor
    })

    // Sabaki's shim (background: transparent !important) wins over the theme
    // rule, so no red square is painted over the stone.
    expect(bg).toBe('rgba(0, 0, 0, 0)')
  })
})
