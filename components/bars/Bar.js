const {h, Component} = require('preact')
const classNames = require('classnames')

class Bar extends Component {
    constructor() {
        super()

        this.onCloseButtonClick = () => sabaki.setMode('play')
    }

    shouldComponentUpdate(nextProps) {
        return nextProps.mode !== this.props.mode || nextProps.mode === nextProps.type
    }

    render({children, type, mode, class: c = ''}) {
        return h('section',
            {
                id: type,
                class: classNames(c, {
                    bar: true,
                    current: type === mode
                })
            },

            children,
            h('a', {class: 'close', href: '#', onClick: this.onCloseButtonClick})
        )
    }
}

module.exports = Bar
