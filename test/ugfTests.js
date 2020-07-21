import assert from 'assert'
import {ugf} from '../src/modules/fileformats/index.js'

describe('ugf', () => {
  describe('parse', () => {
    it('should parse simple files', () => {
      let tree = ugf.parseFile(`${__dirname}/ugf/amateur.ugf`)[0]

      assert.deepEqual(tree.root.data, {
        CA: ['UTF-8'],
        CP: ['PANDANET INC.'],
        FF: ['4'],
        GM: ['1'],
        SZ: ['19'],
        KM: ['-5.50'],
        PW: ['YINNI'],
        WR: ['8d'],
        PB: ['kaziwami'],
        BR: ['7d'],
        DT: ['2019-03-08'],
        RE: ['B+7.50']
      })

      assert.deepEqual(
        [...tree.getSequence(tree.root.id)].map(node => node.data).slice(1, 5),
        [{B: ['qd']}, {W: ['dd']}, {B: ['pq']}, {W: ['dq']}]
      )
    })

    it('should parse reviews with comments and variations', () => {
      let tree = ugf.parseFile(`${__dirname}/ugf/review.ugi`)[0]

      assert.equal(
        tree.root.data.C,
        `apetresc 2k?: Let's begin and enjoy a great game.
ken03110 2k : Hi!
`
      )
    })
  })
})
