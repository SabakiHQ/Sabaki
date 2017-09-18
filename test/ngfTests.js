const assert = require('assert')

const {ngf} = require('../src/modules/fileformats')
const gametree = require('../src/modules/gametree')

describe('ngf', () => {
    describe('parse', () => {
        it('should parse simple files', () => {
            let tree = ngf.parseFile(`${__dirname}/ngf/even.ngf`)[0]

            assert.deepEqual(
                tree.nodes[0],
                {
                    CA: ['UTF-8'], FF: [4], GM: [1], SZ: [19], KM: [7.5],
                    PW: ['LQC'], WR: ['9p'],
                    PB: ['CYY'], BR: ['9p'],
                    DT: ['2017-03-16'], RE: ['B+0.5']
                }
            )

            assert.deepEqual(
                tree.nodes.slice(1, 5),
                [{B: ['qd']}, {W: ['dd']}, {B: ['pq']}, {W: ['dp']}]
            )
        })
    })
})
