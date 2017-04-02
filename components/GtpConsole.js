const {h, Component} = require('preact')

const gtp = require('../modules/gtp')
const helper = require('../modules/helper')
const setting = require('../modules/setting')

class ConsoleCommandEntry extends Component {
    shouldComponentUpdate() {
        return false
    }

    render({sign, name, command}) {
        return h('li', {class: 'command'},
            h('pre', {},
                h('span', {class: 'internal'}, `${sign > 0 ? '○' : sign < 0 ? '●' : ''} ${name}>`), ' ',

                command.id != null && [h('span', {class: 'id'}, command.id), ' '],
                command.name, ' ',
                command.arguments.join(' ')
            )
        )
    }
}

class ConsoleResponseEntry extends Component {
    shouldComponentUpdate({waiting}) {
        return waiting !== this.props.waiting
    }

    render({response, waiting}) {
        return h('li', {class: {response: true, waiting}},
            !waiting

            ? h('pre', {},
                h('span', {class: response.error ? 'error' : 'success'}, response.error ? '?' : '='), ' ',
                response.id != null && [h('span', {class: 'id'}, response.id), ' '],
                h('span', {
                    class: response.internal ? 'internal' : '',
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

        this.handleSubmit = evt => {
            evt.preventDefault()

            let {onSubmit = helper.noop} = this.props
            let {engineIndex, commandInputText} = this.state

            if (commandInputText.trim() === '') return

            onSubmit({
                engineIndex,
                command: gtp.parseCommand(this.state.commandInputText)
            })

            this.setState({commandInputText: ''})
        }
    }

    componentWillReceiveProps({attachedEngines}) {
        let index = attachedEngines.findIndex(x => x != null)

        if (index >= 0 && this.state.engineIndex === -1) {
            this.setState({engineIndex: index})
        } else if (index === -1 && this.state.engineIndex !== -1) {
            this.setState({engineIndex: -1})
        }
    }

    componentDidUpdate(prevProps) {
        if (prevProps.consoleLog.slice(-1)[0] !== this.props.consoleLog.slice(-1)[0]) {
            this.scrollElement.scrollTop = this.scrollElement.scrollHeight
        }
    }

    render({consoleLog, attachedEngines}, {engineIndex, commandInputText}) {
        let selectedEngine = attachedEngines[engineIndex]
        let selectWidth = Math.max(5, selectedEngine ? selectedEngine.name.trim().length + 3 : 3) * 10 + 15
        let hasEngines = attachedEngines.some(x => x != null)

        return h('section', {id: 'console'},
            h('ol',
                {
                    ref: el => this.scrollElement = el,
                    class: 'log'
                },

                consoleLog.map(([sign, name, command, response]) => [
                    h(ConsoleCommandEntry, {key: `c${command.internalId}`, sign, name, command}),
                    h(ConsoleResponseEntry, {key: `r${command.internalId}`, response, waiting: response == null})
                ])
            ),

            h('form', {class: 'input', onSubmit: this.handleSubmit},
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
                        }, `${i === 0 ? '○' : '●'} ${engine.name.trim()}>`)
                    )
                ),

                h('input', {
                    ref: el => this.inputElement = el,
                    disabled: !hasEngines,
                    type: 'text',
                    value: commandInputText,
                    style: {
                        left: selectWidth,
                        width: `calc(100% - ${selectWidth}px)`
                    },

                    onInput: this.linkState('commandInputText')
                })
            )
        )
    }
}

module.exports = GtpConsole
