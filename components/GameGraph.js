const {h, Component} = require('preact')

const $ = require('../modules/sprint')
const gametree = require('../modules/gametree')
const helper = require('../modules/helper')
const setting = require('../modules/setting')

const Slider = require('./Slider')

class GameGraph extends Component {
    constructor() {
        super()

        this.state = {
            cameraPosition: null,
            viewportSize: null,
            matrixDict: null
        }
    }

    remeasure() {
        let $element = $(this.element)
        this.setState({viewportSize: [$element.width(), $element.height()].map(x => Math.round(x))})
    }

    componentDidMount() {
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

            this.setState({
                cameraPosition: [
                    x * gridSize + relX * diff - this.state.viewportSize[0] / 2,
                    y * gridSize - this.state.viewportSize[1] / 2
                ].map(z => Math.round(z)),
                matrixDict: [matrix, dict]
            })
        }, setting.get('graph.delay'))
    }

    componentDidUpdate({height}) {
        if (height === this.props.height) return

        setTimeout(() => this.remeasure(), 200)
    }

    renderNodes({
        matrixDict: [matrix, dict],
        cameraPosition: [cx, cy],
        viewportSize: [width, height]
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

        // Render only nodes that are visible

        for (let x = Math.ceil(cx / gridSize); x <= (cx + width) / gridSize + 1; x++) {
            for (let y = Math.ceil(cy / gridSize); y <= (cy + height) / gridSize + 1; y++) {
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

                if ('B' in node && node.B[0] === '' || 'W' in node && node.W[0] === '') {
                    // Render pass node

                    nodes.push(h('rect', {
                        x: x * gridSize - cx - nodeSize,
                        y: y * gridSize - cy - nodeSize,
                        width: nodeSize * 2,
                        height: nodeSize * 2,
                        fill
                    }))
                } else if (!('B' in node || 'W' in node)) {
                    // Render non-move node

                    nodes.push(h('rect', {
                        x: x * gridSize - cx - nodeSize,
                        y: y * gridSize - cy - nodeSize,
                        width: nodeSize * 2,
                        height: nodeSize * 2,
                        transform: `rotate(45 ${x * gridSize - cx} ${y * gridSize - cy})`,
                        fill
                    }))
                } else {
                    nodes.push(h('circle', {
                        cx: x * gridSize - cx,
                        cy: y * gridSize - cy,
                        r: nodeSize,
                        fill
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

                            edges[method](h('line', {
                                x1: x * gridSize - cx,
                                y1: y * gridSize - cy,
                                x2: px * gridSize - cx,
                                y2: py * gridSize - cy,
                                stroke: stroke(onCurrentTrack),
                                strokeWidth: strokeWidth(onCurrentTrack)
                            }))
                        } else {
                            // Draw angled line

                            edges[method](h('line', {
                                x1: x * gridSize - cx,
                                y1: y * gridSize - cy,
                                x2: (x - 1) * gridSize - cx,
                                y2: (y - 1) * gridSize - cy,
                                stroke: stroke(onCurrentTrack),
                                strokeWidth: strokeWidth(onCurrentTrack)
                            }))

                            edges[method](h('line', {
                                x1: px * gridSize - cx,
                                y1: py * gridSize - cy,
                                x2: (x - 1) * gridSize - cx,
                                y2: (y - 1) * gridSize - cy,
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

                    edges[method](h('line', {
                        x1: x * gridSize - cx,
                        y1: y * gridSize - cy,
                        x2: x * gridSize - cx,
                        y2: (y + 1) * gridSize - cy,
                        stroke: stroke(current),
                        strokeWidth: strokeWidth(current)
                    }))
                }

                if (index === tree.nodes.length - 1) {
                    for (let subtree of tree.subtrees) {
                        let current = onCurrentTrack && tree.subtrees[tree.current] === subtree
                        let [nx, ny] = dict[subtree.id + '-0']
                        let method = current ? 'unshift' : 'push'

                        if (nx === x) {
                            // Draw straight line

                            edges[method](h('line', {
                                x1: x * gridSize - cx,
                                y1: y * gridSize - cy,
                                x2: nx * gridSize - cx,
                                y2: ny * gridSize - cy,
                                stroke: stroke(current),
                                strokeWidth: strokeWidth(current)
                            }))
                        } else {
                            // Draw angled line

                            edges[method](h('line', {
                                x1: x * gridSize - cx,
                                y1: y * gridSize - cy,
                                x2: (nx - 1) * gridSize - cx,
                                y2: (ny - 1) * gridSize - cy,
                                stroke: stroke(current),
                                strokeWidth: strokeWidth(current)
                            }))

                            edges[method](h('line', {
                                x1: nx * gridSize - cx,
                                y1: ny * gridSize - cy,
                                x2: (nx - 1) * gridSize - cx,
                                y2: (ny - 1) * gridSize - cy,
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

    render({height, treePosition}, {cameraPosition, viewportSize}) {
        let [tree, index] = treePosition
        let rootTree = gametree.getRoot(tree)
        let level = gametree.getLevel(...treePosition)

        return h('section',
            {
                ref: el => this.element = el,
                id: 'graph',
                style: {height: height + '%'}
            },

            cameraPosition && viewportSize && h('svg',
                {
                    width: viewportSize[0],
                    height: viewportSize[1]
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
