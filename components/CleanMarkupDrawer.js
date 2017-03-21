const {h, Component} = require('preact')
const Drawer = require('./Drawer')

class InfoDrawer extends Component {
    render({show}) {
        return h(Drawer, {
            type: 'cleanmarkup',
            show
        })
    }
}

module.exports = InfoDrawer
