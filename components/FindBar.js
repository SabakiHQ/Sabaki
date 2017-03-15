const {h, Component} = require('preact')
const Bar = require('./Bar')

class FindBar extends Component {
    render({findText, onFindNextClick = () => {}, onFindPreviousClick = () => {}}) {
        return h(Bar, Object.assign({type: 'find'}, this.props),
            h('form', {},
                h('input', {type: 'text', placeholder: 'Find', value: findText}),

                h('button', {type: 'submit', onClick: onFindNextClick},
                    h('img', {src: './node_modules/octicons/build/svg/chevron-down.svg', height: 20, alt: 'Next'})
                ),
                h('button', {type: 'submit', onClick: onFindPreviousClick},
                    h('img', {src: './node_modules/octicons/build/svg/chevron-up.svg', height: 20, alt: 'Previous'})
                )
            )
        )
    }
}

module.exports = FindBar
