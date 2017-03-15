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
        this.setState({viewportSize: [$element.width(), $element.height()]})
    }

    componentDidMount() {
        window.addEventListener('resize', () => {
            this.remeasure()
        })

        this.remeasure()
        this.componentWillReceiveProps(this.props)
    }

    componentWillReceiveProps({treePosition}) {
        let [tree, index] = treePosition
        let [matrix, dict] = gametree.getMatrixDict(gametree.getRoot(tree))
        let gridSize = setting.get('graph.grid_size')

        let id = tree.id + '-' + index
        let [x, y] = dict[id]
        let [width, padding] = gametree.getMatrixWidth(y, matrix)
        x -= padding

        let relX = width == 1 ? 1 : 1 - 2 * x / (width - 1)
        let diff = (width - 1) * gridSize / 2
        diff = Math.min(diff, this.state.viewportSize[0] / 2 - gridSize)

        this.setState({
            cameraPosition: [
                x * gridSize + relX * diff - this.state.viewportSize[0] / 2,
                y * gridSize - this.state.viewportSize[1] / 2
            ],
            matrixDict: [matrix, dict]
        })
    }

    componentDidUpdate({height}) {
        if (height === this.props.height) return

        this.remeasure()
    }

    renderNodes({matrixDict: [matrix, dict], cameraPosition: [cx, cy], viewportSize: [width, height]}) {
        let nodes = []
        let edges = []

        let gridSize = setting.get('graph.grid_size')
        let nodeSize = setting.get('graph.node_size')
        let commentProperties = setting.get('sgf.comment_properties')

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

                // Render precedent edges

                if (!tree.parent && index === 0) continue

                let stroke = onCurrentTrack ? setting.get('graph.edge_color')
                    : setting.get('graph.edge_inactive_color')
                let strokeWidth = onCurrentTrack ? setting.get('graph.edge_size')
                    : setting.get('graph.edge_inactive_size')

                if (index > 0 || tree.parent && tree.parent.subtrees.indexOf(tree) === 0) {
                    // Draw straight line

                    edges.push(h('line', {
                        x1: x * gridSize - cx,
                        y1: y * gridSize - cy,
                        x2: x * gridSize - cx,
                        y2: (y - 1) * gridSize - cy,
                        stroke,
                        strokeWidth
                    }))
                } else {
                    // Draw angled line

                    edges.push(h('line', {
                        x1: x * gridSize - cx,
                        y1: y * gridSize - cy,
                        x2: (x - 1) * gridSize - cx,
                        y2: (y - 1) * gridSize - cy,
                        stroke,
                        strokeWidth
                    }))

                    let precedentId = tree.parent.id + '-' + (tree.parent.nodes.length - 1)
                    let [px, py] = dict[precedentId]

                    edges.push(h('line', {
                        x1: px * gridSize - cx,
                        y1: py * gridSize - cy,
                        x2: (x - 1) * gridSize - cx,
                        y2: (y - 1) * gridSize - cy,
                        stroke,
                        strokeWidth
                    }))
                }
            }
        }

        return [...edges, ...nodes]
    }

    render({height, treePosition}, {matrixDict, cameraPosition, viewportSize}) {
        let [tree, index] = treePosition
        let rootTree = gametree.getRoot(tree)
        let level = gametree.getLevel(...treePosition)

        return h('section',
            {
                ref: el => this.element = el,
                id: 'graph',
                style: {height: height + '%'}
            },

            viewportSize && cameraPosition && h('svg',
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
