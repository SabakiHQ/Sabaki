import * as remote from '@electron/remote'
import {h, Component} from 'preact'
import classNames from 'classnames'
import {parseVertex} from '@sabaki/sgf'

import sabaki from '../../modules/sabaki.js'
import i18n from '../../i18n.js'

import Bar from './Bar.js'

const t = i18n.context('AutoplayBar')
const setting = remote.require('./setting')

let maxSecPerMove = setting.get('autoplay.max_sec_per_move')
let secondsPerMove = setting.get('autoplay.sec_per_move')

export default class AutoplayBar extends Component {
  constructor() {
    super()

    this.state = {
      playing: false,
      secondsPerMove,
      secondsPerMoveInput: secondsPerMove
    }

    this.handleFormSubmit = evt => {
      evt.preventDefault()
    }

    this.handleValueInput = evt => {
      this.setState({secondsPerMoveInput: evt.currentTarget.value})
    }

    this.handleValueChange = evt => {
      let value = Math.round(
        Math.min(maxSecPerMove, Math.max(1, +evt.currentTarget.value))
      )

      if (!isNaN(value)) {
        this.setState({
          secondsPerMove: value,
          secondsPerMoveInput: value
        })
      }

      setting.set('autoplay.sec_per_move', this.state.secondsPerMove)
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

      let {gameTree, gameCurrents, treePosition} = this.props
      let node = gameTree.navigate(treePosition, 1, gameCurrents)
      if (!node) return this.stopAutoplay()

      if (node.data.B == null && node.data.W == null) {
        sabaki.setCurrentTreePosition(gameTree, treePosition)
      } else {
        let vertex = parseVertex(
          node.data.B != null ? node.data.B[0] : node.data.W[0]
        )
        sabaki.makeMove(vertex, {player: node.data.B ? 1 : -1})
      }

      sabaki.events.addListener('navigate', this.stopAutoplay)
      this.autoplayId = setTimeout(autoplay, this.state.secondsPerMove * 1000)
    }

    this.setState({playing: true}, autoplay)
  }

  stopAutoplay() {
    sabaki.events.removeListener('navigate', this.stopAutoplay)
    clearTimeout(this.autoplayId)

    this.setState({playing: false})
  }

  render(_, {secondsPerMoveInput, playing}) {
    return h(
      Bar,
      Object.assign(
        {type: 'autoplay', class: classNames({playing})},
        this.props
      ),
      h(
        'form',
        {onSubmit: this.handleFormSubmit},
        h(
          'label',
          {},
          h('input', {
            type: 'number',
            value: secondsPerMoveInput,
            min: 1,
            max: maxSecPerMove,
            step: 1,

            onInput: this.handleValueInput,
            onChange: this.handleValueChange
          }),
          ' ',
          t('sec per move')
        )
      ),

      h('a', {class: 'play', href: '#', onClick: this.handlePlayButtonClick})
    )
  }
}
