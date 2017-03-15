const {h, Component} = require('preact')

const Goban = require('./Goban')
const Bar = require('./Bar')

const $ = require('../modules/sprint')
const gametree = require('../modules/gametree')

class MainView extends Component {
    adjustSize() {
        // Because of board rendering issues, we want the width
        // and the height of `<main>` to be even

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
        animatedStonePlacement
    }, {
        width,
        height
    }) {
        return h('section', {id: 'main'},
            h('main',
                {
                    ref: el => this.mainElement = el,
                    style: {width, height}
                },

                h(Goban, {
                    board: gametree.getBoard(...treePosition),
                    showCoordinates,
                    showMoveColorization,
                    showNextMoves,
                    showSiblings,
                    fuzzyStonePlacement,
                    animatedStonePlacement,

                    onBeforeResize: () => this.adjustSize()
                })
            ),
            h('section', {id: 'bar'})
        )
    }
}

module.exports = MainView
