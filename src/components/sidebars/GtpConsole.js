const {h, Component} = require('preact')
const classNames = require('classnames')
const {Command} = require('@sabaki/gtp')

const ContentDisplay = require('../ContentDisplay')
const {TextSpinner} = require('../TextSpinner')
const helper = require('../../modules/helper')

class ConsoleCommandEntry extends Component {
    shouldComponentUpdate({sign, name, command}) {
        return sign !== this.props.sign
            || name !== this.props.name
            || command !== this.props.command
    }

    render({sign, name, command}) {
        if (command == null) command = {name: ''}
        if (sign == null) sign = 0

        return h('li', {class: 'command'},
            h('pre', {},
                h('span', {class: 'internal'}, `${['●', '', '○'][sign + 1]} ${name}>`), ' ',

                command.id != null && [h('span', {class: 'id'}, command.id), ' '],
                command.name, ' ',

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
        return waiting !== this.props.waiting
            || response !== this.props.response
    }

    render({response, waiting}) {
        return h('li', {class: classNames({response: true, waiting})},
            response != null

            ? h('pre', {},
                !response.internal && [h('span', {
                    class: response.error ? 'error' : 'success'
                }, response.error ? '?' : '=')],

                response.id != null && [h('span', {class: 'id'}, response.id)],

                !response.internal && ' ',

                h(ContentDisplay, {
                    tag: 'span',
                    class: response.internal ? 'internal' : '',
                    content: response.content.replace(/(^info move.*\s*)+/gm, 'info move (…)\n')
                }),

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

                let {engineIndex, onSubmit = helper.noop} = this.props
                let {commandInputText} = this.state

                if (commandInputText.trim() === '') return

                onSubmit({
                    engineIndex,
                    command: Command.fromString(commandInputText)
                })

                this.inputPointer = null
                this.setState({commandInputText: ''})
            } else if (['ArrowUp', 'ArrowDown'].includes(evt.key)) {
                evt.preventDefault()
                let {consoleLog} = this.props
                let sign = evt.key === 'ArrowUp' ? -1 : 1

                if (this.inputPointer == null) this.inputPointer = consoleLog.length

                while (true) {
                    this.inputPointer += sign

                    if (this.inputPointer < 0 || this.inputPointer >= consoleLog.length) {
                        this.inputPointer = Math.max(-1, Math.min(consoleLog.length, this.inputPointer))
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
                    if (this.inputAutocompleteElement.scrollLeft !== this.inputElement.scrollLeft) {
                        this.inputAutocompleteElement.scrollLeft = this.inputElement.scrollLeft
                    }
                }, 0)
            })
        }
    }

    get autocompleteText() {
        let {engineIndex, attachedEngines} = this.props
        let {commandInputText} = this.state

        if (attachedEngines[engineIndex] && commandInputText.length > 0) {
            return attachedEngines[engineIndex].commands
                .find(x => x.indexOf(commandInputText) === 0) || ''
        }

        return ''
    }

    render({engineIndex, attachedEngines}, {commandInputText}) {
        let hasEngines = attachedEngines.length > 0
        let selectedEngine = attachedEngines[engineIndex]
        let selectWidth = Math.max(
            5,
            selectedEngine ? selectedEngine.name.trim().length + 3 : 3
        ) * 10 + 15
        let inputStyle = {left: selectWidth, width: `calc(100% - ${selectWidth}px)`}

        return h('form', {class: 'input'},
            h('select',
                {
                    disabled: !hasEngines || attachedEngines.length === 1,
                    style: {width: selectWidth},

                    onChange: this.props.onSelectChange
                },

                attachedEngines.map((engine, i) =>
                    h('option', {
                        value: i,
                        selected: engineIndex === i
                    }, `${engine.name.trim()}>`)
                )
            ),

            h('input', {
                ref: el => this.inputElement = el,
                class: 'command',
                disabled: !hasEngines,
                type: 'text',
                value: commandInputText,
                style: inputStyle,

                onInput: this.handleInputChange,
                onKeyDown: this.handleKeyDown
            }),

            h('input', {
                ref: el => this.inputAutocompleteElement = el,
                class: 'autocomplete',
                disabled: !hasEngines,
                type: 'text',
                value: this.autocompleteText,
                style: inputStyle
            })
        )
    }
}

class GtpConsole extends Component {
    constructor() {
        super()

        this.scrollToBottom = true

        this.state = {
            engineIndex: -1
        }

        this.handleSelectChange = evt => {
            this.setState({engineIndex: +evt.currentTarget.value})
            this.inputElement.focus()
        }
    }

    componentWillReceiveProps({consoleLog, attachedEngines}) {
        let {engineIndex} = this.state

        if (attachedEngines[engineIndex] == null) {
            let index = attachedEngines.findIndex(x => x != null)
            if (engineIndex !== index) this.setState({engineIndex: index})
        }

        this.inputPointer = consoleLog.length
    }

    componentWillUpdate() {
        let {scrollTop, scrollHeight, offsetHeight} = this.scrollElement

        this.scrollToBottom = scrollTop >= scrollHeight - offsetHeight
    }

    componentDidUpdate(prevProps) {
        if (!prevProps.show && this.props.show || this.scrollToBottom) {
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

    render({consoleLog, attachedEngines, engineCommands}, {engineIndex}) {
        return h('section', {id: 'console'},
            h('ol',
                {
                    ref: el => this.scrollElement = el,
                    class: 'log'
                },

                consoleLog.map(({name, command, response, waiting}, i) => {
                    let sign = this.getSign(command)

                    return [
                        command || (
                            i === 0
                            || consoleLog[i - 1].name !== name
                            || sign !== 0 && consoleLog[i - 1].sign !== sign
                        ) ? h(ConsoleCommandEntry, {sign, name, command})
                        : null,

                        h(ConsoleResponseEntry, {response, waiting: response == null || waiting})
                    ]
                })
            ),

            h(ConsoleInput, {
                ref: component => this.inputElement = component.inputElement,

                consoleLog,
                attachedEngines,
                engineCommands,
                engineIndex,

                onSelectChange: this.handleSelectChange,
                onSubmit: this.props.onSubmit
            })
        )
    }
}

module.exports = GtpConsole
