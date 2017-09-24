const {h, Component} = require('preact')

const Drawer = require('./Drawer')

class PrintExportDrawer extends Component {
    render({show}) {
        return h(Drawer,
            {
                type: 'printexport',
                show
            },

            h('h2', {}, 'Export for Print')
        )
    }
}

module.exports = PrintExportDrawer
