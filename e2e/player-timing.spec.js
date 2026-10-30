const {expect} = require('@playwright/test')
const {test} = require('./fixtures/electron-app')
const {loadSgfStringAndWait, gotoChildPath} = require('./helpers')

test('player clocks follow navigation and disappear for untimed games', async ({
  page,
}) => {
  await loadSgfStringAndWait(
    page,
    '(;PB[Black player]PW[White player]TM[300]OT[3x30 byo-yomi];B[dd]BL[295];W[pp]WL[17]OW[3])',
  )
  const clocks = page.locator('#bar header.current .time')
  await expect(clocks).toHaveText(['5:00', '5:00'])
  await gotoChildPath(page, [0, 0])
  await expect(clocks).toHaveText(['4:55', '0:17 ×3'])
  await expect(clocks.last()).toHaveAttribute('title', '3x30 byo-yomi')
  await gotoChildPath(page, [0])
  await expect(clocks).toHaveText(['4:55', '5:00'])
  await loadSgfStringAndWait(page, '(;PB[Untimed]PW[Game];B[dd])')
  await expect(clocks).toHaveCount(0)
  await loadSgfStringAndWait(
    page,
    '(;PB[Time control only]PW[Game]TM[1800]OT[5x30 byo-yomi];B[dd];W[pp])',
  )
  await expect(clocks).toHaveCount(0)
  await gotoChildPath(page, [0, 0])
  await expect(clocks).toHaveCount(0)
})
