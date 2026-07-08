const {expect} = require('@playwright/test')
const {test} = require('./fixtures/electron-app')
const {waitForRender} = require('./helpers')

// #856: editing a node that carries compressed AB/AW/AE point lists used to
// mangle them. useTool() resolves the compressed lists into individual points,
// but the flatten was broken (a `.reduce` with no seed spread only the first
// sublist and nested the rest), producing comma-joined junk properties. Placing
// any setup stone on such a node should leave AB as clean single-point idents.

// A single root node carrying a compressed AB frame and nothing else: useTool
// only edits a setup node in place when it has no B/W and no children, so the
// node under test must be childless.
const SGF = '(;AB[ba:ra][ab:ar][sb:sr][bs:rs])'

test.describe('editing compressed point lists (#856)', () => {
  test('resolves a compressed AB list into clean single points', async ({
    page,
  }) => {
    await page.evaluate((sgf) => window.__sabaki.loadContent(sgf, 'sgf'), SGF)
    await page.waitForFunction(
      () => {
        const s = window.__sabaki
        if (!s) return false
        const tree = s.state.gameTrees[s.state.gameIndex]
        return tree && tree.root.data.AB != null
      },
      {timeout: 10000},
    )
    await page.evaluate(() => window.__sabaki.setMode('edit'))
    await waitForRender(page)

    // Placing a black setup stone on an empty vertex triggers the
    // compressed-list resolution on the root's AB.
    await page.evaluate(() => window.__sabaki.useTool('stone_1', [3, 3]))
    await waitForRender(page)

    const ab = await page.evaluate(() => {
      const s = window.__sabaki
      const tree = s.state.gameTrees[s.state.gameIndex]
      return tree.root.data.AB
    })

    expect(Array.isArray(ab)).toBe(true)
    // Every entry must be a clean 2-char point: no leftover ':' ranges and no
    // comma-joined nested arrays.
    for (const point of ab) {
      expect(point).toMatch(/^[a-zA-Z]{2}$/)
    }
    // The frame fully expanded (well past the 4 original compressed ranges) and
    // the newly placed stone at [3, 3] ('dd') is present.
    expect(ab.length).toBeGreaterThan(4)
    expect(ab).toContain('dd')
  })
})
