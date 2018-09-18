const {h, Component} = require('preact')
const classNames = require('classnames')
const {BoundedGoban} = require('@sabaki/shudan-goban')

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
    }

    handleVertexMouseMove(evt, vertex) {
        let {drawLineMode, onVertexMouseMove = helper.noop} = this.props

        onVertexMouseMove(Object.assign(evt, {
            mouseDown: this.mouseDown,
            startVertex: this.startVertex,
            vertex
        }))

        if (!!drawLineMode && evt.mouseDown && evt.button === 0) {
            let temporaryLine = [evt.startVertex, evt.vertex]

            if (!helper.equals(temporaryLine, this.state.temporaryLine)) {
                this.setState({temporaryLine})
            }
        }
    }

    render({
        board,
        paintMap,
        heatMap,
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
        temporaryLine = null
    }) {
        let drawTemporaryLine = !!drawLineMode && !!temporaryLine

        let lines = board.lines.filter(({v1, v2, type}) => {
            if (drawTemporaryLine) {
                if (
                    helper.equals([v1, v2], temporaryLine)
                    || (type !== 'arrow' || drawLineMode === 'line')
                    && helper.equals([v2, v1], temporaryLine)
                ) {
                    drawTemporaryLine = false
                    return false
                }
            }

            return true
        })

        if (drawTemporaryLine) lines.push({
            v1: temporaryLine[0],
            v2: temporaryLine[1],
            type: drawLineMode
        })

        return h(BoundedGoban, {
            id: 'goban',
            class: classNames({crosshair}),
            innerProps: {ref: el => this.element = el},

            maxWidth,
            maxHeight,
            fuzzyStonePlacement,
            animateStonePlacement,

            signMap: board.arrangement,
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
