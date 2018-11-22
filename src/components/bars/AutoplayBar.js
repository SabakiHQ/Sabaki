// TODO

const {remote} = require('electron')
const {h, Component} = require('preact')
const classNames = require('classnames')
const sgf = require('@sabaki/sgf')

const Bar = require('./Bar')

const gametree = require('../../modules/gametree')
const setting = remote.require('./setting')

let maxSecPerMove = setting.get('autoplay.max_sec_per_move')

class AutoplayBar extends Component {
    constructor() {
        super()

        this.state = {
            playing: false,
            secondsPerMove: setting.get('autoplay.sec_per_move')
        }

        this.handleFormSubmit = evt => {
            evt.preventDefault()
        }

        this.handleValueChange = evt => {
            let value = Math.round(Math.min(maxSecPerMove, Math.max(1, +evt.currentTarget.value)))

            this.setState({secondsPerMove: value})
            setting.set('autoplay.sec_per_move', value)
        }

        this.handlePlayButtonClick = () => {
            if (this.state.playing) this.stopAutoplay()
            else this.startAutoplay()
        }

        this.startAutoplay = this.startAutoplay.bind(this)
        this.stopAutoplay = this.stopAutoplay.bind(this)
    }

    shouldComponentUpdate(nextProps) {
        return nextProps.mode !== this.props.mode || nextProps.mode === 'autoplay'
    }

    componentWillReceiveProps(nextProps) {
        if (this.state.playing && nextProps.mode !== 'autoplay') this.stopAutoplay()
    }

    startAutoplay() {
        let autoplay = () => {
            sabaki.events.removeListener('navigate', this.stopAutoplay)

            if (!this.state.playing) return

            let tp = gametree.navigate(...this.props.treePosition, 1)
            if (!tp) return this.stopAutoplay()

            let node = tp[0].nodes[tp[1]]

            if (!node.B && !node.W) {
                sabaki.setCurrentTreePosition(...tp)
            } else {
                let vertex = sgf.parseVertex(node.B ? node.B[0] : node.W[0])
                sabaki.makeMove(vertex, {player: node.B ? 1 : -1})
            }

            sabaki.events.addListener('navigate', this.stopAutoplay)
            this.autoplayId = setTimeout(autoplay, this.state.secondsPerMove * 1000)
        }

        this.setState({playing: true})
        autoplay()
    }

    stopAutoplay() {
        sabaki.events.removeListener('navigate', this.stopAutoplay)
        clearTimeout(this.autoplayId)

        this.setState({playing: false})
    }

    render(_, {
        secondsPerMove,
        playing
    }) {
        return h(Bar, Object.assign({type: 'autoplay', class: classNames({playing})}, this.props),
            h('form', {onSubmit: this.handleFormSubmit},
                h('label', {},
                    h('input', {
                        type: 'number',
                        name: 'duration',
                        value: secondsPerMove,
                        min: 1,
                        max: maxSecPerMove,
                        step: 1,

                        onChange: this.handleValueChange
                    }),
                    ' sec per move'
                )
            ),

            h('a', {class: 'play', href: '#', onClick: this.handlePlayButtonClick})
        )
    }
}

module.exports = AutoplayBar
