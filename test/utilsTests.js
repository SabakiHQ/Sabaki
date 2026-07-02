import assert from 'assert'

import {cycleAreaValue} from '../src/modules/utils.js'

// cycleAreaValue backs the manual territory overrides in scoring/estimator mode.
// Area values are -1 (white) / 0 (neutral) / 1 (black), and `steps` advances a
// point that many positions through neutral -> black -> white, relative to
// whatever the estimate currently shows there.
describe('cycleAreaValue', () => {
  it('cycles a neutral point through black, white, back to neutral', () => {
    assert.strictEqual(cycleAreaValue(0, 1), 1)
    assert.strictEqual(cycleAreaValue(0, 2), -1)
    assert.strictEqual(cycleAreaValue(0, 3), 0)
  })

  it('advances relative to the current estimate, not from neutral', () => {
    assert.strictEqual(cycleAreaValue(1, 1), -1) // black estimate -> white
    assert.strictEqual(cycleAreaValue(-1, 1), 0) // white estimate -> neutral
  })

  it('wraps every three steps back to the estimate', () => {
    for (let base of [-1, 0, 1]) {
      assert.strictEqual(cycleAreaValue(base, 3), base)
      assert.strictEqual(cycleAreaValue(base, 6), base)
    }
  })
})
