const {h, Component} = require('preact')
const classNames = require('classnames')

class Drawer extends Component {
    constructor(props) {
        super(props)

        this.state = {
            hidecontent: props.show
        }

        this.componentWillReceiveProps(props)
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.show) {
            clearTimeout(this.hidecontentId)

            if (this.state.hidecontent)
                this.setState({hidecontent: false})
        } else {
            if (!this.state.hidecontent)
                this.hidecontentId = setTimeout(() => this.setState({hidecontent: true}), 500)
        }
    }

    render({type, show, children}, {hidecontent}) {
        return h('section', {
            id: type,
            class: classNames({
                drawer: true,
                hidecontent,
                show
            })
        }, children)
    }
}

module.exports = Drawer
