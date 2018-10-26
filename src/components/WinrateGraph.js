const {h, Component} = require('preact')
const gametree = require('../modules/gametree')
const helper = require('../modules/helper')

class WinrateGraph extends Component {
    constructor() {
        super()
    }

    shouldComponentUpdate(nextProps) {
        let [tree, index] = nextProps.treePosition
        let node = tree.nodes[index]

        let result = !helper.vertexEquals(nextProps.treePosition, this.props.treePosition)
            || this.oldWinrate !== node.winrate

        this.oldWinrate = node.winrate

        return result
    }

    render() {
        let [tree, index] = this.props.treePosition
        let node = tree.nodes[index]
        let rootTree = gametree.getRoot(...this.props.treePosition)
        let width = Math.max(Math.ceil((gametree.getHeight(rootTree) - 1) / 50) * 50, 1)
        let currentTrack = gametree.getCurrentTrack(rootTree)
        let data = currentTrack.map(x => x.winrate)
        let currentIndex = currentTrack.indexOf(node)

        return h('section',
            {
                id: 'winrategraph'
            },

            h('svg',
                {
                    viewBox: `0 0 ${width} 100`,
                    preserveAspectRatio: 'none',
                    style: {height: '100%', width: '100%'}
                },

                // Draw guiding lines

                h('line', {
                    x1: 0,
                    y1: 50,
                    x2: width,
                    y2: 50,
                    stroke: '#aaa',
                    'stroke-width': 1,
                    'stroke-dasharray': 2,
                    'vector-effect': 'non-scaling-stroke'
                }),

                [...Array(width)].map((_, i) => {
                    if (i === 0 || i % 50 !== 0) return

                    return h('line', {
                        x1: i,
                        y1: 0,
                        x2: i,
                        y2: 100,
                        stroke: '#aaa',
                        'stroke-width': 1,
                        'stroke-dasharray': 2,
                        'vector-effect': 'non-scaling-stroke'
                    })
                }),

                // Current position marker

                h('line', {
                    x1: currentIndex,
                    y1: 0,
                    x2: currentIndex,
                    y2: 100,
                    stroke: '#0082F0',
                    'stroke-width': 2,
                    'vector-effect': 'non-scaling-stroke'
                }),

                // Draw data lines

                h('path', {
                    stroke: '#eee',
                    'stroke-width': 2,
                    'vector-effect': 'non-scaling-stroke',

                    d: data.map((x, i) => {
                        if (x == null) return ''

                        let command = i === 0 || data[i - 1] == null ? 'M' : 'L'
                        return `${command} ${i},${x}`
                    }).join(' ')
                }),

                h('path', {
                    stroke: '#ccc',
                    'stroke-width': 2,
                    'stroke-dasharray': 2,
                    'vector-effect': 'non-scaling-stroke',

                    d: data.map((x, i) => {
                        if (x == null || i === 0 || data[i - 1] != null) return

                        let lastIndex = null

                        for (let j = i - 1; j >= 0; j--) {
                            if (data[j] != null) {
                                lastIndex = j
                                break
                            }
                        }

                        if (lastIndex == null) return

                        return `M ${lastIndex},${data[lastIndex]}`
                            + ` L ${i},${x}`
                    }).join(' ')
                })
            )
        )
    }
}

module.exports = WinrateGraph
