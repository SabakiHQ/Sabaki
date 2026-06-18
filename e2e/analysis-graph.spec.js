const {expect} = require('@playwright/test')
const {test} = require('./fixtures/electron-app')
const {loadSgfStringAndWait, waitForRender} = require('./helpers')

// Tests for the analysis graph's two metrics (win rate and score lead).
//
// The analysis graph reads its series from the SBKV (win rate) and SBKS (score
// lead) SGF properties, so we can exercise it by loading an SGF that already
// carries those values — no live engine needed. We force the sidebar open via
// state so the graph is laid out, then assert against the rendered DOM:
//   - the position marker:   #winrategraph .marker
//   - the value strip:       #winrategraph .main
//   - the data line path:    #winrategraph svg path[stroke="#eee"]

// SGF whose main-line moves carry SBKV + SBKS. Note dp (move 3) has a score
// lead of exactly 0 (the "even game" case), and jj (move 5) has a malformed,
// non-numeric SBKS that coerces to NaN.
//   index:        0(root) 1(dd) 2(pp)  3(dp) 4(pd) 5(jj)
//   winrate:        –       55    48     60    52    50
//   scoreLead:      –      1.5   -0.5     0     2    NaN (malformed "x")
const SGF =
  '(;GM[1]FF[4]CA[UTF-8]SZ[19]' +
  ';B[dd]SBKV[55]SBKS[1.5]' +
  ';W[pp]SBKV[48]SBKS[-0.5]' +
  ';B[dp]SBKV[60]SBKS[0]' +
  ';W[pd]SBKV[52]SBKS[2]' +
  ';B[jj]SBKV[50]SBKS[x])'

// --- helpers ---------------------------------------------------------------

async function loadGraph(page) {
  await loadSgfStringAndWait(page, SGF)
  // Show the game graph so the sidebar (and thus the analysis graph) is laid
  // out with a real size. winrateData has non-null values, so the graph passes
  // its visibility gate.
  await page.evaluate(() => window.__sabaki.setState({showGameGraph: true}))
  await page.waitForSelector('#winrategraph', {timeout: 10000})
  await waitForRender(page)
}

async function setMetric(page, type) {
  await page.evaluate(async (t) => {
    await window.sabaki.setting.set('board.analysis_type', t)
  }, type)
  await page.waitForFunction(
    (t) => window.__sabaki.state.analysisType === t,
    type,
  )
  await waitForRender(page)
}

async function goToStep(page, n) {
  await page.evaluate((steps) => {
    window.__sabaki.goToBeginning()
    for (let i = 0; i < steps; i++) window.__sabaki.goStep(1)
  }, n)
  await waitForRender(page)
}

const markerCount = (page) =>
  page.evaluate(() => document.querySelectorAll('#winrategraph .marker').length)

const stripText = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('#winrategraph .main')
    return el ? el.textContent : null
  })

const dataLinePath = (page) =>
  page.evaluate(() => {
    const p = document.querySelector('#winrategraph svg path[stroke="#eee"]')
    return p ? p.getAttribute('d') : null
  })

// --- tests -----------------------------------------------------------------

test.describe('Analysis Graph', () => {
  test.beforeEach(async ({page}) => {
    await loadGraph(page)
  })

  test('win-rate graph renders with a position marker', async ({page}) => {
    // Default analysisType is 'winrate'.
    await goToStep(page, 4) // pd, winrate 52
    expect(await markerCount(page)).toBe(1)
    expect(await stripText(page)).toContain('%')
  })

  test('score-lead mode renders values without a percent sign', async ({
    page,
  }) => {
    await setMetric(page, 'scoreLead')
    await goToStep(page, 4) // pd, score lead 2

    expect(await stripText(page)).not.toContain('%')
    expect(await stripText(page)).toMatch(/\d/)
    // Score lead here is 2 (non-zero), so the marker is shown.
    expect(await markerCount(page)).toBe(1)
  })

  test('toggling the metric updates the data line at an analysed node', async ({
    page,
  }) => {
    await goToStep(page, 4) // pd has both winrate (52) and score lead (2)
    const winratePath = await dataLinePath(page)

    await setMetric(page, 'scoreLead')
    const scoreLeadPath = await dataLinePath(page)

    // data[currentIndex] differs between metrics here, so the graph
    // re-renders and the curve changes.
    expect(scoreLeadPath).not.toBe(winratePath)
    expect(winratePath).toBeTruthy()
  })

  test('keeps the position marker visible when the score lead is exactly 0', async ({
    page,
  }) => {
    await setMetric(page, 'scoreLead')
    await goToStep(page, 3) // dp, score lead == 0 (an even position)

    // A score lead of 0 is a real, common value; the marker must still render.
    expect(await markerCount(page)).toBe(1)
  })

  test('hides the position marker when the value is non-numeric (NaN)', async ({
    page,
  }) => {
    await setMetric(page, 'scoreLead')
    await goToStep(page, 5) // jj, malformed SBKS → NaN

    // A NaN value must not render a marker (it would be positioned at top: NaN%);
    // the finite-number guard hides it, unlike a plain `!= null` check.
    expect(await markerCount(page)).toBe(0)
  })

  test('updates the data line when the metric is toggled at an unanalysed node', async ({
    page,
  }) => {
    await goToStep(page, 0) // root: no SBKV/SBKS → data[currentIndex] == null
    const winratePath = await dataLinePath(page)
    expect(winratePath).toBeTruthy()

    await setMetric(page, 'scoreLead')
    const scoreLeadPath = await dataLinePath(page)

    // data[currentIndex] is null for both metrics here, so the re-render must
    // be driven by the analysisType change, not the current value.
    expect(scoreLeadPath).not.toBe(winratePath)
  })
})
