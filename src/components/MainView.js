const {h, Component} = require('preact')

const Goban = require('./Goban')
const PlayBar = require('./bars/PlayBar')
const EditBar = require('./bars/EditBar')
const GuessBar = require('./bars/GuessBar')
const AutoplayBar = require('./bars/AutoplayBar')
const ScoringBar = require('./bars/ScoringBar')
const FindBar = require('./bars/FindBar')

const gametree = require('../modules/gametree')

class MainView extends Component {
    constructor() {
        super()

        this.handleTogglePlayer = () => sabaki.setPlayer(...this.props.treePosition, -this.props.currentPlayer)

        this.handleToolButtonClick = evt => {
            sabaki.setState({selectedTool: evt.tool})
        }

        this.handleFindButtonClick = evt => sabaki.findMove(evt.step, {
            vertex: this.props.findVertex,
            text: this.props.findText
        })

        this.handleGobanResize = this.handleGobanResize.bind(this)
        this.handleGobanVertexClick = this.handleGobanVertexClick.bind(this)
        this.handleGobanLineDraw = this.handleGobanLineDraw.bind(this)
    }

    componentDidMount() {
        // Pressing shift should show crosshair cursor on Goban in edit mode

        document.addEventListener('keydown', evt => {
            if (evt.keyCode !== 17) return

            if (this.props.mode === 'edit') {
                this.setState({gobanCrosshair: true})
            }
        })

        document.addEventListener('keyup', evt => {
            if (evt.keyCode !== 17) return

            if (this.props.mode === 'edit') {
                this.setState({gobanCrosshair: false})
            }
        })
    }

    handleGobanResize() {
        /*  Because of board rendering issues, we want the width
            and the height of `<main>` to be even */

        if (this.mainElement == null) return

        this.mainElement.style.width = ''
        this.mainElement.style.height = ''

        let {width, height} = window.getComputedStyle(this.mainElement)

        width = parseFloat(width)
        height = parseFloat(height)

        if (width % 2 !== 0) width++
        if (height % 2 !== 0) height++

        this.setState({width, height})
    }

    handleGobanVertexClick(evt) {
        sabaki.clickVertex(evt.vertex, evt)
    }

    handleGobanLineDraw(evt) {
        let [v1, v2] = evt.line
        sabaki.useTool(this.props.selectedTool, v1, v2)
        sabaki.editVertexData = null
    }

    render({
        mode,
        treePosition,
        rootTree,
        currentPlayer,
        gameInfo,
        attachedEngines,

        deadStones,
        scoringMethod,
        scoreBoard,
        areaMap,
        blockedGuesses,

        highlightVertices,
        showCoordinates,
        showMoveColorization,
        showNextMoves,
        showSiblings,
        fuzzyStonePlacement,
        animatedStonePlacement,
        animatedVertex,

        undoable,
        undoText,
        selectedTool,
        findText,
        findVertex,

        showLeftSidebar,
        showSidebar,
        sidebarWidth,
        leftSidebarWidth
    }, {
        width,
        height,
        gobanCrosshair
    }) {
        let [tree, index] = treePosition
        let board = gametree.getBoard(tree, index)
        let node = tree.nodes[index]
        let komi = +gametree.getRootProperty(rootTree, 'KM', 0)
        let paintMap

        if (['scoring', 'estimator'].includes(mode)) {
            paintMap = areaMap
        } else if (mode === 'guess') {
            paintMap = [...Array(board.height)].map(_ => Array(board.width).fill(0))

            for (let [x, y] of blockedGuesses) {
                paintMap[y][x] = 1
            }
        }

        return h('section',
            {
                id: 'main',
                style: {
                    left: showLeftSidebar ? leftSidebarWidth : null,
                    right: showSidebar ? sidebarWidth : null
                }
            },

            h('main',
                {
                    ref: el => this.mainElement = el,
                    style: {width, height}
                },

                h(Goban, {
                    board,
                    highlightVertices: findVertex && mode === 'find' ? [findVertex]
                        : highlightVertices,
                    paintMap,
                    dimmedStones: ['scoring', 'estimator'].includes(mode) ? deadStones : [],

                    crosshair: gobanCrosshair,
                    showCoordinates,
                    showMoveColorization,
                    showNextMoves: mode !== 'guess' && showNextMoves,
                    showSiblings: mode !== 'guess' && showSiblings,
                    fuzzyStonePlacement,
                    animatedStonePlacement,
                    animatedVertex,

                    drawLineMode: mode === 'edit' && ['arrow', 'line'].includes(selectedTool)
                        ? selectedTool : null,

                    onBeforeResize: this.handleGobanResize,
                    onVertexClick: this.handleGobanVertexClick,
                    onLineDraw: this.handleGobanLineDraw
                })
            ),

            h('section', {id: 'bar'},
                h(PlayBar, {
                    mode,
                    attachedEngines,
                    playerNames: gameInfo.playerNames,
                    playerRanks: gameInfo.playerRanks,
                    playerCaptures: board.captures,
                    currentPlayer,
                    showHotspot: 'HO' in node,
                    undoable,
                    undoText,
                    onCurrentPlayerClick: this.handleTogglePlayer
                }),

                h(EditBar, {
                    mode,
                    selectedTool,
                    onToolButtonClick: this.handleToolButtonClick
                }),

                h(GuessBar, {
                    mode,
                    treePosition
                }),

                h(AutoplayBar, {
                    mode,
                    treePosition
                }),

                h(ScoringBar, {
                    type: 'scoring',
                    mode,
                    method: scoringMethod,
                    scoreBoard,
                    areaMap,
                    komi
                }, 'Please select dead stones.'),

                h(ScoringBar, {
                    type: 'estimator',
                    mode,
                    method: scoringMethod,
                    scoreBoard,
                    areaMap,
                    komi
                }, 'Toggle group status.'),

                h(FindBar, {
                    mode,
                    findText,
                    onButtonClick: this.handleFindButtonClick,
                })
            )
        )
    }
}

module.exports = MainView
