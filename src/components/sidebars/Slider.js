import * as remote from '@electron/remote'
import {h, Component} from 'preact'
import * as helper from '../../modules/helper.js'

const setting = remote.require('./setting')

class Slider extends Component {
  constructor() {
    super()

    this.handleSliderAreaMouseDown = evt => {
      if (evt.button !== 0) return

      this.sliderAreaMouseDown = true
      document.dispatchEvent(new MouseEvent('mousemove', evt))
    }

    this.handleButtonMouseDown = evt => {
      if (evt.button !== 0) return

      let type = evt.currentTarget.className
      let {onStartAutoscrolling = helper.noop} = this.props

      this.buttonMouseDown = type
      onStartAutoscrolling({step: type === 'prev' ? -1 : 1})
    }
  }

  componentDidMount() {
    document.addEventListener('mouseup', () => {
      this.sliderAreaMouseDown = false

      if (this.buttonMouseDown != null) {
        let type = this.buttonMouseDown
        let {onStopAutoscrolling = helper.noop} = this.props

        this.buttonMouseDown = null
        onStopAutoscrolling({step: type === 'prev' ? -1 : 1})
      }
    })

    document.addEventListener('mousemove', evt => {
      if (!this.sliderAreaMouseDown) return

      let {onChange = helper.noop} = this.props
      let {top, height} = this.slidingAreaElement.getBoundingClientRect()
      let percent = Math.min(1, Math.max(0, (evt.clientY - top) / height))

      onChange({percent})
    })
  }

  shouldComponentUpdate({showSlider}) {
    return (
      showSlider &&
      (this.sliderAreaMouseDown || this.buttonMouseDown || !this.dirty)
    )
  }

  componentWillReceiveProps() {
    // Debounce rendering

    this.dirty = true

    clearTimeout(this.renderId)
    this.renderId = setTimeout(() => {
      this.dirty = false
      this.setState(this.state)
    }, setting.get('graph.delay'))
  }

  render({text, percent}) {
    return h(
      'section',
      {id: 'slider'},
      h(
        'a',
        {
          href: '#',
          class: 'prev',
          onMouseDown: this.handleButtonMouseDown
        },
        '▲'
      ),

      h(
        'a',
        {
          href: '#',
          class: 'next',
          onMouseDown: this.handleButtonMouseDown
        },
        '▼'
      ),

      h(
        'div',
        {
          ref: el => (this.slidingAreaElement = el),
          class: 'inner',
          onMouseDown: this.handleSliderAreaMouseDown
        },

        h('span', {style: {top: percent + '%'}}, text)
      )
    )
  }
}

export default Slider
