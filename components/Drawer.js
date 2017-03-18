const {h, Component} = require('preact')

class Drawer extends Component {
    shouldComponentUpdate({show}) {
        return this.props.show !== show || show
    }

    render({type, show, children}) {
        return h('section', {
            id: type,
            class: {
                drawer: true,
                show
            }
        }, children)
    }
}

module.exports = Drawer
