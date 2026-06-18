const {expect} = require('@playwright/test')
const path = require('path')
const {test} = require('./fixtures/electron-app')
const {
  loadSgfAndWait,
  attachAndWaitForEngines,
  detachAndWait,
} = require('./helpers')

// End-to-end coverage of the analysis pipeline: attach an engine, start
// analysis, and confirm the engine's reported win rate and score lead are
// written onto the current node as the SBKV and SBKS properties.
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
// A decisive late 9x9 endgame (Black clearly winning, ~97%), so the SBKV the
// pipeline writes has a firm, directional value to assert against — unlike an
// opening, whose ~50% eval varies by engine/net and would make the check vacuous.
const SGF = path.join(RES, 'sgf', 'endgame-9.sgf')
const TRANSCRIPT = path.join(RES, 'katago-1.16.4', 'endgame-9.kata-analyze.txt')

test.describe('Engine Analysis Integration', () => {
  test('replayed KataGo analysis writes decisive SBKV and SBKS onto the current node', async ({
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

    // try/finally so a failed assertion still tears down the engine and child
    // process, instead of leaking them into later tests in the same worker.
    try {
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

      // SBKV is Black's win rate (Sabaki normalizes to Black's perspective).
      // Black is decisively ahead in this endgame, so it must be a high, finite
      // percentage. This also pins the perspective: a wrong sign flip would
      // write ~2 instead, failing the assertion.
      const winrate = parseFloat(sbkv)
      expect(Number.isFinite(winrate)).toBe(true)
      expect(winrate).toBeGreaterThan(85)
      expect(winrate).toBeLessThanOrEqual(100)

      // SBKS is the score lead, written in the same update as SBKV and likewise
      // normalized to Black's perspective. Black is decisively ahead here, so it
      // must be a finite, clearly positive lead — this pins the score-lead
      // extraction and its sign (a wrong flip would go negative).
      const sbks = await page.evaluate(() => {
        const s = window.__sabaki
        const tree = s.state.gameTrees[s.state.gameIndex]
        return tree.get(s.state.treePosition).data.SBKS[0]
      })

      const scoreLead = parseFloat(sbks)
      expect(Number.isFinite(scoreLead)).toBe(true)
      expect(scoreLead).toBeGreaterThan(1)
      expect(scoreLead).toBeLessThan(50)
    } finally {
      await page.evaluate(() => window.__sabaki.stopAnalysis())
      await detachAndWait(page, [syncerId])
    }
  })
})
