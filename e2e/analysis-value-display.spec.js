const {expect} = require('@playwright/test')
const path = require('path')
const {test} = require('./fixtures/electron-app')
const {
  loadSgfAndWait,
  attachAndWaitForEngines,
  detachAndWait,
  waitForRender,
} = require('./helpers')

// End-to-end coverage of the "Analysis Value Display" setting
// (board.analysis_value_type, menu.js / Goban.js): 'absolute' shows each
// candidate move's raw winrate, while 'relative' shows its difference from the
// best move, so the best move always reads as 0 and every other move reads
// as its cost relative to it.
//
// Uses the same replay engine + golden transcript as engine-analysis.spec.js,
// so this exercises the real attach -> analyze -> heatmap render path without
// needing a live engine.

const RES = path.resolve(
  __dirname,
  '..',
  'test',
  'resources',
  'engine-transcripts',
)
const REPLAY_ENGINE = path.resolve(
  __dirname,
  '..',
  'test',
  'engines',
  'replayEngine.js',
)
const SGF = path.join(RES, 'sgf', 'endgame-9.sgf')
const TRANSCRIPT = path.join(RES, 'katago-1.16.4', 'endgame-9.kata-analyze.txt')

async function setValueType(page, type) {
  await page.evaluate(async (t) => {
    await window.sabaki.setting.set('board.analysis_value_type', t)
  }, type)
  await page.waitForFunction(
    (t) => window.__sabaki.state.analysisValueType === t,
    type,
  )
  await waitForRender(page)
}

function heatLabelText(page, [x, y]) {
  return page.evaluate(
    ([vx, vy]) => {
      const el = document.querySelector(
        `.shudan-vertex[data-x="${vx}"][data-y="${vy}"] .shudan-heatlabel`,
      )
      return el ? el.textContent : null
    },
    [x, y],
  )
}

test.describe('Analysis Value Display', () => {
  test('defaults to "absolute" on a fresh startup, before any setting.set call', async ({
    page,
  }) => {
    const analysisValueType = await page.evaluate(
      () => window.__sabaki.state.analysisValueType,
    )
    expect(analysisValueType).toBe('absolute')
  })

  test('"relative" mode shows the best move as 0 and other moves as a delta from it', async ({
    page,
  }) => {
    await loadSgfAndWait(page, SGF)
    await page.evaluate(() => window.__sabaki.goToEnd())

    const [syncerId] = await attachAndWaitForEngines(page, [
      {
        name: 'ReplayEngine',
        path: process.execPath,
        args: `"${REPLAY_ENGINE}" --transcript "${TRANSCRIPT}" --analyze-command kata-analyze`,
      },
    ])

    try {
      await page.evaluate((id) => window.__sabaki.startAnalysis(id), syncerId)

      // Wait for the engine's analysis to settle (mirrors engine-analysis.spec.js):
      // SBKV/SBKS land on the node only once a full analysis update has been
      // processed, so by that point state.analysis.variations is populated too.
      await page.waitForFunction(
        () => {
          const s = window.__sabaki
          const tree = s.state.gameTrees[s.state.gameIndex]
          const node = tree.get(s.state.treePosition)
          return node != null && node.data != null && node.data.SBKV != null
        },
        {timeout: 15000},
      )

      await waitForRender(page)

      // Identify the best move (the one analysis.winrate is taken from) and a
      // clearly inferior, displayed (visits >= 10) move, so the assertions
      // don't depend on the exact transcript values.
      const {best, inferior} = await page.evaluate(() => {
        const {variations, winrate} = window.__sabaki.state.analysis
        const bestVariation = variations.find((v) => v.winrate === winrate)
        const inferiorVariation = variations
          .filter((v) => v.visits >= 10 && v.winrate < winrate)
          .sort((a, b) => a.winrate - b.winrate)[0]
        return {
          best: bestVariation && bestVariation.vertex,
          inferior: inferiorVariation && inferiorVariation.vertex,
        }
      })

      expect(best).toBeTruthy()
      expect(inferior).toBeTruthy()

      await setValueType(page, 'absolute')
      const bestAbsolute = await heatLabelText(page, best)
      const inferiorAbsolute = await heatLabelText(page, inferior)

      // Absolute winrates are decisive percentages here; neither reads as 0,
      // and a winrate can never be negative.
      expect(bestAbsolute).not.toMatch(/^0%/)
      expect(inferiorAbsolute).not.toMatch(/^-/)

      await setValueType(page, 'relative')
      const bestRelative = await heatLabelText(page, best)
      const inferiorRelative = await heatLabelText(page, inferior)

      // The best move's delta from itself is always 0; the inferior move's
      // delta is its cost relative to the best move, so it's negative.
      expect(bestRelative).toMatch(/^0%/)
      expect(inferiorRelative).toMatch(/^-/)
    } finally {
      await page.evaluate(() => window.__sabaki.stopAnalysis())
      await detachAndWait(page, [syncerId])
    }
  })
})
