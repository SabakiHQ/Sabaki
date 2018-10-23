const {h, Component} = require('preact')
const classNames = require('classnames')
const {BoundedGoban} = require('@sabaki/shudan')
const {remote} = require('electron')

const helper = require('../modules/helper')
const setting = remote.require('./setting')

class Goban extends Component {
    constructor(props) {
        super()

        this.handleVertexMouseUp = this.handleVertexMouseUp.bind(this)
        this.handleVertexMouseDown = this.handleVertexMouseDown.bind(this)
        this.handleVertexMouseMove = this.handleVertexMouseMove.bind(this)
        this.handleVertexMouseEnter = this.handleVertexMouseEnter.bind(this)
        this.handleVertexMouseLeave = this.handleVertexMouseLeave.bind(this)
    }

    componentDidMount() {
        document.addEventListener('mouseup', () => {
            this.mouseDown = false

            if (this.state.temporaryLine)
                this.setState({temporaryLine: null})
        })

        // Resize board when window is resizing

        window.addEventListener('resize', () => {
            this.componentDidUpdate()
        })

        this.componentDidUpdate()
    }

    componentDidUpdate(prevProps) {
        if (!this.element || !this.element.parentElement) return

        let {offsetWidth: maxWidth, offsetHeight: maxHeight} = this.element.parentElement

        if (maxWidth !== this.state.maxWidth || maxHeight !== this.state.maxHeight) {
            this.setState({maxWidth, maxHeight})
        }

        if (prevProps == null || prevProps.playVariation !== this.props.playVariation) {
            if (this.props.playVariation != null) {
                let {sign, variation, removeCurrent} = this.props.playVariation

                this.stopPlayingVariation()
                this.playVariation(sign, variation, removeCurrent)
            } else {
                this.stopPlayingVariation()
            }
        }
    }

    handleVertexMouseDown(evt, vertex) {
        this.mouseDown = true
        this.startVertex = vertex
    }

    handleVertexMouseUp(evt, vertex) {
        if (!this.mouseDown) return

        let {onVertexClick = helper.noop, onLineDraw = helper.noop} = this.props

        this.mouseDown = false
        evt.vertex = vertex
        evt.line = this.state.temporaryLine

        if (evt.x == null) evt.x = evt.clientX
        if (evt.y == null) evt.y = evt.clientY

        if (evt.line) {
            onLineDraw(evt)
        } else {
            this.stopPlayingVariation()
            onVertexClick(evt)
        }

        this.setState({clicked: true})
        setTimeout(() => this.setState({clicked: false}), 200)
    }

    handleVertexMouseMove(evt, vertex) {
        let {drawLineMode, onVertexMouseMove = helper.noop} = this.props

        onVertexMouseMove(Object.assign(evt, {
            mouseDown: this.mouseDown,
            startVertex: this.startVertex,
            vertex
        }))

        if (!!drawLineMode && evt.mouseDown && evt.button === 0) {
            let temporaryLine = {v1: evt.startVertex, v2: evt.vertex}

            if (!helper.equals(temporaryLine, this.state.temporaryLine)) {
                this.setState({temporaryLine})
            }
        }
    }

    handleVertexMouseEnter(evt, vertex) {
        if (this.props.analysis == null) return

        let {sign, variation} = this.props.analysis.find(x => helper.vertexEquals(x.vertex, vertex)) || {}
        if (variation == null) return

        this.playVariation(sign, variation)
    }

    handleVertexMouseLeave(evt, vertex) {
        this.stopPlayingVariation()
    }

    playVariation(sign, variation, removeCurrent = false) {
        clearInterval(this.variationIntervalId)

        this.variationIntervalId = setInterval(() => {
            this.setState(({variationIndex}) => ({
                variation,
                variationSign: sign,
                variationRemoveCurrent: removeCurrent,
                variationIndex: variationIndex + 1
            }))
        }, setting.get('board.variation_replay_interval'))
    }

    stopPlayingVariation() {
        clearInterval(this.variationIntervalId)

        this.setState({
            variation: null,
            variationIndex: -1
        })
    }

    render({
        board,
        paintMap,
        analysis,
        highlightVertices = [],
        dimmedStones = [],

        crosshair = false,
        showCoordinates = false,
        showMoveColorization = true,
        showNextMoves = true,
        showSiblings = true,
        fuzzyStonePlacement = true,
        animateStonePlacement = true,

        drawLineMode = null
    }, {
        maxWidth = 1,
        maxHeight = 1,
        clicked = false,
        temporaryLine = null,

        variation = null,
        variationSign = 1,
        variationRemoveCurrent = false,
        variationIndex = -1
    }) {
        // Calculate lines

        let drawTemporaryLine = !!drawLineMode && !!temporaryLine
        let lines = board.lines.filter(({v1, v2, type}) => {
            if (
                drawTemporaryLine
                && (
                    helper.equals([v1, v2], [temporaryLine.v1, temporaryLine.v2])
                    || (type !== 'arrow' || drawLineMode === 'line')
                    && helper.equals([v2, v1], [temporaryLine.v1, temporaryLine.v2])
                )
            ) {
                drawTemporaryLine = false
                return false
            }

            return true
        })

        if (drawTemporaryLine) lines.push({
            v1: temporaryLine.v1,
            v2: temporaryLine.v2,
            type: drawLineMode
        })

        // Calculate ghost stones

        let ghostStoneMap = null

        if (showNextMoves || showSiblings) {
            ghostStoneMap = board.arrangement.map(row => row.map(_ => null))

            if (showSiblings) {
                for (let v in board.siblingsInfo) {
                    let [x, y] = v.split(',').map(x => +x)
                    let {sign} = board.siblingsInfo[v]

                    ghostStoneMap[y][x] = {sign, faint: showNextMoves}
                }
            }

            if (showNextMoves) {
                for (let v in board.childrenInfo) {
                    let [x, y] = v.split(',').map(x => +x)
                    let {sign, type} = board.childrenInfo[v]

                    ghostStoneMap[y][x] = {sign, type: showMoveColorization ? type : null}
                }
            }
        }

        // Draw variation

        let signMap = board.arrangement
        let markerMap = board.markers
        let drawHeatMap = true

        if (variation != null) {
            markerMap = board.markers.map(x => [...x])

            if (variationRemoveCurrent && board.currentVertex != null) {
                let [x, y] = board.currentVertex

                board = board.clone()
                board.set([x, y], 0)

                signMap = board.arrangement
                markerMap[y][x] = null
            }

            let variationBoard = variation
                .slice(0, variationIndex + 1)
                .reduce((board, [x, y], i) => {
                    markerMap[y][x] = {type: 'label', label: (i + 1).toString()}
                    return board.makeMove(i % 2 === 0 ? variationSign : -variationSign, [x, y])
                }, board)

            drawHeatMap = false
            signMap = variationBoard.arrangement
        }

        // Draw heatmap

        let heatMap = null

        if (drawHeatMap && analysis != null) {
            let maxVisitsWin = Math.max(...analysis.map(x => x.visits * x.win))
            heatMap = board.arrangement.map(row => row.map(_ => null))

            for (let {vertex: [x, y], visits, win} of analysis) {
                let strength = Math.round(visits * win * 8 / maxVisitsWin) + 1
                win = strength <= 3 ? Math.round(win) : Math.round(win * 10) / 10

                heatMap[y][x] = {
                    strength,
                    text: visits < 10 ? '' : [
                        win + (Math.floor(win) === win ? '%' : ''),
                        visits < 1000 ? visits : Math.round(visits / 100) / 10 + 'k'
                    ].join('\n')
                }
            }
        }

        return h(BoundedGoban, {
            id: 'goban',
            class: classNames({crosshair}),
            innerProps: {ref: el => this.element = el},

            maxWidth,
            maxHeight,
            showCoordinates,
            fuzzyStonePlacement,
            animateStonePlacement: clicked && animateStonePlacement,

            signMap,
            markerMap,
            ghostStoneMap,
            paintMap,
            heatMap,
            lines,
            selectedVertices: highlightVertices,
            dimmedVertices: dimmedStones,

            onVertexMouseUp: this.handleVertexMouseUp,
            onVertexMouseDown: this.handleVertexMouseDown,
            onVertexMouseMove: this.handleVertexMouseMove,
            onVertexMouseEnter: this.handleVertexMouseEnter,
            onVertexMouseLeave: this.handleVertexMouseLeave
        })
    }
}

module.exports = Goban
