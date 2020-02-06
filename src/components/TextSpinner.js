import EventEmitter from 'events'
import {h, Component} from 'preact'

const pulse = ((frame = 0) => {
  let pulse = new EventEmitter()

  pulse.setMaxListeners(Infinity)
  setInterval(() => {
    pulse.emit('tick', {frame})
    frame++
  }, 100)

  return pulse
})()

export class TextSpinner extends Component {
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
    pulse.on('tick', this.handleTick)
  }

  componentWillUnmount() {
    pulse.removeListener('tick', this.handleTick)
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
