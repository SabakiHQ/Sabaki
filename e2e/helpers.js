const path = require('path')

/**
 * Wait for the current game tree to have at least one child node,
 * indicating an SGF file has been fully loaded and parsed.
 */
async function waitForGameLoad(page) {
  await page.waitForFunction(
    () => {
      if (!window.__sabaki) return false
      const tree =
        window.__sabaki.state.gameTrees[window.__sabaki.state.gameIndex]
      return tree && tree.root.children.length > 0
    },
    {timeout: 10000},
  )
}

/**
 * Load an SGF file via the sabaki singleton and wait for it to parse.
 */
async function loadSgfAndWait(page, sgfPath) {
  await page.evaluate((filePath) => {
    window.__sabaki.loadFile(filePath)
  }, sgfPath)

  await waitForGameLoad(page)
}

/**
 * Load SGF content from a string (rather than a file path) via the sabaki
 * singleton and wait for it to parse. Handy for small inline trees.
 */
async function loadSgfStringAndWait(page, content) {
  await page.evaluate((sgf) => {
    window.__sabaki.loadContent(sgf, 'sgf')
  }, content)

  await waitForGameLoad(page)
}

/**
 * Flush a renderer render cycle, resolving once it has completed. Useful after
 * a state or setting change before asserting against the DOM.
 */
async function waitForRender(page) {
  await page.evaluate(() => window.__sabaki.waitForRender())
}

/**
 * Navigate to a node addressed by a list of child indices from the root,
 * e.g. [0, 0, 1, 0] means root → child0 → child0 → child1 → child0. Unlike
 * goStep(), this can reach nodes that are not on the main (all-first-children)
 * line. Resolves once the new position is applied and rendered.
 */
async function gotoChildPath(page, childPath) {
  const targetId = await page.evaluate((path) => {
    const tree =
      window.__sabaki.state.gameTrees[window.__sabaki.state.gameIndex]
    let node = tree.root
    for (const i of path) node = node.children[i]
    window.__sabaki.setCurrentTreePosition(tree, node.id)
    return node.id
  }, childPath)

  await page.waitForFunction(
    (id) => window.__sabaki.state.treePosition === id,
    targetId,
  )
  await waitForRender(page)
}

/**
 * Returns the depth (move number) of the current tree position.
 */
function getTreeDepth(page) {
  return page.evaluate(() => {
    const tree =
      window.__sabaki.state.gameTrees[window.__sabaki.state.gameIndex]
    let pos = window.__sabaki.state.treePosition
    let depth = 0
    while (pos !== tree.root.id) {
      pos = tree.get(pos).parentId
      depth++
    }
    return depth
  })
}

/**
 * Attach engines, wait for them to be fully initialized (process spawned
 * and list_commands response processed), and return their syncer IDs.
 */
async function attachAndWaitForEngines(page, engines) {
  const syncerIds = await page.evaluate((engs) => {
    const syncers = window.__sabaki.attachEngines(engs)
    return syncers.map((s) => s.id)
  }, engines)

  // Wait until every syncer's process is running (_suspended === false)
  // AND its list_commands response has been processed (commands array
  // populated). This replaces the previous fixed 500ms delay.
  await page.waitForFunction(
    (ids) => {
      const syncers = window.__sabaki.state.attachedEngineSyncers
      return ids.every((id) => {
        const s = syncers.find((x) => x.id === id)
        return s && !s._suspended && s.commands && s.commands.length > 0
      })
    },
    syncerIds,
    {timeout: 15000},
  )

  return syncerIds
}

/**
 * Detach the given engine syncers and wait for them to be removed from state.
 */
async function detachAndWait(page, syncerIds) {
  await page.evaluate((ids) => {
    window.__sabaki.detachEngines(ids)
  }, syncerIds)

  // Check that the specific IDs are gone, not just that the array is empty,
  // so this stays correct even if other engines are attached concurrently.
  await page.waitForFunction(
    (ids) => {
      const syncers = window.__sabaki.state.attachedEngineSyncers
      return ids.every((id) => !syncers.some((s) => s.id === id))
    },
    syncerIds,
    {timeout: 10000},
  )
}

/**
 * Absolute path to the resign engine test fixture.
 */
const enginePath = path.resolve(
  __dirname,
  '..',
  'test',
  'engines',
  'resignEngine.js',
)

module.exports = {
  waitForGameLoad,
  loadSgfAndWait,
  loadSgfStringAndWait,
  waitForRender,
  gotoChildPath,
  getTreeDepth,
  attachAndWaitForEngines,
  detachAndWait,
  enginePath,
}
