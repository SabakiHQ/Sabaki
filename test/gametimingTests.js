import assert from 'assert'
import {parse} from '@sabaki/sgf'
import * as gametree from '../src/modules/gametree.js'
import {formatTime, getPlayerTimes} from '../src/modules/gametiming.js'

function treeFrom(sgf) {
  return gametree.new({root: parse(sgf)[0]})
}

describe('game timing', () => {
  it('omits clocks for games without timing information', () => {
    let tree = treeFrom('(;SZ[19];B[dd])')
    assert.deepEqual(getPlayerTimes(tree, tree.root.children[0].id), [
      null,
      null,
    ])
  })

  it('uses main time initially and inherits each clock independently', () => {
    let tree = treeFrom('(;TM[300];B[dd]BL[295];W[pp]WL[297];B[dp])')
    let black = tree.root.children[0]
    let white = black.children[0]
    assert.deepEqual(getPlayerTimes(tree, tree.root.id), ['5:00', '5:00'])
    assert.deepEqual(getPlayerTimes(tree, black.id), ['4:55', '5:00'])
    assert.deepEqual(getPlayerTimes(tree, white.children[0].id), [
      '4:55',
      '4:57',
    ])
  })

  it('restores the correct clocks when rewinding and changing variations', () => {
    let tree = treeFrom(
      '(;TM[300];B[dd]BL[295](;W[pp]WL[20]OW[3];B[dp]BL[0]OB[0])(;W[dp]WL[290]))',
    )
    let black = tree.root.children[0]
    let white = black.children[0]
    assert.deepEqual(getPlayerTimes(tree, white.children[0].id), [
      '0:00 ×0',
      '0:20 ×3',
    ])
    assert.deepEqual(getPlayerTimes(tree, white.id), ['4:55', '0:20 ×3'])
    assert.deepEqual(getPlayerTimes(tree, black.children[1].id), [
      '4:55',
      '4:50',
    ])
    assert.deepEqual(getPlayerTimes(tree, tree.root.id), ['5:00', '5:00'])
  })

  it('supports clocks without a time control and ignores malformed times', () => {
    let tree = treeFrom(
      '(;TM[invalid];B[dd]BL[59.5];W[pp]WL[];B[dp]BL[Infinity])',
    )
    let last = tree.root.children[0].children[0].children[0]
    assert.deepEqual(getPlayerTimes(tree, last.id), ['0:59', null])
  })

  it('omits clocks when only time-control settings are recorded', () => {
    for (let settings of [
      'TM[300]',
      'OT[3x30 byo-yomi]',
      'TM[300]OT[3x30 byo-yomi]',
    ]) {
      let tree = treeFrom(`(;${settings};B[dd];W[pp])`)
      assert.deepEqual(getPlayerTimes(tree, tree.root.id), [null, null])
      assert.deepEqual(getPlayerTimes(tree, tree.root.children[0].id), [
        null,
        null,
      ])
    }
  })

  it('requires valid remaining time on a move', () => {
    for (let sgf of [
      '(;TM[300]BL[300];B[dd])',
      '(;TM[300];B[dd]BL[invalid])',
      '(;TM[300];B[dd]OB[3])',
    ]) {
      let tree = treeFrom(sgf)
      assert.deepEqual(getPlayerTimes(tree, tree.root.id), [null, null])
    }
  })

  it('checks timing again after the game tree changes', () => {
    let tree = treeFrom('(;TM[300];B[dd]BL[0])')
    assert.deepEqual(getPlayerTimes(tree, tree.root.id), ['5:00', '5:00'])
    tree = tree.mutate((draft) => {
      draft.removeProperty(tree.root.children[0].id, 'BL')
    })
    assert.deepEqual(getPlayerTimes(tree, tree.root.id), [null, null])
  })

  it('formats hours and whole seconds, omitting fractional seconds', () => {
    for (let [seconds, expected] of [
      [0, '0:00'],
      [5.25, '0:05'],
      [59.9, '0:59'],
      [60, '1:00'],
      [3605, '1:00:05'],
    ]) {
      assert.equal(formatTime(seconds), expected)
    }
  })
})
