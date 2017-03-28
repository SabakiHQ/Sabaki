const {h, Component} = require('preact')
const helper = require('../modules/helper')

class InputBox extends Component {
    constructor() {
        super()

        this.state = {value: ''}

        this.handleInput = evt => this.setState({value: evt.currentTarget.value})
        this.stopPropagation = evt => evt.stopPropagation()

        this.handleKeyUp = evt => {
            if (evt.keyCode === 27) {
                // Escape

                this.close()
            } else if (evt.keyCode == 13) {
                // Enter

                evt.stopPropagation()
                sabaki.setState({showInputBox: false})

                let {onSubmit = helper.noop} = this.props
                onSubmit(this.state)
            }
        }

        this.close = this.close.bind(this)
    }

    shouldComponentUpdate({show, text, onSubmit, onCancel}) {
        return show !== this.props.show
            || text !== this.props.text
            || onSubmit !== this.props.onSubmit
            || onCancel !== this.props.onCancel
    }

    componentWillReceiveProps(prevProps) {
        if (!prevProps.show && this.props.show) {
            this.setState({value: ''})
        }
    }

    componentDidUpdate(prevProps) {
        if (!prevProps.show && this.props.show) {
            this.inputElement.focus()
        }
    }

    close() {
        if (!this.props.show) return

        let {onCancel = helper.noop} = this.props
        sabaki.setState({showInputBox: false})
        onCancel()
    }

    render({show, text}, {value}) {
        return h('section',
            {
                id: 'input-box',
                class: {show},

                onClick: this.close
            },

            h('div', {class: 'inner', onClick: this.stopPropagation},
                h('input', {
                    ref: el => this.inputElement = el,
                    type: 'text',
                    name: 'input',
                    value,
                    placeholder: text,

                    onInput: this.handleInput,
                    onKeyUp: this.handleKeyUp,
                    onBlur: this.close
                })
            )
        )
    }
}

module.exports = InputBox
