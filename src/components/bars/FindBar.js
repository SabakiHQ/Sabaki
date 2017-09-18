const {h, Component} = require('preact')
const Bar = require('./Bar')
const helper = require('../../modules/helper')

class FindBar extends Component {
    constructor() {
        super()

        this.handleChange = evt => {
            sabaki.setState({findText: evt.currentTarget.value})
        }

        this.handleButtonClick = evt => {
            evt.preventDefault()

            let step = evt.currentTarget.classList.contains('next') ? 1 : -1
            let {onButtonClick = helper.noop} = this.props

            evt.step = step
            onButtonClick(evt)
        }
    }

    render({findText}) {
        return h(Bar, Object.assign({type: 'find'}, this.props),
            h('form', {},
                h('input', {
                    type: 'text',
                    placeholder: 'Find',
                    value: findText,
                    onInput: this.handleChange
                }),

                h('button', {class: 'next', onClick: this.handleButtonClick},
                    h('img', {src: './node_modules/octicons/build/svg/chevron-down.svg', height: 20, alt: 'Next'})
                ),
                h('button', {class: 'prev', onClick: this.handleButtonClick},
                    h('img', {src: './node_modules/octicons/build/svg/chevron-up.svg', height: 20, alt: 'Previous'})
                )
            )
        )
    }
}

module.exports = FindBar
