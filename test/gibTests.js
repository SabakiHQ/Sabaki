import assert from 'assert'
import {gib} from '../src/modules/fileformats/index.js'

describe('gib', () => {
  describe('parse', () => {
    it('should parse simple files', () => {
      let tree = gib.parseFile(`${__dirname}/gib/utf8.gib`)[0]

      assert.deepEqual(tree.root.data, {
        CA: ['UTF-8'],
        FF: ['4'],
        GM: ['1'],
        SZ: ['19'],
        KM: ['0'],
        PW: ['leejw977'],
        WR: ['10K'],
        PB: ['jy512'],
        BR: ['15K'],
        DT: ['2016-03-26'],
        HA: ['3'],
        AB: ['dp', 'pd', 'dd']
      })

      assert.deepEqual(
        [...tree.getSequence(tree.root.id)].map(node => node.data).slice(1, 5),
        [{W: ['pp']}, {B: ['nq']}, {W: ['qn']}, {B: ['no']}]
      )
    })

    it('should be able to detect encoding', () => {
      let tree = gib.parseFile(`${__dirname}/gib/gb2312.gib`)[0]
      assert.equal(tree.root.data.PB[0], '石下之臣')
    })
  })
})
