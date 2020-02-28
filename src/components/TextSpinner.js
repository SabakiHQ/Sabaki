import EventEmitter from 'events'
import {h, Component} from 'preact'

let pulse

function getPulse() {
  if (pulse == null) {
    let frame = 0
    let m = 8 * 9 * 5 * 7 * 11

    pulse = new EventEmitter()
    pulse.setMaxListeners(Infinity)

    setInterval(() => {
      pulse.emit('tick', {frame})
      frame = (frame + 1) % m
    }, 100)
  }

  return pulse
}

export default class TextSpinner extends Component {
  constructor(props) {
    super(props)

    this.state = {
      frame: 0
    }

    this.handleTick = evt => {
      this.setState({frame: evt.frame})
    }
  }

  componentDidMount() {
    getPulse().on('tick', this.handleTick)
  }

  componentWillUnmount() {
    getPulse().removeListener('tick', this.handleTick)
  }

  render() {
    let {enabled = true, frames = '-\\|/'} = this.props

    return h(
      'span',
      {class: 'text-spinner'},
      !enabled ? '' : frames[this.state.frame % frames.length]
    )
  }
}
