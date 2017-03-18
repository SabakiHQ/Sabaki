const {h, Component} = require('preact')
const Drawer = require('./Drawer')

class InfoDrawer extends Component {
    render({show}) {
        return h(Drawer, {
            type: 'cleanmarup',
            show
        })
    }
}

module.exports = InfoDrawer
