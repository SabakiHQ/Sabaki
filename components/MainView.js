const {h, Component} = require('preact')

const Goban = require('./Goban')
const PlayBar = require('./PlayBar')
const EditBar = require('./EditBar')
const GuessBar = require('./GuessBar')
const AutoplayBar = require('./AutoplayBar')
const ScoringBar = require('./ScoringBar')
const EstimatorBar = require('./EstimatorBar')
const FindBar = require('./FindBar')

const $ = require('../modules/sprint')
const gametree = require('../modules/gametree')

class MainView extends Component {
    constructor() {
        super()

        this.handleGobanResize = this.handleGobanResize.bind(this)
        this.handleGobanVertexClick = this.handleGobanVertexClick.bind(this)
        this.handleEditToolClick = this.handleEditToolClick.bind(this)
        this.handleBarCloseButtonClick = this.handleBarCloseButtonClick.bind(this)
        this.handleAutoplayValueChange = this.handleAutoplayValueChange.bind(this)
        this.handleAutoplayButtonClick = this.handleAutoplayButtonClick.bind(this)
    }

    componentDidMount() {
        // Handle mouse scrolling

        this.mainElement.addEventListener('wheel', evt => {
            evt.preventDefault()

            let sign = Math.sign(evt.deltaY)
            let treePosition = gametree.navigate(...this.props.treePosition, sign)

            if (treePosition == null) return

            sabaki.setState({treePosition})
        })
    }

    handleGobanResize() {
        /*  Because of board rendering issues, we want the width
            and the height of `<main>` to be even */

        let $main = $(this.mainElement).css('width', '').css('height', '')

        let width = Math.round($main.width()
            - parseFloat($main.css('padding-left'))
            - parseFloat($main.css('padding-right')))
        let height = Math.round($main.height()
            - parseFloat($main.css('padding-top'))
            - parseFloat($main.css('padding-bottom')))

        if (width % 2 !== 0) width++
        if (height % 2 !== 0) height++

        this.setState({width, height})
    }

    handleGobanVertexClick(evt) {
        console.log(evt.vertex)
    }

    handleEditToolClick(evt) {
        sabaki.setState({selectedTool: evt.toolId})
    }

    handleBarCloseButtonClick() {
        sabaki.setState({mode: 'play'})
    }

    handleAutoplayButtonClick() {
        sabaki.setState(({autoplaying}) => ({autoplaying: !autoplaying}))
    }

    handleAutoplayValueChange(evt) {
        sabaki.setState({secondsPerMove: +evt.currentTarget.value})
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
        undoText,
        selectedTool,
        secondsPerMove,
        autoplaying,
        findText,

        showGameGraph,
        showCommentBox,
        sidebarWidth
    }, {
        width,
        height
    }) {
        let board = gametree.getBoard(...treePosition)
        let [tree, index] = treePosition
        let node = tree.nodes[index]
        let showSidebar = showGameGraph || showCommentBox

        return h('section',
            {
                id: 'main',
                style: {right: showSidebar ? sidebarWidth: null}
            },

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

                    onBeforeResize: this.handleGobanResize,
                    onVertexClick: this.handleGobanVertexClick
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
                }),

                h(EditBar, {
                    selectedTool,
                    onToolButtonClick: this.handleEditToolClick,
                    onCloseButtonClick: this.handleBarCloseButtonClick
                }),

                h(GuessBar, {onCloseButtonClick: this.handleBarCloseButtonClick}),

                h(AutoplayBar, {
                    playing: autoplaying,
                    secondsPerMove,
                    onValueChange: this.handleAutoplayValueChange,
                    onButtonClick: this.handleAutoplayButtonClick,
                    onCloseButtonClick: this.handleBarCloseButtonClick
                }),

                h(ScoringBar, {onCloseButtonClick: this.handleBarCloseButtonClick}),
                h(EstimatorBar, {onCloseButtonClick: this.handleBarCloseButtonClick}),
                h(FindBar, {onCloseButtonClick: this.handleBarCloseButtonClick})
            )
        )
    }
}

module.exports = MainView
