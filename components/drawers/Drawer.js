const {h, Component} = require('preact')
const classNames = require('classnames')

class Drawer extends Component {
    render({type, show, children}) {
        return h('section', {
            id: type,
            class: classNames({
                drawer: true,
                show
            })
        }, children)
    }
}

module.exports = Drawer
