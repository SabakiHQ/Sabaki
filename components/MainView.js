const {h, Component} = require('preact')

const Goban = require('./Goban')
const Bar = require('./Bar')

const gametree = require('../modules/gametree')

class MainView extends Component {
    render({
        treePosition,
        showCoordinates,
        showMoveColorization,
        showNextMoves,
        showSiblings,
        fuzzyStonePlacement,
        animatedStonePlacement
    }) {
        return h('section', {id: 'main'},
            h('main', {},
                h(Goban, {
                    board: gametree.getBoard(...treePosition),
                    showCoordinates,
                    showMoveColorization,
                    showNextMoves,
                    showSiblings,
                    fuzzyStonePlacement,
                    animatedStonePlacement
                })
            ),
            h('section', {id: 'bar'})
        )
    }
}

module.exports = MainView
