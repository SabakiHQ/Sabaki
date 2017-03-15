const {h, Component} = require('preact')

const Goban = require('./Goban')
const PlayBar = require('./PlayBar')

const $ = require('../modules/sprint')
const gametree = require('../modules/gametree')

class MainView extends Component {
    adjustSize() {
        /*  Because of board rendering issues, we want the width
            and the height of `<main>` to be even */

        let $main = $(this.mainElement).css('width', '').css('height', '')

        let width = Math.round($main.width()
            - parseFloat($main.css('padding-left'))
            - parseFloat($main.css('padding-right')))
        let height = Math.round($main.height()
            - parseFloat($main.css('padding-top'))
            - parseFloat($main.css('padding-bottom')))

        if (width % 2 != 0) width++
        if (height % 2 != 0) height++

        this.setState({width, height})
    }

    render({
        treePosition,

        showCoordinates,
        showMoveColorization,
        showNextMoves,
        showSiblings,
        fuzzyStonePlacement,
        animatedStonePlacement,

        undoable,
        undoText
    }, {
        width,
        height
    }) {
        let board = gametree.getBoard(...treePosition)
        let [tree, index] = treePosition
        let node = tree.nodes[index]

        return h('section', {id: 'main'},
            h('main',
                {
                    ref: el => this.mainElement = el,
                    style: {width, height}
                },

                h(Goban, {
                    board,
                    showCoordinates,
                    showMoveColorization,
                    showNextMoves,
                    showSiblings,
                    fuzzyStonePlacement,
                    animatedStonePlacement,

                    onBeforeResize: () => this.adjustSize()
                })
            ),

            h('section', {id: 'bar'},
                h(PlayBar, {
                    playerNames: [[1, 'Black'], [-1, 'White']].map(([s, fallback]) =>
                        gametree.getPlayerName(tree, s, fallback)
                    ),
                    playerRanks: ['BR', 'WR'].map(p =>
                        gametree.getRootProperty(tree, p, '')
                    ),
                    playerCaptures: [1, -1].map(s =>
                        board.captures[s]
                    ),
                    currentPlayer: 'PL' in node ? (node.PL[0] == 'W' ? -1 : 1)
                        : 'B' in node || 'HA' in node && +node.HA[0] >= 1 ? -1
                        : 1,
                    showHotspot: 'HO' in node,
                    undoable,
                    undoText
                })
            )
        )
    }
}

module.exports = MainView
