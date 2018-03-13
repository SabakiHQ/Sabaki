const {h, Component} = require('preact')
const classNames = require('classnames')

class Bar extends Component {
    constructor(props) {
        super(props)

        this.state = {
            hidecontent: props.type !== props.mode
        }

        this.componentWillReceiveProps(props)
        this.onCloseButtonClick = () => sabaki.setMode('play')
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.type === nextProps.mode) {
            clearTimeout(this.hidecontentId)

            if (this.state.hidecontent)
                this.setState({hidecontent: false})
        } else {
            if (!this.state.hidecontent)
                this.hidecontentId = setTimeout(() => this.setState({hidecontent: true}), 500)
        }
    }

    shouldComponentUpdate(nextProps) {
        return nextProps.mode !== this.props.mode || nextProps.mode === nextProps.type
    }

    render({children, type, mode, class: c = ''}, {hidecontent}) {
        return h('section',
            {
                id: type,
                class: classNames(c, {
                    bar: true,
                    current: type === mode,
                    hidecontent
                })
            },

            children,
            h('a', {class: 'close', href: '#', onClick: this.onCloseButtonClick})
        )
    }
}

module.exports = Bar
