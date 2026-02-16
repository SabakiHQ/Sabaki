const {expect} = require('@playwright/test')
const path = require('path')
const {test} = require('./fixtures/electron-app')
const {
  loadSgfAndWait,
  getTreeDepth,
  attachAndWaitForEngines,
  detachAndWait,
  enginePath,
} = require('./helpers')

test.describe('GTP Engine Integration Tests', () => {
  test('attach and start engine', async ({page}) => {
    const syncerInfo = await page.evaluate((ePath) => {
      const syncers = window.__sabaki.attachEngines([
        {name: 'ResignEngine', path: process.execPath, args: ePath},
      ])
      return syncers.map((s) => ({id: s.id, name: s.engine.name}))
    }, enginePath)

    expect(syncerInfo).toHaveLength(1)
    expect(syncerInfo[0].name).toBe('ResignEngine')

    // Verify it appears in state
    const attached = await page.evaluate(() => {
      return window.__sabaki.state.attachedEngineSyncers.map((s) => s.id)
    })
    expect(attached).toContain(syncerInfo[0].id)

    // Wait for engine to be started (process is running)
    await page.waitForFunction(
      (syncerId) => {
        const syncer = window.__sabaki.state.attachedEngineSyncers.find(
          (s) => s.id === syncerId,
        )
        return syncer && !syncer._suspended
      },
      syncerInfo[0].id,
      {timeout: 10000},
    )

    // Clean up
    await detachAndWait(page, attached)
  })

  test('detach engine cleanly', async ({page}) => {
    const syncerIds = await attachAndWaitForEngines(page, [
      {name: 'ResignEngine', path: process.execPath, args: enginePath},
    ])

    expect(syncerIds).toHaveLength(1)

    await detachAndWait(page, syncerIds)

    const remaining = await page.evaluate(() => {
      return window.__sabaki.state.attachedEngineSyncers.length
    })
    expect(remaining).toBe(0)
  })

  test('engine responds to genmove', async ({page}) => {
    const syncerIds = await attachAndWaitForEngines(page, [
      {name: 'ResignEngine', path: process.execPath, args: enginePath},
    ])

    const initialNodeId = await page.evaluate(() => {
      return window.__sabaki.state.treePosition
    })

    const result = await page.evaluate(async (syncerId) => {
      try {
        const r = await window.__sabaki.generateMove(
          syncerId,
          window.__sabaki.state.treePosition,
        )
        return r
          ? {ok: true, treePosition: r.treePosition, resign: r.resign}
          : {ok: false, reason: 'generateMove returned null'}
      } catch (e) {
        return {ok: false, reason: e.message}
      }
    }, syncerIds[0])

    expect(result.ok).toBe(true)

    const newNodeId = await page.evaluate(() => {
      return window.__sabaki.state.treePosition
    })
    expect(newNodeId).not.toBe(initialNodeId)

    // Clean up
    await detachAndWait(page, syncerIds)
  })

  test('bot-vs-bot game completes', async ({page}) => {
    const syncerIds = await attachAndWaitForEngines(page, [
      {name: 'BlackEngine', path: process.execPath, args: enginePath},
      {name: 'WhiteEngine', path: process.execPath, args: enginePath},
    ])

    expect(syncerIds).toHaveLength(2)

    // Assign engines to black and white
    await page.evaluate((ids) => {
      window.__sabaki.setState({
        blackEngineSyncerId: ids[0],
        whiteEngineSyncerId: ids[1],
      })
    }, syncerIds)

    // startEngineGame is async and resolves when the game ends (resign
    // or two consecutive passes), so we can await it directly.
    const result = await page.evaluate(async () => {
      try {
        await window.__sabaki.startEngineGame(
          window.__sabaki.state.treePosition,
        )
        return {ok: true}
      } catch (e) {
        return {ok: false, reason: e.message}
      }
    })

    expect(result.ok).toBe(true)

    // The resign engine plays 3 moves then resigns, so with 2 engines
    // we expect at least 3 total moves before one resigns
    expect(await getTreeDepth(page)).toBeGreaterThanOrEqual(3)

    // Clean up
    await detachAndWait(page, syncerIds)
  })

  test('board state sync after loading SGF', async ({page}) => {
    const sgfPath = path.resolve(__dirname, '..', 'test', 'sgf', 'pro_game.sgf')

    await loadSgfAndWait(page, sgfPath)

    // Navigate to move 5
    await page.evaluate(() => {
      for (let i = 0; i < 5; i++) {
        window.__sabaki.goStep(1)
      }
    })

    const positionBeforeEngine = await page.evaluate(() => {
      return window.__sabaki.state.treePosition
    })

    const syncerIds = await attachAndWaitForEngines(page, [
      {name: 'ResignEngine', path: process.execPath, args: enginePath},
    ])

    // Verify the treePosition hasn't changed from attaching the engine
    const positionAfterEngine = await page.evaluate(() => {
      return window.__sabaki.state.treePosition
    })
    expect(positionAfterEngine).toBe(positionBeforeEngine)

    // Clean up
    await detachAndWait(page, syncerIds)
  })
})
