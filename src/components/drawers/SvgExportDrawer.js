const {h, Component} = require('preact')

const Drawer = require('./Drawer')

class SvgExportDrawer extends Component {
    render({show}) {
        return h(Drawer,
            {
                type: 'svgexport',
                show
            },

            h('h2', {}, 'SVG Export')
        )
    }
}
