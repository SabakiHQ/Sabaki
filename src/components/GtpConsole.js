const {remote} = require('electron')
const {h, Component} = require('preact')
const classNames = require('classnames')

const ContentDisplay = require('./ContentDisplay')

const gtp = require('../modules/gtp')
const helper = require('../modules/helper')
const setting = remote.require('./setting')

class ConsoleCommandEntry extends Component {
    shouldComponentUpdate() {
        return false
    }

    render({board, sign, name, command}) {
        return h('li', {class: 'command'},
            h('pre', {},
                h('span', {class: 'internal'}, `${['●', '', '○'][sign + 1]} ${name}>`), ' ',

                command.id != null && [h('span', {class: 'id'}, command.id), ' '],
                command.name, ' ',

                h(ContentDisplay, {
                    tag: 'span',
                    board,
                    dangerouslySetInnerHTML: {
                        __html: helper.htmlify(command.arguments.join(' ')
                            .replace(/</g, '&lt;').replace(/>/g, '&gt;'))
                    }
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

    render({board, response, waiting}) {
        return h('li', {class: classNames({response: true, waiting})},
            !waiting && response != null

            ? h('pre', {},
                !response.internal && [h('span', {
                    class: response.error ? 'error' : 'success'
                }, response.error ? '?' : '='), ' '],

                response.id != null && [h('span', {class: 'id'}, response.id), ' '],

                h(ContentDisplay, {
                    tag: 'span',
                    class: response.internal ? 'internal' : '',
                    board,
                    dangerouslySetInnerHTML: {
                        __html: helper.htmlify(response.content
                            .replace(/</g, '&lt;').replace(/>/g, '&gt;'))
                    }
                })
            )

            : h('pre', {}, h('span', {class: 'internal'}, '…'))
        )
    }
}

class GtpConsole extends Component {
    constructor() {
        super()

        this.state = {
            engineIndex: -1,
            commandInputText: ''
        }

        this.handleSelectChange = evt => {
            this.setState({engineIndex: +evt.currentTarget.value})
            this.inputElement.focus()
        }

        this.handleInputChange = evt => {
            this.setState({commandInputText: evt.currentTarget.value})
        }

        this.handleKeyDown = evt => {
            if (evt.keyCode === 13) {
                // Enter

                evt.preventDefault()
                let {onSubmit = helper.noop} = this.props
                let {engineIndex, commandInputText} = this.state

                if (commandInputText.trim() === '') return

                onSubmit({
                    engineIndex,
                    command: gtp.parseCommand(this.state.commandInputText)
                })

                this.setState({commandInputText: ''})
            } else if ([38, 40].includes(evt.keyCode)) {
                // Up and down

                evt.preventDefault()
                let sign = evt.keyCode === 38 ? -1 : 1

                if (this.inputPointer == null) this.inputPointer = this.props.consoleLog.length
                this.inputPointer = Math.min(this.props.consoleLog.length, Math.max(0, this.inputPointer + sign))

                let command = (this.props.consoleLog[this.inputPointer] || [])[2]
                this.setState({commandInputText: command ? command.toString() : ''})
            } else if (evt.keyCode === 9) {
                // Tab

                evt.preventDefault()
                let autocompleteText = this.getAutocompleteText()

                if (autocompleteText !== '') {
                    this.setState({commandInputText: autocompleteText})
                }
            }
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

    componentDidUpdate(prevProps) {
        if (prevProps.consoleLog !== this.props.consoleLog) {
            this.scrollElement.scrollTop = this.scrollElement.scrollHeight
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        for (let key in nextProps) {
            if (nextProps[key] !== this.props[key]) return true
        }

        for (let key in nextState) {
            if (nextState[key] !== this.state[key]) return true
        }

        return false
    }

    getAutocompleteText() {
        let {engineCommands} = this.props
        let {engineIndex, commandInputText} = this.state

        if (engineCommands[engineIndex] && commandInputText.length > 0) {
            return engineCommands[engineIndex].find(x => x.indexOf(commandInputText) === 0)
        }

        return ''
    }

    render({board, consoleLog, attachedEngines, engineCommands}, {engineIndex, commandInputText}) {
        let selectedEngine = attachedEngines[engineIndex]
        let selectWidth = Math.max(5, selectedEngine ? selectedEngine.name.trim().length + 3 : 3) * 10 + 15
        let hasEngines = attachedEngines.some(x => x != null)
        let autocompleteText = this.getAutocompleteText()
        let inputStyle = {left: selectWidth, width: `calc(100% - ${selectWidth}px)`}

        return h('section', {id: 'console'},
            h('ol',
                {
                    ref: el => this.scrollElement = el,
                    class: 'log'
                },

                consoleLog.map(([sign, name, command, response], i) => [
                    command
                    ? h(ConsoleCommandEntry, {key: command.internalId, board, sign, name, command})
                    : !command && (i == 0 || !helper.shallowEquals([sign, name], consoleLog[i - 1].slice(0, 2)))
                    ? h(ConsoleCommandEntry, {board, sign, name, command: new gtp.Command(null, '')})
                    : null,
                    h(ConsoleResponseEntry, {board, response, waiting: response == null})
                ])
            ),

            h('form', {class: 'input'},
                h('select',
                    {
                        disabled: !hasEngines || attachedEngines.filter(x => x != null).length === 1,
                        style: {width: selectWidth},

                        onChange: this.handleSelectChange
                    },

                    attachedEngines.map((engine, i) =>
                        engine && h('option', {
                            value: i,
                            selected: engineIndex === i
                        }, `${['○', '●'][i]} ${engine.name.trim()}>`)
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
                    class: 'autocomplete',
                    disabled: !hasEngines,
                    type: 'text',
                    value: autocompleteText,
                    style: inputStyle
                })
            )
        )
    }
}

module.exports = GtpConsole
