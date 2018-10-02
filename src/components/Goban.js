const {h, Component} = require('preact')
const classNames = require('classnames')
const {BoundedGoban} = require('@sabaki/shudan')

const helper = require('../modules/helper')

class Goban extends Component {
    constructor(props) {
        super()

        this.handleVertexMouseUp = this.handleVertexMouseUp.bind(this)
        this.handleVertexMouseDown = this.handleVertexMouseDown.bind(this)
        this.handleVertexMouseMove = this.handleVertexMouseMove.bind(this)
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

    componentDidUpdate() {
        if (!this.element || !this.element.parentElement) return

        let {offsetWidth: maxWidth, offsetHeight: maxHeight} = this.element.parentElement

        if (maxWidth !== this.state.maxWidth || maxHeight !== this.state.maxHeight) {
            this.setState({maxWidth, maxHeight})
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
        temporaryLine = null
    }) {
        let drawTemporaryLine = !!drawLineMode && !!temporaryLine

        // Calculate lines

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

        // Draw heatmap

        let heatMap = null

        if (analysis != null) {
            let maxVisits = Math.max(...analysis.map(x => x.visits))
            heatMap = board.arrangement.map(row => row.map(_ => null))

            for (let {vertex: [x, y], visits, win, variation} of analysis) {
                let strength = Math.round(visits * 8 / maxVisits) + 1
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

            signMap: board.arrangement,
            markerMap: board.markers,
            ghostStoneMap,
            paintMap,
            heatMap,
            lines,
            selectedVertices: highlightVertices,
            dimmedVertices: dimmedStones,

            onVertexMouseUp: this.handleVertexMouseUp,
            onVertexMouseDown: this.handleVertexMouseDown,
            onVertexMouseMove: this.handleVertexMouseMove
        })
    }
}

module.exports = Goban
