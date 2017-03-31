const {h, Component} = require('preact')
const $ = require('../modules/sprint')
const helper = require('../modules/helper')

const alpha = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'
const range = n => [...Array(n)].map((_, i) => i)
const random = n => Math.floor(Math.random() * n)

class GobanVertex extends Component {
    shouldComponentUpdate({
        sign,
        hoshi,
        shift,
        highlight,
        paint,
        dimmed,
        animate,
        label,
        markupType,
        ghostTypes
    }) {
        return sign !== this.props.sign
            || highlight !== this.props.highlight
            || ghostTypes !== this.props.ghostTypes
            || markupType !== this.props.markupType
            || label !== this.props.label
            || shift !== this.props.shift
            || animate !== this.props.animate
            || paint !== this.props.paint
            || dimmed !== this.props.dimmed
            || hoshi !== this.props.hoshi
    }

    render({
        position: [x, y],
        shift,
        random,
        sign,
        highlight,
        paint,
        dimmed,
        hoshi,
        animate,
        markupType,
        label,
        ghostTypes,

        onMouseDown = helper.noop,
        onMouseUp = helper.noop,
        onMouseMove = helper.noop
    }) {
        let classes = {
            [`pos_${x}-${y}`]: true,
            [`shift_${shift}`]: true,
            [`random_${random}`]: true,
            [`sign_${sign}`]: true,
            [`paint_${paint}`]: !!paint,
            [markupType]: !!markupType,
            dimmed,
            hoshi,
            animate,
            smalllabel: label.length >= 3
        }

        for (let type of ghostTypes) {
            classes[type] = true
        }

        return h('li',
            {
                'data-vertex': `${x}-${y}`,
                class: classes,
                onMouseDown,
                onMouseUp,
                onMouseMove
            },

            h('div', {class: 'stone'},
                h('img', {src: './img/goban/blank.svg'}),
                h('span', {title: label})
            ),

            h('div', {class: 'paint'}),

            highlight && h('div', {class: 'highlight'})
        )
    }
}

class GobanLine extends Component {
    shouldComponentUpdate(nextProps) {
        for (let i in nextProps)
            if (nextProps[i] !== this.props[i]) return true

        return false
    }

    render({v1, v2, type, temporary, showCoordinates, fieldSize}) {
        if (helper.vertexEquals(v1, v2)) return

        let [pos1, pos2] = [v1, v2].map(v => v.map(x => (showCoordinates ? x + 1 : x) * fieldSize))
        let [dx, dy] = pos1.map((x, i) => pos2[i] - x)
        let [left, top] = pos1.map((x, i) => (x + pos2[i] + fieldSize) / 2)

        let angle = Math.atan2(dy, dx) * 180 / Math.PI
        let length = Math.sqrt(dx * dx + dy * dy)

        return h('hr',
            {
                class: {[type]: true, temporary},
                style: {
                    width: length,
                    transform: `
                        translate(${left - length / 2}px, ${top}px)
                        rotate(${angle}deg)
                    `
                }
            }
        )
    }
}

class CoordX extends Component {
    shouldComponentUpdate({rangeX}) {
        return rangeX.length !== this.props.rangeX.length
    }

    render({rangeX}) {
        return h('ol', {class: 'coordx'},
            rangeX.map(i => h('li', {}, alpha[i]))
        )
    }
}

class CoordY extends Component {
    shouldComponentUpdate({rangeY}) {
        return rangeY.length !== this.props.rangeY.length
    }

    render({rangeY}) {
        return h('ol', {class: 'coordy'},
            rangeY.map(i => h('li', {}, rangeY.length - i))
        )
    }
}

class Goban extends Component {
    constructor(props) {
        super()

        this.componentWillReceiveProps(props)

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

        // Measure CSS

        let $goban = $(this.element)

        this.setState({
            borderLeftWidth: parseFloat($goban.css('border-left-width')),
            borderTopWidth: parseFloat($goban.css('border-top-width')),
            borderRightWidth: parseFloat($goban.css('border-right-width')),
            borderBottomWidth: parseFloat($goban.css('border-bottom-width')),
            paddingLeft: parseFloat($goban.css('padding-left')),
            paddingTop: parseFloat($goban.css('padding-top')),
            paddingRight: parseFloat($goban.css('padding-right')),
            paddingBottom: parseFloat($goban.css('padding-bottom'))
        })

        // Resize board when window is resizing

        window.addEventListener('resize', () => {
            this.resize()
        })

        this.resize()
    }

    componentWillReceiveProps({board, animatedVertex}) {
        let dim = board => [board.width, board.height]

        if (!this.props || !helper.vertexEquals(dim(board), dim(this.props.board))) {
            // Update state to accomodate new board size

            let rangeX = range(board.width)
            let rangeY = range(board.height)
            let hoshis = board.getHandicapPlacement(9)

            let shifts = rangeY.map(_ => rangeX.map(__ => random(9)))
            this.readjustShifts(shifts)

            this.setState({
                rangeX,
                rangeY,
                hoshis,
                randomizer: rangeY.map(_ => rangeX.map(__ => random(5))),
                shifts
            }, () => this.resize())
        } else if (animatedVertex
        && !(this.props.animatedVertex && helper.vertexEquals(animatedVertex, this.props.animatedVertex))) {
            // Update shift

            let [x, y] = animatedVertex
            let {shifts} = this.state

            shifts[y][x] = random(9)
            this.readjustShifts(shifts, animatedVertex)

            this.setState({shifts, animatedVertex})
            setTimeout(() => this.setState({animatedVertex: null}), 200)
        }
    }

    componentDidUpdate({showCoordinates}) {
        if (showCoordinates !== this.props.showCoordinates) {
            this.resize()
        }
    }

    resize() {
        let {board, showCoordinates, onBeforeResize = helper.noop} = this.props
        onBeforeResize()

        let $goban = $(this.element)
        let $main = $goban.parent()

        let outerWidth = parseFloat($main.css('width'))
        let outerHeight = parseFloat($main.css('height'))
        let boardWidth = board.width
        let boardHeight = board.height

        if (showCoordinates) {
            boardWidth += 2
            boardHeight += 2
        }

        let width = helper.floorEven(outerWidth
            - this.state.paddingLeft - this.state.paddingRight
            - this.state.borderLeftWidth - this.state.borderRightWidth)
        let height = helper.floorEven(outerHeight
            - this.state.paddingTop - this.state.paddingBottom
            - this.state.borderTopWidth - this.state.borderBottomWidth)

        let fieldSize = helper.floorEven(Math.min(width / boardWidth, height / boardHeight, 150))
        let minX = fieldSize * boardWidth
        let minY = fieldSize * boardHeight

        this.setState({
            width: minX + outerWidth - width,
            height: minY + outerHeight - height,
            marginLeft: -(minX + outerWidth - width) / 2,
            marginTop: -(minY + outerHeight - height) / 2,
            innerWidth: minX,
            innerHeight: minY,
            innerMarginLeft: -minX / 2,
            innerMarginTop: -minY / 2,
            fieldSize
        })
    }

    readjustShifts(shifts, vertex = null) {
        if (vertex == null) {
            let movedVertices = []

            for (let y = 0; y < shifts.length; y++) {
                for (let x = 0; x < shifts[0].length; x++) {
                    movedVertices.push(...this.readjustShifts(shifts, [x, y]))
                }
            }

            return movedVertices
        }

        let [x, y] = vertex
        let direction = shifts[y][x]
        if (direction === 0) return []

        let query, removeShifts

        if ([1, 5, 8].includes(direction)) {
            // Left
            query = [x - 1, y]
            removeShifts = [3, 7, 6]
        } else if ([2, 5, 6].includes(direction)) {
            // Top
            query = [x, y - 1]
            removeShifts = [4, 7, 8]
        } else if ([3, 7, 6].includes(direction)) {
            // Right
            query = [x + 1, y]
            removeShifts = [1, 5, 8]
        } else if ([4, 7, 8].includes(direction)) {
            // Bottom
            query = [x, y + 1]
            removeShifts = [2, 5, 6]
        } else {
            return []
        }

        let [qx, qy] = query
        let movedVertices = []

        if (shifts[qy] && removeShifts.includes(shifts[qy][qx])) {
            shifts[qy][qx] = 0
            movedVertices.push(query)
        }

        return movedVertices
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
        highlightVertices = [],
        paintMap,
        dimmedStones = [],

        crosshair = false,
        showCoordinates = false,
        showMoveColorization = true,
        showNextMoves = true,
        showSiblings = true,
        fuzzyStonePlacement = true,
        animatedStonePlacement = true,

        drawLineMode = null
    }, state) {
        let {fieldSize, rangeY, rangeX, temporaryLine, animatedVertex} = state
        let animatedVertices = animatedVertex
            ? [animatedVertex, ...board.getNeighbors(animatedVertex)] : []
        let drawTemporaryLine = !!drawLineMode && !!temporaryLine

        return h('section',
            {
                ref: el => this.element = el,
                id: 'goban',
                class: {
                    goban: true,
                    crosshair,
                    coordinates: showCoordinates,
                    movecolorization: showMoveColorization,
                    variations: showNextMoves,
                    siblings: showSiblings,
                    fuzzy: fuzzyStonePlacement,
                    animation: animatedStonePlacement
                }
            },

            h('style', {}, `
                #goban {
                    font-size: ${fieldSize}px;
                    width: ${state.width}px;
                    height: ${state.height}px;
                    margin-left: ${state.marginLeft}px;
                    margin-top: ${state.marginTop}px;
                }
                #goban > div {
                    width: ${state.innerWidth}px;
                    height: ${state.innerHeight}px;
                    margin-left: ${state.innerMarginLeft}px;
                    margin-top: ${state.innerMarginTop}px;
                }
                #goban > div > ol > li {
                    width: ${fieldSize}px;
                    height: ${fieldSize}px;
                }
                #goban > div > ol:not(.coordy) {
                    height: ${fieldSize}px;
                    line-height: ${fieldSize}px;
                    margin-left: ${showCoordinates ? fieldSize : 0}px;
                }
                #goban > div > ol.coordy {
                    width: ${fieldSize}px;
                    top: ${fieldSize}px;
                    line-height: ${fieldSize}px;
                }
                #goban > div > ol.coordy:last-child {
                    left: ${fieldSize * (board.width + 1)}px;
                }
            `),

            h('div', {},
                h(CoordY, {rangeY}),
                h(CoordX, {rangeX}),

                rangeY.map(y => h('ol', {class: 'row'}, rangeX.map(x => {
                    let sign = board.get([x, y])
                    let [markupType, label] = board.markups[[x, y]] || [null, '']
                    let equalsVertex = v => helper.vertexEquals(v, [x, y])

                    return h(GobanVertex, {
                        position: [x, y],
                        shift: this.state.shifts[y][x],
                        random: this.state.randomizer[y][x],
                        sign,
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

                h(CoordX, {rangeX}),
                h(CoordY, {rangeY})
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
