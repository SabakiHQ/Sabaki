const {expect} = require('@playwright/test')
const {test} = require('./fixtures/electron-app')

test.describe('Settings-backed Controls', () => {
  test('Score drawer Area/Territory toggle switches the scoring method', async ({
    page,
  }) => {
    await page.evaluate(() => window.__sabaki.openDrawer('score'))
    await page.waitForFunction(
      () => window.__sabaki && window.__sabaki.state.openDrawer === 'score',
    )
    await page.waitForSelector('#score .tab-bar li:nth-child(1) a', {
      state: 'attached',
    })

    // Default scoring.method is 'territory'.
    expect(await page.evaluate(() => window.__sabaki.state.scoringMethod)).toBe(
      'territory',
    )

    // Activate the "Area" tab (first item in the score drawer's tab bar).
    await page.evaluate(() =>
      document.querySelector('#score .tab-bar li:nth-child(1) a').click(),
    )
    await page.waitForFunction(
      () => window.__sabaki.state.scoringMethod === 'area',
      {timeout: 5000},
    )
    expect(await page.evaluate(() => window.__sabaki.state.scoringMethod)).toBe(
      'area',
    )

    // Activate the "Territory" tab to confirm the control works both ways.
    await page.evaluate(() =>
      document.querySelector('#score .tab-bar li:nth-child(2) a').click(),
    )
    await page.waitForFunction(
      () => window.__sabaki.state.scoringMethod === 'territory',
      {timeout: 5000},
    )
    expect(await page.evaluate(() => window.__sabaki.state.scoringMethod)).toBe(
      'territory',
    )
  })

  test('Autoplay seconds-per-move slider persists its value', async ({
    page,
  }) => {
    await page.evaluate(() => window.__sabaki.setMode('autoplay'))
    await page.waitForFunction(
      () => window.__sabaki && window.__sabaki.state.mode === 'autoplay',
    )
    await page.waitForSelector('#autoplay input[type=number]', {
      state: 'attached',
    })

    // Default autoplay.sec_per_move is 1; change it to a distinct value.
    await page.evaluate(() => {
      let input = document.querySelector('#autoplay input[type=number]')
      input.value = '7'
      input.dispatchEvent(new Event('input', {bubbles: true}))
      input.dispatchEvent(new Event('change', {bubbles: true}))
    })

    await page.waitForFunction(
      () => window.sabaki.setting.get('autoplay.sec_per_move') === 7,
      {timeout: 5000},
    )
    expect(
      await page.evaluate(() =>
        window.sabaki.setting.get('autoplay.sec_per_move'),
      ),
    ).toBe(7)
  })
})
