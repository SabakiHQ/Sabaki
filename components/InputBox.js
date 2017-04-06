const {h, Component} = require('preact')
const classNames = require('classnames')

const helper = require('../modules/helper')

class InputBox extends Component {
    constructor() {
        super()

        this.state = {value: ''}

        this.handleInput = evt => this.setState({value: evt.currentTarget.value})
        this.stopPropagation = evt => evt.stopPropagation()

        this.handleKeyUp = evt => {
            if (!this.props.show) return

            if (evt.keyCode === 27) {
                // Escape

                evt.stopPropagation()
                this.cancel()
            } else if (evt.keyCode == 13) {
                // Enter

                evt.stopPropagation()
                sabaki.setState({showInputBox: false})

                let {onSubmit = helper.noop} = this.props
                onSubmit(this.state)
            }
        }

        this.cancel = this.cancel.bind(this)
    }

    shouldComponentUpdate({show, text, onSubmit, onCancel}) {
        return show !== this.props.show
            || text !== this.props.text
            || onSubmit !== this.props.onSubmit
            || onCancel !== this.props.onCancel
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

        if (document.activeElement === this.inputElement)
            this.inputElement.blur()

        let {onCancel = helper.noop} = this.props
        sabaki.setState({showInputBox: false})
        onCancel()
    }

    render({show, text}, {value}) {
        return h('section',
            {
                id: 'input-box',
                class: classNames({show}),

                onClick: this.cancel
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
                    onBlur: this.cancel
                })
            )
        )
    }
}

module.exports = InputBox
