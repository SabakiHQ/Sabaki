const {h, Component} = require('preact')

const Goban = require('./Goban')
const PlayBar = require('./bars/PlayBar')
const EditBar = require('./bars/EditBar')
const GuessBar = require('./bars/GuessBar')
const AutoplayBar = require('./bars/AutoplayBar')
const ScoringBar = require('./bars/ScoringBar')
const FindBar = require('./bars/FindBar')

const gametree = require('../modules/gametree')
const helper = require('../modules/helper')

class MainView extends Component {
    constructor() {
        super()

        this.handleTogglePlayer = () => {
            let {gameTree, treePosition, currentPlayer} = this.props
            sabaki.setPlayer(gameTree, treePosition, -currentPlayer)
        }

        this.handleToolButtonClick = evt => {
            sabaki.setState({selectedTool: evt.tool})
        }

        this.handleFindButtonClick = evt => sabaki.findMove(evt.step, {
            vertex: this.props.findVertex,
            text: this.props.findText
        })

        this.handleGobanVertexClick = this.handleGobanVertexClick.bind(this)
        this.handleGobanLineDraw = this.handleGobanLineDraw.bind(this)
    }

    componentDidMount() {
        // Pressing Ctrl should show crosshair cursor on Goban in edit mode

        document.addEventListener('keydown', evt => {
            if (evt.key !== 'Control' || evt.key !== 'Meta') return

            if (this.props.mode === 'edit') {
                this.setState({gobanCrosshair: true})
            }
        })

        document.addEventListener('keyup', evt => {
            if (evt.key !== 'Control') return

            if (this.props.mode === 'edit') {
                this.setState({gobanCrosshair: false})
            }
        })
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.mode !== 'edit') {
            this.setState({gobanCrosshair: false})
        }
    }

    handleGobanVertexClick(evt) {
        sabaki.clickVertex(evt.vertex, evt)
    }

    handleGobanLineDraw(evt) {
        let {v1, v2} = evt.line
        sabaki.useTool(this.props.selectedTool, v1, v2)
        sabaki.editVertexData = null
    }

    render({
        mode,
        gameIndex,
        gameTree,
        gameCurrents,
        treePosition,
        currentPlayer,
        gameInfo,
        attachedEngines,
        analysisTreePosition,

        deadStones,
        scoringMethod,
        scoreBoard,
        playVariation,
        analysis,
        areaMap,
        blockedGuesses,

        highlightVertices,
        showCoordinates,
        showMoveColorization,
        showNextMoves,
        showSiblings,
        fuzzyStonePlacement,
        animateStonePlacement,

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
        let node = gameTree.get(treePosition)
        let board = gametree.getBoard(gameTree, treePosition)
        let komi = +gametree.getRootProperty(gameTree, 'KM', 0)
        let handicap = +gametree.getRootProperty(gameTree, 'HA', 0)
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
                    gameTree,
                    treePosition,
                    board,
                    highlightVertices: findVertex && mode === 'find'
                        ? [findVertex]
                        : highlightVertices,
                    analysis: mode === 'play'
                        && analysisTreePosition != null
                        && analysisTreePosition === treePosition
                        ? analysis
                        : null,
                    paintMap,
                    dimmedStones: ['scoring', 'estimator'].includes(mode) ? deadStones : [],

                    crosshair: gobanCrosshair,
                    showCoordinates,
                    showMoveColorization,
                    showNextMoves: mode !== 'guess' && showNextMoves,
                    showSiblings: mode !== 'guess' && showSiblings,
                    fuzzyStonePlacement,
                    animateStonePlacement,

                    playVariation,
                    drawLineMode: mode === 'edit' && ['arrow', 'line'].includes(selectedTool)
                        ? selectedTool : null,

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
                    showHotspot: node.data.HO != null,
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
                    gameTree,
                    gameCurrents: gameCurrents[gameIndex],
                    treePosition
                }),

                h(ScoringBar, {
                    type: 'scoring',
                    mode,
                    method: scoringMethod,
                    scoreBoard,
                    areaMap,
                    komi,
                    handicap
                }, 'Please select dead stones.'),

                h(ScoringBar, {
                    type: 'estimator',
                    mode,
                    method: scoringMethod,
                    scoreBoard,
                    areaMap,
                    komi,
                    handicap
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
