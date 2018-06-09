const {h, Component} = require('preact')
const helper = require('../../modules/helper')

const Drawer = require('./Drawer')

const blockedProperties = ['AP', 'B', 'W', 'SZ']

class PropertyItem extends Component {
    constructor(props) {
        super(props)

        this.handleRemoveButtonClick = evt => {
            evt.preventDefault()

            let {property, index, onRemove = helper.noop} = this.props
            onRemove({property, index})
        }

        this.handleChange = evt => {
            let {property, index, onChange = helper.noop} = this.props
            onChange({property, index, value: evt.currentTarget.value})
        }
    }

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
                    onClick: () => this.inputElement.focus()
                },

                index == null ? property : [property, h('em', {}, `[${index}]`)]
            ),

            h('td', {},
                h('textarea', {
                    ref: el => this.inputElement = el,
                    value,
                    disabled,
                    rows: value.includes('\n') ? 3 : 1,

                    onInput: this.handleChange,
                    onBlur: () => this.inputElement.scrollTop = 0
                })
            ),

            h('td', {class: 'action'},
                !disabled && h('a',
                    {
                        class: 'remove',
                        title: 'Remove',
                        href: '#',
                        onClick: this.handleRemoveButtonClick
                    },

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

        this.handlePropertyChange = ({property, index, value}) => {
            let [tree, i] = this.props.treePosition
            let node = tree.nodes[i]

            if (index == null || !(property in node)) {
                node[property] = [value]
            } else {
                node[property][index] = value
            }

            sabaki.setCurrentTreePosition(tree, i)
        }

        this.handlePropertyRemove = ({property, index}) => {
            let [tree, i] = this.props.treePosition
            let node = tree.nodes[i]

            if (index == null) {
                delete node[property]
            } else if (property in node) {
                node[property].splice(index, 1)
            }

            sabaki.setCurrentTreePosition(tree, i)
        }
    }

    shouldComponentUpdate({show}) {
        return show || show !== this.props.show
    }

    componentWillReceiveProps({treePosition}) {
        if (!helper.vertexEquals(treePosition, this.props.treePosition)) {
            this.propertiesElement.scrollTop = 0
        }
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
                h('div',
                    {
                        ref: el => this.propertiesElement = el,
                        class: 'properties-list'
                    },

                    h('table', {}, properties.map(property =>
                        node[property].map((value, i) => h(PropertyItem, {
                            property,
                            value,
                            index: node[property].length === 1 ? null : i,
                            disabled: blockedProperties.includes(property),

                            onChange: this.handlePropertyChange,
                            onRemove: this.handlePropertyRemove
                        }))
                    ))
                ),

                h('p', {},
                    h('button', {onClick: this.handleCloseButtonClick}, 'Close')
                )
            )
        )
    }
}

module.exports = AdvancedPropertiesDrawer
