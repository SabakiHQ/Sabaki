const {expect} = require('@playwright/test')
const path = require('path')
const {test} = require('./fixtures/electron-app')
const {
  loadSgfAndWait,
  attachAndWaitForEngines,
  detachAndWait,
} = require('./helpers')

// End-to-end coverage of the analysis pipeline: attach an engine, start
// analysis, and confirm the engine's reported win rate is written onto the
// current node as the SBKV property.
//
// The engine here is test/engines/replayEngine.js, which replays a GOLDEN
// TRANSCRIPT — real `info ...` lines recorded from KataGo by
// scripts/engine-transcripts/capture.mjs. So this exercises the genuine
// attach → GTP analyze → parseAnalysis → SBKV path against real engine output,
// deterministically and without needing an engine (or GPU) at test time.

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
const SGF = path.join(RES, 'sgf', 'opening-19.sgf')
const TRANSCRIPT = path.join(
  RES,
  'katago-1.16.4',
  'opening-19.kata-analyze.txt',
)

test.describe('Engine Analysis Integration', () => {
  test('replayed KataGo analysis writes SBKV onto the current node', async ({
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

    // The engine advertises kata-analyze, so Sabaki will choose it.
    const supportsAnalyze = await page.evaluate((id) => {
      const s = window.__sabaki.state.attachedEngineSyncers.find(
        (x) => x.id === id,
      )
      return s != null && s.commands.includes('kata-analyze')
    }, syncerId)
    expect(supportsAnalyze).toBe(true)

    await page.evaluate((id) => window.__sabaki.startAnalysis(id), syncerId)

    // Win rate from the replayed analysis should be written onto the node.
    await page.waitForFunction(
      () => {
        const s = window.__sabaki
        const tree = s.state.gameTrees[s.state.gameIndex]
        const node = tree.get(s.state.treePosition)
        return node != null && node.data != null && node.data.SBKV != null
      },
      {timeout: 15000},
    )

    const sbkv = await page.evaluate(() => {
      const s = window.__sabaki
      const tree = s.state.gameTrees[s.state.gameIndex]
      return tree.get(s.state.treePosition).data.SBKV[0]
    })

    const winrate = parseFloat(sbkv)
    expect(Number.isFinite(winrate)).toBe(true)
    expect(winrate).toBeGreaterThanOrEqual(0)
    expect(winrate).toBeLessThanOrEqual(100)

    await page.evaluate(() => window.__sabaki.stopAnalysis())
    await detachAndWait(page, [syncerId])
  })
})
