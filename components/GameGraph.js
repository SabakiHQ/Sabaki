const {h, Component} = require('preact')

const gametree = require('../modules/gametree')
const helper = require('../modules/helper')
const setting = require('../modules/setting')

const Slider = require('./Slider')

class GameGraph extends Component {
    constructor() {
        super()

        this.state = {
            cameraPosition: [-50, -50],
            viewportSize: null,
            matrixDict: null,
            mousePosition: [-100, -100]
        }

        this.handleNodeClick = this.handleNodeClick.bind(this)
        this.handleMouseWheel = this.handleMouseWheel.bind(this)
        this.handleGraphMouseDown = this.handleGraphMouseDown.bind(this)
        this.handleGraphMouseMove = this.handleGraphMouseMove.bind(this)
    }

    remeasure() {
        let {clientWidth, clientHeight} = this.element
        this.setState({viewportSize: [clientWidth, clientHeight]})
    }

    componentDidMount() {
        document.addEventListener('mouseup', () => {
            this.mouseDown = false
        })

        window.addEventListener('resize', () => {
            clearTimeout(this.remeasureId)
            this.remeasureId = setTimeout(() => this.remeasure(), 500)
        })

        this.remeasure()
        this.componentWillReceiveProps(this.props)
    }

    componentWillReceiveProps({treePosition}) {
        // Adjust camera position and recalculate matrix-dict of game tree

        clearTimeout(this.renderId)

        this.renderId = setTimeout(() => {
            let [tree, index] = treePosition
            let [matrix, dict] = gametree.getMatrixDict(gametree.getRoot(tree))
            let gridSize = setting.get('graph.grid_size')

            let id = tree.id + '-' + index
            let [x, y] = dict[id]
            let [width, padding] = gametree.getMatrixWidth(y, matrix)
            x -= padding

            let relX = width === 1 ? 1 : 1 - 2 * x / (width - 1)
            let diff = (width - 1) * gridSize / 2
            diff = Math.min(diff, this.state.viewportSize[0] / 2 - gridSize)

            this.setState({matrixDict: [matrix, dict]})

            this.animateCameraPosition([
                x * gridSize + relX * diff - this.state.viewportSize[0] / 2,
                y * gridSize - this.state.viewportSize[1] / 2
            ].map(z => Math.round(z)))
        }, setting.get('graph.delay'))
    }

    componentDidUpdate({height}) {
        if (height === this.props.height) return

        setTimeout(() => this.remeasure(), 200)
    }

    animateCameraPosition(toPosition, duration = null, fps = 60) {
        if (duration == null) duration = setting.get('graph.animation_duration')
        window.cancelAnimationFrame(this.animationId)

        let [cx, cy] = this.state.cameraPosition
        let [ncx, ncy] = toPosition
        let easing = x => (Math.sin(Math.PI * (x - 0.5)) + 1) / 2
        let startTime = null

        let step = timestamp => {
            if (!startTime) startTime = timestamp

            let t = easing((timestamp - startTime) / duration)
            let cameraPosition = [cx + (ncx - cx) * t, cy + (ncy - cy) * t]

            this.setState({cameraPosition})

            if (timestamp - startTime < duration)
                this.animationId = window.requestAnimationFrame(step)
        }

        this.animationId = window.requestAnimationFrame(step)
    }

    handleMouseWheel(evt) {
        evt.preventDefault()
        sabaki.goStep(Math.sign(evt.deltaY))
    }

    handleGraphMouseDown(evt) {
        this.mouseDown = true
    }

    handleGraphMouseMove(evt) {
        let mousePosition = [evt.offsetX, evt.offsetY]
        let {movementX, movementY} = evt

        if (!this.mouseDown) {
            [movementX, movementY] = [0, 0]
            this.drag = false
        } else {
            this.drag = true
        }

        this.setState(({cameraPosition: [cx, cy]}) => ({
            mousePosition,
            cameraPosition: [cx - movementX, cy - movementY]
        }))
    }

    handleNodeClick(evt) {
        if (this.drag) {
            this.drag = false
            return
        }

        let gridSize = setting.get('graph.grid_size')
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
        let nodes = []
        let edges = []

        let stroke = current => current ? setting.get('graph.edge_color')
            : setting.get('graph.edge_inactive_color')
        let strokeWidth = current => current ? setting.get('graph.edge_size')
            : setting.get('graph.edge_inactive_size')

        let gridSize = setting.get('graph.grid_size')
        let nodeSize = setting.get('graph.node_size')
        let commentProperties = setting.get('sgf.comment_properties')

        let [minX, minY] = [cx, cy].map(z => Math.ceil(z / gridSize) - 1)
        let [maxX, maxY] = [cx, cy].map((z, i) => (z + [width, height][i]) / gridSize + 1)

        // Render only nodes that are visible

        for (let x = minX; x <= maxX; x++) {
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

                let left = x * gridSize - cx
                let top = y * gridSize - cy

                let isHovered = Math.max(Math.abs(left - mx), Math.abs(top - my)) < gridSize / 2
                let style = isHovered ? {stroke: 'white', strokeWidth: 2} : {}

                if ('B' in node && node.B[0] === '' || 'W' in node && node.W[0] === '') {
                    // Render pass node

                    nodes.push(h('rect', {
                        key: tree.id + '-' + index,
                        x: left - nodeSize,
                        y: top - nodeSize,
                        width: nodeSize * 2,
                        height: nodeSize * 2,
                        fill,
                        style
                    }))
                } else if (!('B' in node || 'W' in node)) {
                    // Render non-move node

                    nodes.push(h('rect', {
                        key: tree.id + '-' + index,
                        x: left - nodeSize,
                        y: top - nodeSize,
                        width: nodeSize * 2,
                        height: nodeSize * 2,
                        transform: `rotate(45 ${left} ${top})`,
                        fill,
                        style
                    }))
                } else {
                    nodes.push(h('circle', {
                        key: tree.id + '-' + index,
                        cx: left,
                        cy: top,
                        r: nodeSize,
                        fill,
                        style
                    }))
                }

                // Render precedent edge

                if (index > 0 || tree.parent) {
                    let [prevTree, prevIndex] = gametree.navigate(tree, index, -1)
                    let [px, py] = dict[prevTree.id + '-' + prevIndex]

                    // Render edge only if node is not visible,
                    // otherwise this edge is already rendered as successor edge

                    if (px < cx / gridSize || px > (cx + width) / gridSize + 1
                    || py < cy / gridSize || py > (cy + height) / gridSize + 1) {
                        let method = onCurrentTrack ? 'unshift' : 'push'

                        if (px === x) {
                            // Draw straight line

                            edges[method](h('polyline', {
                                key: tree.id + '-' + index + '-ep',
                                points: [
                                    [left, top],
                                    [left, top - gridSize]
                                ].map(z => z.join(',')).join(' '),
                                fill: 'none',
                                stroke: stroke(onCurrentTrack),
                                strokeWidth: strokeWidth(onCurrentTrack)
                            }))
                        } else {
                            // Draw angled line

                            edges[method](h('polyline', {
                                key: tree.id + '-' + index + '-ep',
                                points: [
                                    [left, top],
                                    [left - gridSize, top - gridSize],
                                    [px * gridSize - cx, py * gridSize - cy]
                                ].map(z => z.join(',')).join(' '),
                                fill: 'none',
                                stroke: stroke(onCurrentTrack),
                                strokeWidth: strokeWidth(onCurrentTrack)
                            }))
                        }
                    }
                }

                // Render successor edges

                if (index < tree.nodes.length - 1) {
                    // Draw straight line

                    let current = onCurrentTrack && (index < tree.nodes.length - 1 || tree.current === 0)
                    let method = current ? 'unshift' : 'push'

                    edges[method](h('polyline', {
                        key: tree.id + '-' + index + '-es',
                        points: [
                            [left, top],
                            [left, top + gridSize]
                        ].map(z => z.join(',')).join(' '),
                        fill: 'none',
                        stroke: stroke(current),
                        strokeWidth: strokeWidth(current)
                    }))
                } else {
                    for (let subtree of tree.subtrees) {
                        let current = onCurrentTrack && tree.subtrees[tree.current] === subtree
                        let [nx, ny] = dict[subtree.id + '-0']
                        let method = current ? 'unshift' : 'push'

                        if (nx === x) {
                            // Draw straight line

                            edges[method](h('polyline', {
                                key: tree.id + '-' + index + '-es-' + subtree.id,
                                points: [
                                    [left, top],
                                    [nx * gridSize - cx, ny * gridSize - cy]
                                ].map(z => z.join(',')).join(' '),
                                fill: 'none',
                                stroke: stroke(current),
                                strokeWidth: strokeWidth(current)
                            }))
                        } else {
                            // Draw angled line

                            edges[method](h('polyline', {
                                key: tree.id + '-' + index + '-es-' + subtree.id,
                                points: [
                                    [left, top],
                                    [(nx - 1) * gridSize - cx, (ny - 1) * gridSize - cy],
                                    [nx * gridSize - cx, ny * gridSize - cy]
                                ].map(z => z.join(',')).join(' '),
                                fill: 'none',
                                stroke: stroke(current),
                                strokeWidth: strokeWidth(current)
                            }))
                        }
                    }
                }
            }
        }

        return [...edges, ...nodes]
    }

    render({height, treePosition}, {matrixDict, viewportSize}) {
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

            matrixDict && viewportSize && h('svg',
                {
                    width: viewportSize[0],
                    height: viewportSize[1],

                    onClick: this.handleNodeClick,
                    onContextMenu: this.handleNodeClick,
                    onMouseDown: this.handleGraphMouseDown,
                    onMouseUp: this.handleGraphMouseUp,
                    onMouseMove: this.handleGraphMouseMove
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
