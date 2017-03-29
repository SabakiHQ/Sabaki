const {h, Component} = require('preact')

class Bar extends Component {
    constructor() {
        super()

        this.onCloseButtonClick = () => sabaki.setMode('play')
    }

    shouldComponentUpdate(nextProps) {
        return nextProps.mode !== this.props.mode || nextProps.mode === nextProps.type
    }

    render({children, type, mode, class: c = {}}) {
        return h('section',
            {
                id: type,
                class: Object.assign({
                    bar: true,
                    current: type === mode
                }, c)
            },

            children,
            h('a', {class: 'close', href: '#', onClick: this.onCloseButtonClick})
        )
    }
}

module.exports = Bar
