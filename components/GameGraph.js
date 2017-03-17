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

let stroke = current => current ? setting.get('graph.edge_color')
    : setting.get('graph.edge_inactive_color')
let strokeWidth = current => current ? setting.get('graph.edge_size')
    : setting.get('graph.edge_inactive_size')

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

    componentWillReceiveProps({treePosition = null} = {}) {
        // Adjust camera position and recalculate matrix-dict of game tree

        let treeHash
        let treeChanged = true
        let treePositionChanged = !helper.shallowEquals(treePosition, this.props.treePosition)

        if (treePosition != null) {
            let rootTree = gametree.getRoot(...treePosition)
            treeHash = gametree.getHash(rootTree)

            treeChanged = treeHash !== this.treeHash
        }

        clearTimeout(this.renderId)

        this.renderId = setTimeout(() => {
            let [tree, index] = treePosition || this.props.treePosition
            let [matrix, dict] = !treeChanged ? this.state.matrixDict
                : gametree.getMatrixDict(gametree.getRoot(tree))

            let id = tree.id + '-' + index
            let [x, y] = dict[id]
            let [width, padding] = gametree.getMatrixWidth(y, matrix)
            x -= padding

            let relX = width === 1 ? 1 : 1 - 2 * x / (width - 1)
            let diff = (width - 1) * gridSize / 2
            diff = Math.min(diff, this.state.viewportSize[0] / 2 - gridSize)

            if (treeChanged) this.treeHash = treeHash

            this.setState(({matrixDict, cameraPosition}) => ({
                matrixDict: [matrix, dict],
                cameraPosition: treePositionChanged ? [
                    x * gridSize + relX * diff - this.state.viewportSize[0] / 2,
                    y * gridSize - this.state.viewportSize[1] / 2
                ].map(z => Math.round(z)) : cameraPosition
            }))
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

        let {matrixDict: [matrix, ], mousePosition: [mx, my], cameraPosition: [cx, cy]} = this.state
        let {onNodeClick = () => {}} = this.props
        let [nearestX, nearestY] = [(mx + cx) / gridSize, (my + cy) / gridSize].map(z => Math.round(z))

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

                if ('B' in node && node.B[0] === '' || 'W' in node && node.W[0] === '') {
                    // Render pass node

                    column.push(h('path', {
                        key: y,
                        d: [
                            `M ${left - nodeSize} ${top - nodeSize}`,
                            `h ${nodeSize * 2}`,
                            `v ${nodeSize * 2}`,
                            `h ${-nodeSize * 2}`,
                            `v ${-nodeSize * 2}`
                        ].join(' '),
                        fill,
                        class: {hover: isHovered}
                    }))
                } else if (!('B' in node || 'W' in node)) {
                    // Render non-move node

                    let s = Math.round(Math.sqrt(2) * nodeSize)

                    column.push(h('path', {
                        key: y,
                        d: [
                            `M ${left} ${top - s}`,
                            `L ${left - s} ${top}`,
                            `L ${left} ${top + s}`,
                            `L ${left + s} ${top}`,
                            `L ${left} ${top - s}`
                        ].join(' '),
                        fill,
                        class: {hover: isHovered}
                    }))
                } else {
                    column.push(h('path', {
                        key: y,
                        d: [
                            `M ${left} ${top}`,
                            `m ${-nodeSize} 0`,
                            `a ${nodeSize} ${nodeSize} 0 1 0 ${2 * nodeSize} 0`,
                            `a ${nodeSize} ${nodeSize} 0 1 0 ${-2 * nodeSize} 0`
                        ].join(' '),
                        fill,
                        class: {hover: isHovered}
                    }))
                }

                // Render precedent edge with tree bone

                if (index === 0 && tree.parent) {
                    let [prevTree, prevIndex] = gametree.navigate(tree, index, -1)
                    let [px, py] = dict[prevTree.id + '-' + prevIndex]

                    // Render edge only if parent node is not visible,
                    // otherwise this edge is already rendered as successor edge

                    if (px < minX || px > maxX || py < minY || py > maxY) {
                        let method = onCurrentTrack ? 'unshift' : 'push'

                        if (px === x) {
                            // Draw straight line

                            edges[method](h('polyline', {
                                key: tree.id,
                                points: [
                                    `${left},${top - gridSize}`,
                                    `${left},${top + (tree.nodes.length - 1) * gridSize}`
                                ].join(' '),
                                fill: 'none',
                                stroke: stroke(onCurrentTrack),
                                strokeWidth: strokeWidth(onCurrentTrack)
                            }))
                        } else {
                            // Draw angled line

                            edges[method](h('polyline', {
                                key: tree.id,
                                points: [
                                    `${px * gridSize},${py * gridSize}`,
                                    `${left - gridSize},${top - gridSize}`,
                                    `${left},${top}`,
                                    `${left},${top + (tree.nodes.length - 1) * gridSize}`
                                ].join(' '),
                                fill: 'none',
                                stroke: stroke(onCurrentTrack),
                                strokeWidth: strokeWidth(onCurrentTrack)
                            }))
                        }

                        doneTreeBones.push(tree.id)
                    }
                }

                // Render successor edges

                if (!doneTreeBones.includes(tree.id)) {
                    // Draw straight edge through whole tree, a so-called "tree bone"

                    let method = onCurrentTrack ? 'unshift' : 'push'
                    let [left, top] = dict[tree.id + '-0'].map(z => z * gridSize)

                    edges[method](h('polyline', {
                        key: tree.id,
                        points: `${left},${top} ${left},${top + (tree.nodes.length - 1) * gridSize}`,
                        fill: 'none',
                        stroke: stroke(onCurrentTrack),
                        strokeWidth: strokeWidth(onCurrentTrack)
                    }))

                    doneTreeBones.push(tree.id)
                }

                if (index === tree.nodes.length - 1) {
                    for (let subtree of tree.subtrees) {
                        let current = onCurrentTrack && tree.subtrees[tree.current] === subtree
                        let [nx, ny] = dict[subtree.id + '-0']
                        let method = current ? 'unshift' : 'push'

                        if (nx === x) {
                            // Draw straight tree bone, linking to parent tree

                            edges[method](h('polyline', {
                                key: subtree.id,
                                points: `${left},${top} ${left},${top + subtree.nodes.length * gridSize}`,
                                fill: 'none',
                                stroke: stroke(current),
                                strokeWidth: strokeWidth(current)
                            }))
                        } else {
                            // Draw angled line with tree bone

                            edges[method](h('polyline', {
                                key: subtree.id,
                                points: [
                                    `${left},${top}`,
                                    `${(nx - 1) * gridSize},${(ny - 1) * gridSize}`,
                                    `${nx * gridSize},${ny * gridSize}`,
                                    `${nx * gridSize},${(ny + subtree.nodes.length - 1) * gridSize}`
                                ].join(' '),
                                fill: 'none',
                                stroke: stroke(current),
                                strokeWidth: strokeWidth(current)
                            }))
                        }

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
        cameraPosition: [cx, cy],
    }) {
        let [tree, index] = treePosition
        let rootTree = gametree.getRoot(tree)
        let level = gametree.getLevel(...treePosition)

        return h('section',
            {
                ref: el => this.element = el,
                id: 'graph',
                style: {height: height + '%'},
                onMouseWheel: this.handleMouseWheel
            },

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

                h('style', {}, `#graph svg > * {
                    transform: translate(${-cx}px, ${-cy}px);
                }`),

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
