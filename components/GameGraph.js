const {h, Component} = require('preact')

const gametree = require('../modules/gametree')
const helper = require('../modules/helper')
const setting = require('../modules/setting')

const Slider = require('./Slider')

let gridSize = setting.get('graph.grid_size')
let nodeSize = setting.get('graph.node_size')
let delay = setting.get('graph.delay')
let animationDuration = setting.get('graph.animation_duration')
let commentProperties = setting.get('sgf.comment_properties')

let squareSide = nodeSize * 2
let diamondSide = Math.round(Math.sqrt(2) * nodeSize)

let stroke = current => current ? setting.get('graph.edge_color')
    : setting.get('graph.edge_inactive_color')
let strokeWidth = current => current ? setting.get('graph.edge_size')
    : setting.get('graph.edge_inactive_size')

let shapes = (type, left, top) => ({
    square: [
        `M ${left - nodeSize} ${top - nodeSize}`,
        `h ${squareSide} v ${squareSide} h ${-squareSide} v ${-squareSide}`
    ].join(' '),

    circle: [
        `M ${left} ${top} m ${-nodeSize} 0`,
        `a ${nodeSize} ${nodeSize} 0 1 0 ${squareSide} 0`,
        `a ${nodeSize} ${nodeSize} 0 1 0 ${-squareSide} 0`
    ].join(' '),

    diamond: [
        `M ${left} ${top - diamondSide}`,
        `L ${left - diamondSide} ${top} L ${left} ${top + diamondSide}`,
        `L ${left + diamondSide} ${top} L ${left} ${top - diamondSide}`
    ].join(' ')
})[type]

class GameGraphNode extends Component {
    shouldComponentUpdate({type, fill, hover}) {
        return type !== this.props.type
            || fill !== this.props.fill
            || hover !== this.props.hover
    }

    render({
        position: [left, top],
        type,
        fill,
        hover
    }) {
        return h('path', {d: shapes(type, left, top), class: {hover}, fill})
    }
}

class GameGraphEdge extends Component {
    shouldComponentUpdate({positionAbove, positionBelow, current, length}) {
        return length !== this.props.length
            || current !== this.props.current
            || !helper.shallowEquals(positionAbove, this.props.positionAbove)
            || !helper.shallowEquals(positionBelow, this.props.positionBelow)
    }

    render({
        positionAbove: [left1, top1],
        positionBelow: [left2, top2],
        current,
        length
    }) {
        let points

        if (left1 === left2) {
            points = `${left1},${top1} ${left1},${top2 + length}`
        } else {
            points = [
                `${left1},${top1} ${left2 - gridSize},${top2 - gridSize}`,
                `${left2},${top2} ${left2},${top2 + length}`
            ].join(' ')
        }

        return h('polyline', {
            points,
            fill: 'none',
            stroke: stroke(current),
            'stroke-width': strokeWidth(current)
        })
    }
}

class GameGraph extends Component {
    constructor() {
        super()

        this.state = {
            cameraPosition: [-gridSize, -gridSize],
            viewportSize: null,
            matrixDict: null,
            mousePosition: [-100, -100]
        }

        this.easing = x => (Math.sin(Math.PI * (x - 0.5)) + 1) / 2

        this.handleNodeClick = this.handleNodeClick.bind(this)
        this.handleMouseWheel = this.handleMouseWheel.bind(this)
        this.handleGraphMouseDown = this.handleGraphMouseDown.bind(this)
    }

    remeasure() {
        let {clientWidth, clientHeight} = this.element
        this.setState({viewportSize: [clientWidth, clientHeight]})
    }

    componentDidMount() {
        document.addEventListener('mousemove', evt => {
            if (!this.svgElement) return

            let {left, top, right, bottom} = this.svgElement.getBoundingClientRect()
            let {x, y, movementX, movementY} = evt

            if (x < left || x > right || y < top || y > bottom) {
                [x, y] = [-gridSize, -gridSize]
            } else {
                [x, y] = [x - left, y - top].map(z => Math.round(z))
            }

            if (!this.mouseDown) {
                [movementX, movementY] = [0, 0]
                this.drag = false
                if (helper.shallowEquals([x, y], this.state.mousePosition)) return
            } else {
                this.drag = true
            }

            this.setState(({cameraPosition: [cx, cy]}) => ({
                mousePosition: [x, y],
                cameraPosition: [cx - movementX, cy - movementY]
            }))
        })

        document.addEventListener('mouseup', () => {
            this.mouseDown = false
        })

        window.addEventListener('resize', () => {
            clearTimeout(this.remeasureId)
            this.remeasureId = setTimeout(() => this.remeasure(), 500)
        })

        this.remeasure()
        this.componentWillReceiveProps()
    }

    shouldComponentUpdate() {
        return !this.dirty
    }

    componentWillReceiveProps({treePosition = null} = {}) {
        // Debounce rendering

        this.dirty = true

        clearTimeout(this.renderId)
        this.renderId = setTimeout(() => {
            // Adjust camera position and recalculate matrix-dict of game tree

            let [tree, index] = this.props.treePosition
            let id = tree.id + '-' + index

            let [matrix, dict] = gametree.getMatrixDict(gametree.getRoot(tree))
            let [x, y] = dict[id]
            let [width, padding] = gametree.getMatrixWidth(y, matrix)

            let relX = width === 1 ? 0 : 1 - 2 * (x - padding) / (width - 1)
            let diff = (width - 1) * gridSize / 2
            diff = Math.min(diff, this.state.viewportSize[0] / 2 - gridSize)

            this.dirty = false

            this.setState({
                matrixDict: [matrix, dict],
                cameraPosition: [
                    x * gridSize + relX * diff - this.state.viewportSize[0] / 2,
                    y * gridSize - this.state.viewportSize[1] / 2
                ].map(z => Math.round(z))
            })
        }, delay)
    }

    componentDidUpdate({height}) {
        if (height === this.props.height) return

        setTimeout(() => this.remeasure(), 200)
    }

    handleMouseWheel(evt) {
        evt.preventDefault()
        sabaki.goStep(Math.sign(evt.deltaY))
    }

    handleGraphMouseDown(evt) {
        this.mouseDown = true
    }

    handleNodeClick(evt) {
        if (this.drag) {
            this.drag = false
            return
        }

        let {onNodeClick = helper.noop} = this.props
        let {matrixDict: [matrix, ], mousePosition: [mx, my], cameraPosition: [cx, cy]} = this.state
        let [nearestX, nearestY] = [mx + cx, my + cy].map(z => Math.round(z / gridSize))

        if (!matrix[nearestY] || !matrix[nearestY][nearestX]) return

        evt.treePosition = matrix[nearestY][nearestX]
        onNodeClick(evt)
    }

    renderNodes({
        matrixDict: [matrix, dict],
        cameraPosition: [cx, cy],
        viewportSize: [width, height],
        mousePosition: [mx, my]
    }) {
        let nodeColumns = []
        let edges = []

        let [minX, minY] = [cx, cy].map(z => Math.max(Math.ceil(z / gridSize) - 5, 0))
        let [maxX, maxY] = [cx, cy].map((z, i) => (z + [width, height][i]) / gridSize + 5)
        let doneTreeBones = []

        // Render only nodes that are visible

        for (let x = minX; x <= maxX; x++) {
            let column = []

            for (let y = minY; y <= maxY; y++) {
                if (matrix[y] == null || matrix[y][x] == null) continue

                let [tree, index] = matrix[y][x]
                let node = tree.nodes[index]
                let onCurrentTrack = gametree.onCurrentTrack(tree)

                // Render node

                let fill = !onCurrentTrack
                        ? setting.get('graph.node_inactive_color')
                    : helper.shallowEquals(this.props.treePosition, [tree, index])
                        ? setting.get('graph.node_active_color')
                    : commentProperties.some(x => x in node)
                        ? setting.get('graph.node_comment_color')
                    : 'HO' in node
                        ? setting.get('graph.node_bookmark_color')
                    : tree.collapsed && tree.subtrees.length > 0 && index === tree.nodes.length - 1
                        ? setting.get('graph.node_collapsed_color')
                    : setting.get('graph.node_color')

                let left = x * gridSize
                let top = y * gridSize

                let isHovered = !this.drag
                    && Math.max(Math.abs(left - cx - mx), Math.abs(top - cy - my)) < gridSize / 2

                column.push(h(GameGraphNode, {
                    key: y,
                    position: [left, top],
                    type: 'B' in node && node.B[0] === '' || 'W' in node && node.W[0] === ''
                        ? 'square' // Pass node
                        : !('B' in node || 'W' in node)
                        ? 'diamond' // Non-move node
                        : 'circle', // Normal node
                    fill,
                    hover: isHovered
                }))

                if (!doneTreeBones.includes(tree.id)) {
                    // A *tree bone* denotes a straight edge through the whole tree

                    if (index === 0 && tree.parent) {
                        // Render precedent edge with tree bone

                        let [prevTree, prevIndex] = gametree.navigate(tree, index, -1)
                        let [px, py] = dict[prevTree.id + '-' + prevIndex]
                        let method = !onCurrentTrack ? 'unshift' : 'push'

                        edges[method](h(GameGraphEdge, {
                            key: tree.id,
                            positionAbove: [px * gridSize, py * gridSize],
                            positionBelow: [left, top],
                            length: (tree.nodes.length - 1) * gridSize,
                            current: onCurrentTrack
                        }))

                        doneTreeBones.push(tree.id)
                    } else {
                        // Render successor edges

                        let method = !onCurrentTrack ? 'unshift' : 'push'
                        let position = dict[tree.id + '-0'].map(z => z * gridSize)

                        edges[method](h(GameGraphEdge, {
                            key: tree.id,
                            positionAbove: position,
                            positionBelow: position,
                            length: (tree.nodes.length - 1) * gridSize,
                            current: onCurrentTrack
                        }))

                        doneTreeBones.push(tree.id)
                    }
                }

                if (index === tree.nodes.length - 1) {
                    for (let subtree of tree.subtrees) {
                        let current = onCurrentTrack && tree.subtrees[tree.current] === subtree
                        let [nx, ny] = dict[subtree.id + '-0']
                        let method = !current ? 'unshift' : 'push'

                        edges[method](h(GameGraphEdge, {
                            key: subtree.id,
                            positionAbove: [left, top],
                            positionBelow: [nx * gridSize, ny * gridSize],
                            length: (subtree.nodes.length - 1) * gridSize,
                            current
                        }))

                        doneTreeBones.push(subtree.id)
                    }
                }
            }

            if (column.length > 0) nodeColumns.push(h('g', {key: x}, column))
        }

        return [h('g', {}, edges), h('g', {}, nodeColumns)]
    }

    render({
        height,
        treePosition,
        showGameGraph
    }, {
        matrixDict,
        viewportSize,
        cameraPosition: [cx, cy]
    }) {
        let [tree, index] = treePosition
        let rootTree = gametree.getRoot(tree)
        let level = gametree.getLevel(...treePosition)

        return h('section',
            {
                ref: el => this.element = el,
                id: 'graph',
                onMouseWheel: this.handleMouseWheel
            },

            h('style', {}, `
                #graph {
                    height: ${height}%;
                }
                #graph svg > * {
                    transform: translate(${-cx}px, ${-cy}px);
                }
            `),

            showGameGraph && matrixDict && viewportSize && h('svg',
                {
                    ref: el => this.svgElement = el,
                    width: viewportSize[0],
                    height: viewportSize[1],

                    onClick: this.handleNodeClick,
                    onContextMenu: this.handleNodeClick,
                    onMouseDown: this.handleGraphMouseDown,
                    onMouseUp: this.handleGraphMouseUp
                },

                this.renderNodes(this.state)
            ),

            h(Slider, {
                text: level,
                percent: (level / gametree.getHeight(rootTree)) * 100
            })
        )
    }
}

module.exports = GameGraph
