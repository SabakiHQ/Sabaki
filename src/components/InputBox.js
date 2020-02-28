import {h, Component} from 'preact'
import classNames from 'classnames'

import sabaki from '../modules/sabaki.js'
import {noop} from '../modules/helper.js'

export default class InputBox extends Component {
  constructor() {
    super()

    this.state = {value: ''}

    this.handleInput = evt => this.setState({value: evt.currentTarget.value})
    this.stopPropagation = evt => evt.stopPropagation()

    this.handleKeyUp = evt => {
      if (!this.props.show) return

      if (evt.key === 'Escape') {
        evt.stopPropagation()
        this.cancel()
      } else if (evt.key == 'Enter') {
        evt.stopPropagation()
        sabaki.setState({showInputBox: false})

        let {onSubmit = noop} = this.props
        onSubmit(this.state)

        if (document.activeElement === this.inputElement)
          this.inputElement.blur()
      }
    }

    this.cancel = this.cancel.bind(this)
  }

  shouldComponentUpdate({show, text, onSubmit, onCancel}) {
    return (
      show !== this.props.show ||
      text !== this.props.text ||
      onSubmit !== this.props.onSubmit ||
      onCancel !== this.props.onCancel
    )
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.show && !this.props.show) {
      this.setState({value: ''})
    }
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.show && this.props.show) {
      this.inputElement.focus()
    }
  }

  cancel() {
    if (!this.props.show) return

    if (document.activeElement === this.inputElement) this.inputElement.blur()

    let {onCancel = noop} = this.props
    sabaki.setState({showInputBox: false})
    onCancel()
  }

  render({show, text}, {value}) {
    return h(
      'section',
      {
        id: 'input-box',
        class: classNames({show}),

        onClick: this.cancel
      },

      h(
        'div',
        {class: 'inner', onClick: this.stopPropagation},
        h('input', {
          ref: el => (this.inputElement = el),
          type: 'text',
          name: 'input',
          value,
          placeholder: text,

          onInput: this.handleInput,
          onKeyUp: this.handleKeyUp,
          onBlur: this.cancel
        })
      )
    )
  }
}
