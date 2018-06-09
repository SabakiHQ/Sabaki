const {h, Component} = require('preact')

const Drawer = require('./Drawer')

const blockedProperties = ['B', 'W', 'C', 'SZ']

class PropertyItem extends Component {
    shouldComponentUpdate({property, index, value, disabled}) {
        return property !== this.props.property
            || index !== this.props.index
            || value !== this.props.value
            || disabled !== this.props.disabled
    }

    render({property, index, value, disabled}) {
        return h('tr', {},
            h('th',
                {
                    style: {
                        width: +(index != null) * 3 + property.length
                    }
                },

                index == null ? property : [property, h('em', {}, `[${index}]`)]
            ),
            h('td', {},
                h('input', {
                    value,
                    disabled
                })
            ),
            h('td', {class: 'action'},
                h('a', {class: 'remove', title: 'Remove', href: '#'},
                    h('img', {src: './node_modules/octicons/build/svg/x.svg'})
                )
            )
        )
    }
}

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
        let properties = Object.keys(node).filter(x => x.toUpperCase() === x).sort()

        return h(Drawer,
            {
                type: 'advancedproperties',
                show
            },

            h('form', {},
                h('div', {class: 'properties-list'},
                    h('table', {},
                        properties.map(property =>
                            node[property].map((value, i) =>
                                h(PropertyItem, {
                                    property,
                                    value,
                                    index: node[property].length === 1 ? null : i,
                                    disabled: blockedProperties.includes(property)
                                })
                            )
                        )
                    )
                ),

                h('p', {},
                    h('button', {onClick: this.handleCloseButtonClick}, 'Close')
                )
            )
        )
    }
}

module.exports = AdvancedPropertiesDrawer
