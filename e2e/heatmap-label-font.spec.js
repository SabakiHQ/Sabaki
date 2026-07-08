const {expect} = require('@playwright/test')
const {test} = require('./fixtures/electron-app')
const {loadSgfStringAndWait, waitForRender} = require('./helpers')

// #804: heatmap win-rate labels inherited the app font stack, which leads with
// 'Segoe UI'. On Linux that's the first font tried, and some font packages
// (e.g. ttf-vista-fonts) alias it to a face that rendered the tiny labels blank
// -- so the numbers vanished until users installed a Windows font package.
// Sabaki now pins the labels to broadly-available fonts with a generic
// fallback, independent of 'Segoe UI'.
test.describe('heatmap label font (#804)', () => {
  test('heat labels use a font stack independent of Segoe UI', async ({
    page,
  }) => {
    await loadSgfStringAndWait(page, '(;GM[1]FF[4]SZ[19];B[pd])')
    await waitForRender(page)

    const fontFamily = await page.evaluate(() => {
      // Inject a heat label into a real vertex (as the analysis heatmap would)
      // and read the font-family the stylesheet resolves for it.
      const vertex = document.querySelector('.shudan-vertex')
      const label = document.createElement('div')
      label.className = 'shudan-heatlabel'
      label.textContent = '55'
      vertex.appendChild(label)
      const ff = getComputedStyle(label).fontFamily
      label.remove()
      return ff
    })

    expect(fontFamily.toLowerCase()).not.toContain('segoe')
    expect(fontFamily.toLowerCase()).toContain('sans-serif')
    expect(fontFamily).toContain('Noto Sans')
  })
})
