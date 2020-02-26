import {h, Component} from 'preact'
import i18n from '../../i18n.js'
import sabaki from '../../modules/sabaki.js'
import {noop} from '../../modules/helper.js'
import Bar from './Bar.js'

const t = i18n.context('FindBar')

export default class FindBar extends Component {
  constructor() {
    super()

    this.handleChange = evt => {
      sabaki.setState({findText: evt.currentTarget.value})
    }

    this.handleButtonClick = evt => {
      evt.preventDefault()

      let step = evt.currentTarget.classList.contains('next') ? 1 : -1
      let {onButtonClick = noop} = this.props

      evt.step = step
      onButtonClick(evt)
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.mode !== this.props.mode) {
      if (this.props.mode === 'find') {
        this.inputElement.focus()
      } else {
        this.inputElement.blur()
      }
    }
  }

  render({findText}) {
    return h(
      Bar,
      Object.assign({type: 'find'}, this.props),
      h(
        'form',
        {},
        h('input', {
          ref: el => (this.inputElement = el),
          type: 'text',
          placeholder: t('Find'),
          value: findText,
          onInput: this.handleChange
        }),

        h(
          'button',
          {class: 'next', onClick: this.handleButtonClick},
          h('img', {
            src: './node_modules/@primer/octicons/build/svg/chevron-down.svg',
            height: 20,
            alt: t('Next')
          })
        ),
        h(
          'button',
          {class: 'prev', onClick: this.handleButtonClick},
          h('img', {
            src: './node_modules/@primer/octicons/build/svg/chevron-up.svg',
            height: 20,
            alt: t('Previous')
          })
        )
      )
    )
  }
}
