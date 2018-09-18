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

    handleVertexMouseDown(evt) {
        let {currentTarget} = evt

        this.mouseDown = true
        this.startVertex = currentTarget.dataset.vertex.split('-').map(x => +x)
    }

    handleVertexMouseUp(evt) {
        if (!this.mouseDown) return

        let {onVertexClick = helper.noop, onLineDraw = helper.noop} = this.props
        let {currentTarget} = evt

        this.mouseDown = false
        evt.vertex = currentTarget.dataset.vertex.split('-').map(x => +x)
        evt.line = this.state.temporaryLine

        if (evt.x == null) evt.x = evt.clientX
        if (evt.y == null) evt.y = evt.clientY

        if (evt.line) {
            onLineDraw(evt)
        } else {
            onVertexClick(evt)
        }
    }

    handleVertexMouseMove(evt) {
        let {drawLineMode, onVertexMouseMove = helper.noop} = this.props
        let {currentTarget} = evt

        onVertexMouseMove(Object.assign(evt, {
            mouseDown: this.mouseDown,
            startVertex: this.startVertex,
            vertex: currentTarget.dataset.vertex.split('-').map(x => +x)
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
        animatedStonePlacement = true,

        drawLineMode = null
    }, {
        maxWidth = 1,
        maxHeight = 1,
        temporaryLine = null
    }) {
        let drawTemporaryLine = !!drawLineMode && !!temporaryLine

        return h(BoundedGoban, {
            id: 'goban',
            class: classNames({crosshair}),
            innerProps: {ref: el => this.element = el},

            maxWidth,
            maxHeight,
            signMap: [[1, 0, -1]]
        })

        return h('section', {},
            h('div', {},
                rangeY.map(y => h('ol', {class: 'row'}, rangeX.map(x => {
                    let sign = board.get([x, y])
                    let [markupType, label] = board.markups[[x, y]] || [null, '']
                    let equalsVertex = v => helper.vertexEquals(v, [x, y])

                    return h(GobanVertex, {
                        position: [x, y],
                        shift: this.state.shifts[y][x],
                        random: this.state.randomizer[y][x],
                        sign,
                        heat: heatMap && heatMap[y] && heatMap[y][x],
                        paint: paintMap && paintMap[y] && paintMap[y][x],
                        dimmed: dimmedStones.some(equalsVertex),
                        highlight: highlightVertices.some(equalsVertex),
                        hoshi: this.state.hoshis.some(equalsVertex),
                        animate: animatedVertices.some(equalsVertex),
                        smalllabel: label.length >= 3,
                        markupType,
                        label,
                        ghostTypes: board.ghosts[[x, y]] || [],

                        onMouseUp: this.handleVertexMouseUp,
                        onMouseDown: this.handleVertexMouseDown,
                        onMouseMove: this.handleVertexMouseMove
                    })
                }))),
            ),

            // Draw lines & arrows

            board.lines.map(([v1, v2, arrow]) => {
                if (drawTemporaryLine) {
                    if (helper.equals([v1, v2], temporaryLine)
                    || (!arrow || drawLineMode === 'line')
                    && helper.equals([v2, v1], temporaryLine)) {
                        drawTemporaryLine = false
                        return
                    }
                }

                return h(GobanLine, {
                    v1, v2, showCoordinates, fieldSize,
                    type: arrow ? 'arrow' : 'line'
                })
            }),

            drawTemporaryLine && h(GobanLine, {
                temporary: true,
                v1: temporaryLine[0], v2: temporaryLine[1],
                showCoordinates, fieldSize,
                type: drawLineMode
            })
        )
    }
}

module.exports = Goban
