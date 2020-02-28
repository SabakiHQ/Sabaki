import {h, Component} from 'preact'
import classNames from 'classnames'
import {Command} from '@sabaki/gtp'

import sabaki from '../../modules/sabaki.js'
import ContentDisplay from '../ContentDisplay.js'
import TextSpinner from '../TextSpinner.js'
import {noop, popupMenu} from '../../modules/helper.js'
import i18n from '../../i18n.js'

class ConsoleCommandEntry extends Component {
  shouldComponentUpdate({sign, name, command}) {
    return (
      sign !== this.props.sign ||
      name !== this.props.name ||
      command !== this.props.command
    )
  }

  render({sign, name, command}) {
    if (command == null) command = {name: ''}
    if (sign == null) sign = 0

    return h(
      'li',
      {class: 'command'},
      h(
        'pre',
        {},
        h('span', {class: 'engine'}, `${['● ', '', '○ '][sign + 1]}${name}>`),
        ' ',

        command.id != null && [h('span', {class: 'id'}, command.id), ' '],
        command.name,
        ' ',

        h(ContentDisplay, {
          tag: 'span',
          content: (command.args || []).join(' ')
        })
      )
    )
  }
}

class ConsoleResponseEntry extends Component {
  shouldComponentUpdate({response, waiting}) {
    return waiting !== this.props.waiting || response !== this.props.response
  }

  render({response, waiting}) {
    return h(
      'li',
      {class: classNames({response: true, waiting})},
      response != null
        ? h(
            'pre',
            {},
            !response.internal && [
              h(
                'span',
                {
                  class: response.error ? 'error' : 'success'
                },
                response.error ? '?' : '='
              )
            ],

            response.id != null && [h('span', {class: 'id'}, response.id)],

            !response.internal && ' ',

            typeof response.content === 'string'
              ? h(ContentDisplay, {
                  tag: 'span',
                  class: response.internal ? 'internal' : '',
                  content: response.content.replace(
                    /(^info move.*\s*)+/gm,
                    'info move (…)\n'
                  )
                })
              : response.content,

            waiting && h('div', {class: 'internal'}, h(TextSpinner))
          )
        : h('pre', {}, h('span', {class: 'internal'}, h(TextSpinner)))
    )
  }
}

class ConsoleInput extends Component {
  constructor(props) {
    super(props)

    this.state = {
      commandInputText: ''
    }

    this.handleInputChange = evt => {
      this.setState({commandInputText: evt.currentTarget.value})
    }

    this.handleKeyDown = evt => {
      if (evt.key === 'Enter') {
        evt.preventDefault()

        let {onSubmit = noop} = this.props
        let {commandInputText} = this.state

        if (commandInputText.trim() === '') return

        onSubmit({
          command: Command.fromString(commandInputText)
        })

        this.inputPointer = null
        this.setState({commandInputText: ''})
      } else if (['ArrowUp', 'ArrowDown'].includes(evt.key) && !evt.ctrlKey) {
        evt.preventDefault()

        let {consoleLog} = this.props
        let sign = evt.key === 'ArrowUp' ? -1 : 1

        if (this.inputPointer == null) this.inputPointer = consoleLog.length

        while (true) {
          this.inputPointer += sign

          if (this.inputPointer < 0 || this.inputPointer >= consoleLog.length) {
            this.inputPointer = Math.max(
              -1,
              Math.min(consoleLog.length, this.inputPointer)
            )
            this.setState({commandInputText: ''})
            break
          }

          let {command} = consoleLog[this.inputPointer]

          if (command != null) {
            let text = Command.toString(command)

            this.setState({commandInputText: text})

            break
          }
        }
      } else if (['ArrowUp', 'ArrowDown'].includes(evt.key) && evt.ctrlKey) {
        let {onControlStep = noop} = this.props
        let step = evt.key === 'ArrowUp' ? -1 : 1

        onControlStep({step})
      } else if (evt.key === 'Tab') {
        evt.preventDefault()

        if (this.autocompleteText !== '') {
          this.setState({commandInputText: this.autocompleteText})
        }
      }

      this.setState({}, () => {
        if (['Enter', 'ArrowUp', 'ArrowDown', 'Tab'].includes(evt.key)) {
          this.inputElement.scrollLeft = this.inputElement.scrollWidth
          this.inputElement.selectionStart = this.inputElement.value.length
          this.inputElement.selectionEnd = this.inputElement.value.length
        }

        setTimeout(() => {
          if (
            this.inputAutocompleteElement.scrollLeft !==
            this.inputElement.scrollLeft
          ) {
            this.inputAutocompleteElement.scrollLeft = this.inputElement.scrollLeft
          }
        }, 0)
      })
    }
  }

  get autocompleteText() {
    let {attachedEngine} = this.props
    let {commandInputText} = this.state

    if (attachedEngine && commandInputText.length > 0) {
      return (
        attachedEngine.commands.find(x => x.indexOf(commandInputText) === 0) ||
        ''
      )
    }

    return ''
  }

  render({attachedEngine}, {commandInputText}) {
    let disabled = attachedEngine == null

    return h(
      'form',
      {class: 'input'},
      h('input', {
        ref: el => (this.inputElement = el),
        class: 'command',
        disabled,
        type: 'text',
        value: commandInputText,
        placeholder: attachedEngine != null ? `${attachedEngine.name}>` : '',

        onInput: this.handleInputChange,
        onKeyDown: this.handleKeyDown
      }),

      h('input', {
        ref: el => (this.inputAutocompleteElement = el),
        class: 'autocomplete',
        disabled,
        type: 'text',
        value: this.autocompleteText
      })
    )
  }
}

export default class GtpConsole extends Component {
  constructor() {
    super()

    this.scrollToBottom = true

    this.handleContextMenu = evt => {
      let t = i18n.context('menu.engines')

      popupMenu(
        [
          {
            label: t('&Clear Console'),
            click: () => sabaki.clearConsole()
          }
        ],
        evt.clientX,
        evt.clientY
      )
    }
  }

  componentWillReceiveProps({consoleLog}) {
    this.inputPointer = consoleLog.length
  }

  componentWillUpdate() {
    let {scrollTop, scrollHeight, offsetHeight} = this.scrollElement

    this.scrollToBottom = scrollTop >= scrollHeight - offsetHeight
  }

  componentDidUpdate(prevProps) {
    if ((!prevProps.show && this.props.show) || this.scrollToBottom) {
      this.scrollElement.scrollTop = this.scrollElement.scrollHeight
    }
  }

  getSign(command) {
    if (!command) return 0

    for (let arg of command.args) {
      if (['b', 'black'].includes(arg.toLowerCase())) {
        return 1
      } else if (['w', 'white'].includes(arg.toLowerCase())) {
        return -1
      }
    }

    return 0
  }

  render({consoleLog, attachedEngine}) {
    return h(
      'section',
      {class: 'gtp-console'},

      h(
        'ol',
        {
          ref: el => (this.scrollElement = el),
          class: 'log',
          onContextMenu: this.handleContextMenu
        },

        consoleLog.map(({name, command, response, waiting}, i) => {
          let sign = this.getSign(command)

          return [
            command ||
            i === 0 ||
            consoleLog[i - 1].name !== name ||
            (sign !== 0 && consoleLog[i - 1].sign !== sign)
              ? h(ConsoleCommandEntry, {sign, name, command})
              : null,

            h(ConsoleResponseEntry, {
              response,
              waiting: response == null || waiting
            })
          ]
        })
      ),

      h(ConsoleInput, {
        ref: component =>
          (this.inputElement =
            component == null ? null : component.inputElement),

        consoleLog,
        attachedEngine,

        onSubmit: this.props.onSubmit,
        onControlStep: this.props.onControlStep
      })
    )
  }
}
