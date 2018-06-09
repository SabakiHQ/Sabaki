const {h, Component} = require('preact')

const Drawer = require('./Drawer')

const blockedProperties = ['B', 'W', 'C', 'SZ']

class AdvancedPropertiesDrawer extends Component {
    constructor(props) {
        super(props)

        this.handleCloseButtonClick = evt => {
            evt.preventDefault()
            sabaki.closeDrawer()
        }
    }

    shouldComponentUpdate({show}) {
        return show || show !== this.props.show
    }

    render({treePosition, show}) {
        let [tree, index] = treePosition
        let node = tree.nodes[index]
        let properties = Object.keys(node).filter(x => x.toUpperCase() === x)

        return h(Drawer,
            {
                type: 'advancedproperties',
                show
            },

            h('form', {},
                h('p', {},
                    h('button', {onClick: this.handleCloseButtonClick}, 'Close')
                )
            )
        )
    }
}

module.exports = AdvancedPropertiesDrawer
