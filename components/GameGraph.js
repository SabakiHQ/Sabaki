const {h, Component} = require('preact')

const gametree = require('../modules/gametree')
const helper = require('../modules/helper')
const setting = require('../modules/setting')

let delay = setting.get('graph.delay')
let animationDuration = setting.get('graph.animation_duration')
let commentProperties = setting.get('sgf.comment_properties')

class GameGraphNode extends Component {
    shouldComponentUpdate({position, type, fill, hover, nodeSize}) {
        return type !== this.props.type
            || fill !== this.props.fill
            || hover !== this.props.hover
            || nodeSize !== this.props.nodeSize
            || !helper.vertexEquals(position, this.props.position)
    }

    render({
        position: [left, top],
        type,
        fill,
        hover,
        nodeSize
    }) {
        return h('path', {
            d: (() => {
                let nodeSize2 = nodeSize * 2

                if (type === 'square') {
                    return [
                        `M ${left - nodeSize} ${top - nodeSize}`,
                        `h ${nodeSize2} v ${nodeSize2} h ${-nodeSize2} v ${-nodeSize2}`
                    ].join(' ')
                } else if (type === 'circle') {
                    return [
                        `M ${left} ${top} m ${-nodeSize} 0`,
                        `a ${nodeSize} ${nodeSize} 0 1 0 ${nodeSize2} 0`,
                        `a ${nodeSize} ${nodeSize} 0 1 0 ${-nodeSize2} 0`
                    ].join(' ')
                } else if (type === 'diamond') {
                    let diamondSide = Math.round(Math.sqrt(2) * nodeSize)

                    return [
                        `M ${left} ${top - diamondSide}`,
                        `L ${left - diamondSide} ${top} L ${left} ${top + diamondSide}`,
                        `L ${left + diamondSide} ${top} L ${left} ${top - diamondSide}`
                    ].join(' ')
                }

                return ''
            })(),

            class: {hover},
            fill
        })
    }
}

class GameGraphEdge extends Component {
    shouldComponentUpdate({positionAbove, positionBelow, current, length, gridSize}) {
        return length !== this.props.length
            || current !== this.props.current
            || gridSize !== this.props.gridSize
            || !helper.vertexEquals(positionAbove, this.props.positionAbove)
            || !helper.vertexEquals(positionBelow, this.props.positionBelow)
    }

    stroke() {
        return this.props.current ? setting.get('graph.edge_color')
            : setting.get('graph.edge_inactive_color')
    }

    strokeWidth() {
        return this.props.current ? setting.get('graph.edge_size')
            : setting.get('graph.edge_inactive_size')
    }

    render({
        positionAbove: [left1, top1],
        positionBelow: [left2, top2],
        current,
        length,
        gridSize
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
            stroke: this.stroke(),
            'stroke-width': this.strokeWidth()
        })
    }
}

class GameGraph extends Component {
    constructor() {
        super()

        let gridSize = setting.get('graph.grid_size')

        this.state = {
            cameraPosition: [-gridSize, -gridSize],
            viewportSize: null,
            viewportPosition: null,
            matrixDict: null,
            mousePosition: [-100, -100]
        }

        this.handleNodeClick = this.handleNodeClick.bind(this)
        this.handleMouseWheel = this.handleMouseWheel.bind(this)
        this.handleGraphMouseDown = this.handleGraphMouseDown.bind(this)
    }

    remeasure() {
        let {left, top, width, height} = this.element.getBoundingClientRect()
        this.setState({viewportSize: [width, height], viewportPosition: [left, top]})
    }

    componentDidMount() {
        document.addEventListener('mousemove', evt => {
            if (!this.svgElement) return

            let {x, y, movementX, movementY} = evt

            if (this.mouseDown == null) {
                [movementX, movementY] = [0, 0]
                this.drag = false
            } else if (this.mouseDown === 0) {
                this.drag = true
            } else {
                [movementX, movementY] = [0, 0]
                this.drag = false
            }

            this.setState(({cameraPosition: [cx, cy], viewportPosition: [vx, vy]}) => ({
                mousePosition: [x - vx, y - vy],
                cameraPosition: [cx - movementX, cy - movementY]
            }))
        })

        document.addEventListener('mouseup', () => {
            this.mouseDown = null
        })

        window.addEventListener('resize', () => {
            clearTimeout(this.remeasureId)
            this.remeasureId = setTimeout(() => this.remeasure(), 500)
        })

        this.remeasure()
        this.componentWillReceiveProps()
    }

    shouldComponentUpdate({showGameGraph, height}) {
        return showGameGraph && (height !== this.props.height || !this.dirty)
    }

    componentWillReceiveProps({treePosition = [{}, -1]} = {}) {
        // Debounce rendering

        if (treePosition === this.props.treePosition) return

        this.dirty = true

        clearTimeout(this.renderId)
        this.renderId = setTimeout(() => {
            // Adjust camera position and recalculate matrix-dict of game tree

            let {gridSize, treePosition: [tree, index]} = this.props
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
        this.mouseDown = evt.button
    }

    handleNodeClick(evt) {
        if (this.drag) {
            this.drag = false
            return
        }

        let {onNodeClick = helper.noop, gridSize} = this.props
        let {matrixDict: [matrix, ], mousePosition: [mx, my], cameraPosition: [cx, cy]} = this.state
        let [nearestX, nearestY] = [mx + cx, my + cy].map(z => Math.round(z / gridSize))

        if (!matrix[nearestY] || !matrix[nearestY][nearestX]) return

        evt.treePosition = matrix[nearestY][nearestX]
        onNodeClick(evt)
    }

    renderNodes({
        gridSize,
        nodeSize
    }, {
        matrixDict: [matrix, dict],
        cameraPosition: [cx, cy],
        mousePosition: [mx, my],
        viewportSize: [width, height]
    }) {
        let nodeColumns = []
        let edges = []

        let [minX, minY] = [cx, cy].map(z => Math.max(Math.ceil(z / gridSize) - 5, 0))
        let [maxX, maxY] = [cx, cy].map((z, i) => (z + [width, height][i]) / gridSize + 5)

        let doneTreeBones = []
        let currentTracks = []
        let notCurrentTracks = []

        // Render only nodes that are visible

        for (let x = minX; x <= maxX; x++) {
            let column = []

            for (let y = minY; y <= maxY; y++) {
                if (matrix[y] == null || matrix[y][x] == null) continue

                let [tree, index] = matrix[y][x]
                let node = tree.nodes[index]
                let onCurrentTrack

                if (currentTracks.includes(tree.id)) {
                    onCurrentTrack = true
                } else if (notCurrentTracks.includes(tree.id)) {
                    onCurrentTrack = false
                } else {
                    if (!tree.parent) {
                        onCurrentTrack = true
                        currentTracks.push(tree.id)
                    } else if (currentTracks.includes(tree.parent.id)) {
                        if (tree.parent.subtrees[tree.parent.current] !== tree) {
                            onCurrentTrack = false
                            notCurrentTracks.push(tree.id)
                        } else {
                            onCurrentTrack = true
                            currentTracks.push(tree.id)
                        }
                    } else if (notCurrentTracks.includes(tree.parent.id)) {
                        onCurrentTrack = false
                        notCurrentTracks.push(tree.id)
                    } else {
                        onCurrentTrack = gametree.onCurrentTrack(tree)

                        if (onCurrentTrack) currentTracks.push(tree.id)
                        else notCurrentTracks.push(tree.id)
                    }
                }

                // Render node

                let fill = !onCurrentTrack
                        ? setting.get('graph.node_inactive_color')
                    : helper.vertexEquals(this.props.treePosition, [tree, index])
                        ? setting.get('graph.node_active_color')
                    : 'HO' in node
                        ? setting.get('graph.node_bookmark_color')
                    : commentProperties.some(x => x in node)
                        ? setting.get('graph.node_comment_color')
                    : tree.collapsed && tree.subtrees.length > 0 && index === tree.nodes.length - 1
                        ? setting.get('graph.node_collapsed_color')
                    : setting.get('graph.node_color')

                let left = x * gridSize
                let top = y * gridSize

                let isHovered = !this.drag
                    && helper.vertexEquals([mx + cx, my + cy].map(z => Math.round(z / gridSize)), [x, y])

                column.push(h(GameGraphNode, {
                    key: y,
                    position: [left, top],
                    type: 'B' in node && node.B[0] === '' || 'W' in node && node.W[0] === ''
                        ? 'square' // Pass node
                        : !('B' in node || 'W' in node)
                        ? 'diamond' // Non-move node
                        : 'circle', // Normal node
                    fill,
                    hover: isHovered,
                    nodeSize
                }))

                if (!doneTreeBones.includes(tree.id)) {
                    // A *tree bone* denotes a straight edge through the whole tree

                    let positionAbove, positionBelow

                    if (index === 0 && tree.parent) {
                        // Render precedent edge with tree bone

                        let [prevTree, prevIndex] = gametree.navigate(tree, index, -1)
                        let [px, py] = dict[prevTree.id + '-' + prevIndex]

                        positionAbove = [px * gridSize, py * gridSize]
                        positionBelow = [left, top]
                    } else {
                        // Render tree bone only

                        let [sx, sy] = dict[tree.id + '-0']

                        positionAbove = [sx * gridSize, sy * gridSize]
                        positionBelow = positionAbove
                    }

                    if (positionAbove != null && positionBelow != null) {
                        edges[!onCurrentTrack ? 'unshift' : 'push'](h(GameGraphEdge, {
                            key: tree.id,
                            positionAbove,
                            positionBelow,
                            length: (tree.nodes.length - 1) * gridSize,
                            current: onCurrentTrack,
                            gridSize
                        }))

                        doneTreeBones.push(tree.id)
                    }
                }

                if (index === tree.nodes.length - 1) {
                    // Render successor edges with subtree bones

                    for (let subtree of tree.subtrees) {
                        let current = onCurrentTrack && tree.subtrees[tree.current] === subtree
                        let [nx, ny] = dict[subtree.id + '-0']

                        edges[!current ? 'unshift' : 'push'](h(GameGraphEdge, {
                            key: subtree.id,
                            positionAbove: [left, top],
                            positionBelow: [nx * gridSize, ny * gridSize],
                            length: (subtree.nodes.length - 1) * gridSize,
                            current,
                            gridSize
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

                this.renderNodes(this.props, this.state)
            )
        )
    }
}

module.exports = GameGraph
