const {h, Component} = require('preact')
const helper = require('../modules/helper')

class WinrateGraph extends Component {
    constructor() {
        super()

        this.handleMouseDown = evt => {
            this.mouseDown = true
            document.dispatchEvent(new MouseEvent('mousemove', evt))
        }
    }

    shouldComponentUpdate({width, currentIndex, data}) {
        return width !== this.props.width
            || currentIndex !== this.props.currentIndex
            || data[currentIndex] !== this.props.data[currentIndex]
    }

    componentDidMount() {
        document.addEventListener('mousemove', evt => {
            if (!this.mouseDown) return

            let rect = this.element.getBoundingClientRect()
            let percent = (evt.clientX - rect.left) / rect.width
            let {width, data, onCurrentIndexChange = helper.noop} = this.props
            let index = Math.max(Math.min(Math.round(width * percent), data.length - 1), 0)

            if (index !== this.props.currentIndex) onCurrentIndexChange({index})
        })

        document.addEventListener('mouseup', () => {
            this.mouseDown = false
        })
    }

    render({width, currentIndex, data}) {
        return h('section',
            {
                ref: el => this.element = el,
                id: 'winrategraph',
                onMouseDown: this.handleMouseDown
            },

            h('svg',
                {
                    viewBox: `0 0 ${width} 100`,
                    preserveAspectRatio: 'none',
                    style: {height: '100%', width: '100%'}
                },

                // Draw background

                h('defs', {},
                    h('linearGradient', {id: 'bgGradient', x1: 0, y1: 0, x2: 0, y2: 1},
                        h('stop', {
                            offset: '0%',
                            'stop-color': 'white',
                            'stop-opacity': 0.7
                        }),
                        h('stop', {
                            offset: '100%',
                            'stop-color': 'white',
                            'stop-opacity': 0.1
                        })
                    ),

                    h('clipPath', {id: 'clipGradient'},
                        h('path', {
                            fill: 'black',
                            'stroke-width': 0,
                            d: (() => {
                                let instructions = data.map((x, i) => {
                                    if (x == null) return null
                                    return [i, x]
                                }).filter(x => x != null)

                                if (instructions.length === 0) return ''

                                return `M ${instructions[0][0]},100 `
                                    + instructions.map(x => `L ${x.join(',')}`).join(' ')
                                    + ` L ${instructions.slice(-1)[0][0]},100 Z`
                            })()
                        })
                    )
                ),

                h('rect', {
                    x: 0,
                    y: 0,
                    width,
                    height: 100,
                    fill: 'url(#bgGradient)',
                    'clip-path': 'url(#clipGradient)'
                }),

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
                    fill: 'none',
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
                    fill: 'none',
                    'stroke-width': 2,
                    'stroke-dasharray': 2,
                    'vector-effect': 'non-scaling-stroke',

                    d: data.map((x, i) => {
                        if (i === 0) return ''

                        if (x == null && data[i - 1] != null)
                            return `M ${i - 1},${data[i - 1]}`

                        if (x != null && data[i - 1] == null)
                            return `L ${i},${x}`

                        return ''
                    }).join(' ')
                })
            )
        )
    }
}

module.exports = WinrateGraph
