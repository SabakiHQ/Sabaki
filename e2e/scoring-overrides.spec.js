const {expect} = require('@playwright/test')
const {test} = require('./fixtures/electron-app')
const {loadSgfStringAndWait, waitForRender} = require('./helpers')

// Manual territory overrides in scoring mode (state.estimateOverrides): clicking
// an empty point cycles its area value one step per click, and toggling any
// stone's life/death clears all overrides so a stale one can't drift against the
// recomputed area map (the bug from the PR's 2024 review). Assertions check both
// the state map and the rendered Shudan paint, so a broken render path can't hide
// behind correct state.

const SGF = '(;GM[1]FF[4]SZ[9];B[cc];W[gg])'

function overrides(page) {
  return page.evaluate(() => window.__sabaki.state.estimateOverrides)
}

// The territory paint Shudan renders for a vertex: 1 (black), -1 (white), or 0
// (none). Scoring mode feeds the areaMap in as the paintMap, so this reflects
// the override applied on top of the estimate.
function paintAt(page, [x, y]) {
  return page.evaluate(
    ([vx, vy]) => {
      let el = document.querySelector(
        `.shudan-vertex[data-x="${vx}"][data-y="${vy}"]`,
      )
      if (el == null) return null
      if (el.classList.contains('shudan-paint_1')) return 1
      if (el.classList.contains('shudan-paint_-1')) return -1
      return 0
    },
    [x, y],
  )
}

async function click(page, vertex) {
  await page.evaluate((v) => window.__sabaki.clickVertex(v), vertex)
  await waitForRender(page)
}

test.describe('scoring overrides', () => {
  test.beforeEach(async ({page}) => {
    await loadSgfStringAndWait(page, SGF)
    await page.evaluate(() => window.__sabaki.goToEnd())
    await page.evaluate(() => window.__sabaki.setMode('scoring'))
    await page.waitForFunction(() => window.__sabaki.state.mode === 'scoring')
    await waitForRender(page)
  })

  test('clicking cycles the territory in state and in the rendered paint', async ({
    page,
  }) => {
    let vertex = [4, 4]
    expect(await overrides(page)).toEqual({})
    let base = await paintAt(page, vertex)

    await click(page, vertex)
    let first = await paintAt(page, vertex)
    expect(await overrides(page)).toHaveProperty('4,4', 1)
    expect(first).not.toBe(base) // the paint actually changed in the DOM

    await click(page, vertex)
    let second = await paintAt(page, vertex)
    expect(await overrides(page)).toHaveProperty('4,4', 2)

    // Across the cycle the point renders all three distinct area states.
    expect(new Set([base, first, second]).size).toBe(3)

    // A third click completes the cycle: the override is dropped (not left as a
    // count of 3), and the paint returns to the estimate.
    await click(page, vertex)
    expect(await overrides(page)).toEqual({})
    expect(await paintAt(page, vertex)).toBe(base)
  })

  test('toggling a stone alive/dead clears overrides', async ({page}) => {
    let vertex = [4, 4]
    let base = await paintAt(page, vertex)

    await click(page, vertex)
    expect(Object.keys(await overrides(page))).toHaveLength(1)
    expect(await paintAt(page, vertex)).not.toBe(base) // override is showing

    // Clicking a stone routes to the life/death toggle, which clears overrides.
    // (The toggle also recomputes the area map, so we assert on the cleared
    // state rather than the post-toggle paint, which no longer has a fixed base.)
    await click(page, [2, 2])
    expect(await overrides(page)).toEqual({})
  })
})
