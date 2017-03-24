const {h, Component} = require('preact')

class Drawer extends Component {
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
