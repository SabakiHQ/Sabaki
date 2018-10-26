const {h, Component} = require('preact')
const gametree = require('../modules/gametree')
const helper = require('../modules/helper')

class WinrateGraph extends Component {
    constructor() {
        super()
    }

    shouldComponentUpdate(prevProps) {
        let prevNode = prevProps.treePosition[0].nodes[prevProps.treePosition[1]]
        let node = this.props.treePosition[0].nodes[this.props.treePosition[1]]

        return !helper.vertexEquals(prevProps.treePosition, this.props.treePosition)
            || prevNode.winrate !== node.winrate
    }

    render() {
        let rootTree = gametree.getRoot(...this.props.treePosition)
        let data = gametree.getCurrentTrack(rootTree).map(x => x.winrate)

        return h('section',
            {
                id: 'winrategraph'
            },

            h('svg',
                {
                    viewBox: '0 0 100 100',
                    preserveAspectRatio: 'none',
                    style: {height: '100%', width: '100%'}
                },

                h('path', {
                    stroke: '#eee',
                    'stroke-width': 2,
                    'vector-effect': 'non-scaling-stroke',

                    d: data.map((x, i) => {
                        if (x == null) return ''

                        let command = i === 0 || data[i - 1] == null ? 'M' : 'L'
                        return `${command} ${i * 100 / data.length},${x}`
                    }).join(' ')
                }),

                h('path', {
                    stroke: '#ccc',
                    'stroke-width': 2,
                    'vector-effect': 'non-scaling-stroke',
                    'stroke-dasharray': 3,

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

                        return `M ${lastIndex * 100 / data.length},${data[lastIndex]}`
                            + ` L ${i * 100 / data.length},${x}`
                    }).join(' ')
                })
            )
        )
    }
}

module.exports = WinrateGraph
