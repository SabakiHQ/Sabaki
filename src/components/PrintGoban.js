const {h, Component} = require('preact')

const gametree = require('../modules/gametree')

const range = n => [...Array(n)].map((_, i) => i)

class PrintGoban extends Component {
    render({treePosition}) {
        let board = gametree.getBoard(...treePosition)
        let rangeX = range(board.width)
        let rangeY = range(board.height)

        return h('svg')
    }
}

module.exports = PrintGoban
