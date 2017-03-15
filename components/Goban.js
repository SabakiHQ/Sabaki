const {h, Component} = require('preact')
const $ = require('../modules/sprint')
const helper = require('../modules/helper')

let alpha = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'
let range = n => [...Array(n)].map((_, i) => i)
let random = n => Math.floor(Math.random() * n)

class Goban extends Component {
    constructor(props) {
        super()

        this.componentWillReceiveProps(props)

        this.handleVertexMouseUp = this.handleVertexMouseUp.bind(this)
        this.handleVertexMouseDown = this.handleVertexMouseDown.bind(this)
        this.handleVertexMouseMove = this.handleVertexMouseMove.bind(this)
    }

    componentDidMount() {
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

        window.addEventListener('resize', () => this.resizeBoard())

        this.resizeBoard()
    }

    componentWillReceiveProps(nextProps) {
        // Update state to accomodate new board size

        let dim = board => [board.width, board.height]

        if (this.props && helper.shallowEquals(dim(nextProps.board), dim(this.props.board)))
            return

        let rangeX = range(nextProps.board.width)
        let rangeY = range(nextProps.board.height)
        let hoshis = nextProps.board.getHandicapPlacement(9)

        this.setState({
            rangeX,
            rangeY,
            hoshis,
            randomizer: rangeY.map(_ => rangeX.map(__ => random(5))),
            shifts: rangeY.map(_ => rangeX.map(__ => random(9))),
            animate: []
        })
    }

    resizeBoard() {
        let {board, showCoordinates, onBeforeResize = () => {}} = this.props
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

    readjustShifts(vertex = null) {
        let {board} = this.props
        let {animate, shifts} = this.state

        if (vertex == null) {
            for (let x = 0; x < board.width; x++) {
                for (let y = 0; y < board.height; y++) {
                    readjustShifts([x, y])
                }
            }

            return
        }

        let [x, y] = vertex
        let direction = shifts[y][x]
        if (direction == 0) return

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
            return
        }

        let [qx, qy] = query

        if (shifts[qy] && removeShifts.includes(shifts[qy][qx])) {
            shifts[qy][qx] = 0

            this.setState({
                animate: [...animate, query],
                shifts
            })

            setTimeout(() => {
                this.setState(({animate}) => ({
                    animate: animate.filter(v => !helper.shallowEquals(v, query))
                }))
            }, 200)
        }
    }

    handleVertexMouseDown() {
        this.mouseDown = true
    }

    handleVertexMouseUp(evt) {
        if (!this.mouseDown) return

        let {onVertexClick = () => {}} = this.props
        let {currentTarget} = evt

        this.mouseDown = false
        evt.vertex = currentTarget.dataset.vertex.split('-').map(x => +x)

        onVertexClick(evt)
    }

    handleVertexMouseMove(evt) {
        let {onVertexMouseMove = () => {}} = this.props
        let {currentTarget} = evt

        evt.vertex = currentTarget.dataset.vertex.split('-').map(x => +x)

        onVertexMouseMove(evt)
    }

    render({
        board,
        showCoordinates,
        showMoveColorization,
        showNextMoves,
        showSiblings,
        fuzzyStonePlacement,
        animatedStonePlacement,

        onVertexClick = () => {},
        onMouseMove = () => {}
    }, state) {
        let {rangeX, rangeY, hoshis, fieldSize} = state

        let rowStyle = {
            height: fieldSize,
            lineHeight: fieldSize + 'px',
            marginLeft: showCoordinates ? fieldSize : 0
        }

        let renderCoordX = () => h('ol', {class: 'coordx'},
            rangeX.map(i => h('li', {style: rowStyle}, alpha[i]))
        )

        let renderCoordY = ({left = null} = {}) => h('ol', {class: 'coordy'},
            rangeY.map(i => h('li', {
                style: {
                    width: fieldSize,
                    top: fieldSize,
                    lineHeight: fieldSize + 'px',
                    left
                }
            }, board.height - i))
        )

        return h('section',
            {
                ref: el => this.element = el,
                id: 'goban',
                class: {
                    goban: true,
                    coordinates: showCoordinates,
                    movecolorization: showMoveColorization,
                    variations: showNextMoves,
                    siblings: showSiblings,
                    fuzzy: fuzzyStonePlacement,
                    animation: animatedStonePlacement
                },
                style: {
                    fontSize: fieldSize,
                    width: state.width,
                    height: state.height,
                    marginLeft: state.marginLeft,
                    marginTop: state.marginTop
                }
            },

            h('div',
                {
                    style: {
                        width: state.innerWidth,
                        height: state.innerHeight,
                        marginLeft: state.innerMarginLeft,
                        marginTop: state.innerMarginTop
                    }
                },

                renderCoordY(),
                renderCoordX(),

                rangeY.map(y => h('ol', {class: 'row', style: rowStyle}, rangeX.map(x => {
                    let sign = board.get([x, y])
                    let [markupType, label] = board.markups[[x, y]] || [null, '']
                    let ghostClasses = {}

                    if ([x, y] in board.ghosts) {
                        let [s, types] = board.ghosts[[x, y]]

                        for (let type of types) {
                            if (type === 'child')
                                ghostClasses[`ghost_${s}`] = true
                            else if (type === 'sibling')
                                ghostClasses[`siblingghost_${s}`] = true
                            else if (type === 'badmove')
                                ghostClasses['badmove'] = true
                            else if (type === 'doubtfulmove')
                                ghostClasses['doubtfulmove'] = true
                            else if (type === 'interestingmove')
                                ghostClasses['interestingmove'] = true
                            else if (type === 'goodmove')
                                ghostClasses['goodmove'] = true
                        }
                    }

                    return h('li',
                        {
                            class: Object.assign({
                                [`pos_${x}-${y}`]: true,
                                [`shift_${state.shifts[y][x]}`]: true,
                                [`random_${state.randomizer[y][x]}`]: true,
                                [`sign_${sign}`]: true,
                                [markupType]: !!markupType,
                                hoshi: hoshis.some(v => helper.shallowEquals(v, [x, y])),
                                animate: state.animate.some(v => helper.shallowEquals(v, [x, y])),
                                smalllabel: label.length >= 3
                            }, ghostClasses),

                            style: {
                                width: fieldSize,
                                height: fieldSize
                            },

                            'data-vertex': `${x}-${y}`,

                            onMouseDown: this.handleVertexMouseDown,
                            onMouseUp: this.handleVertexMouseUp,
                            onMouseMove: this.handleVertexMouseMove
                        },
                        h('div', {class: 'stone'},
                            h('img', {src: './img/goban/blank.svg'}),
                            h('span', {title: label})
                        ),
                        h('div', {class: 'paint'})
                    )
                }))),

                renderCoordX(),
                renderCoordY({left: fieldSize * (board.width + 1)})
            ),

            // Draw lines & arrows

            board.lines.map(([v1, v2, arrow]) => {
                let $li1 = $(`#goban .pos_${v1.join('-')}`)
                let $li2 = $(`#goban .pos_${v2.join('-')}`)
                let pos1 = $li1.position(), pos2 = $li2.position()
                let dy = pos2.top - pos1.top, dx = pos2.left - pos1.left

                let top = (pos1.top + $li1.height() / 2 + pos2.top + $li2.height() / 2) / 2
                let left = (pos1.left + $li1.width() / 2 + pos2.left + $li2.width() / 2) / 2
                let angle = Math.atan2(dy, dx) * 180 / Math.PI
                let length = Math.sqrt(dx * dx + dy * dy)

                return h('hr',
                    {
                        class: arrow ? 'arrow' : 'line',
                        style: {
                            top: top + state.borderTopWidth,
                            left: left + state.borderLeftWidth,
                            marginLeft: -length / 2,
                            width: length,
                            transform: `rotate(${angle}deg)`
                        }
                    }
                )
            })
        )
    }
}

module.exports = Goban
