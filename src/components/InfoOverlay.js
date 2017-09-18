const {h, Component} = require('preact')
const classNames = require('classnames')

class InfoOverlay extends Component {
    shouldComponentUpdate({text, show}) {
        return text !== this.props.text || show !== this.props.show
    }

    render({text, show}) {
        return h('section', {
            id: 'info-overlay',
            class: classNames({show})
        }, text)
    }
}

module.exports = InfoOverlay
