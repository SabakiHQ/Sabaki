const {h, Component} = require('preact')
const dialog = require('../../modules/dialog')
const helper = require('../../modules/helper')

const Drawer = require('./Drawer')

const blockedProperties = ['AP', 'CA']
const clearCacheProperties = ['AE', 'AW', 'AB', 'SZ', 'W', 'B']

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

        this.handleKeyDown = evt => {
            if (evt.key === 'Enter') {
                if (!evt.shiftKey) {
                    evt.preventDefault()

                    let {onSubmit = helper.noop} = this.props
                    onSubmit()
                }
            }
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
                    'data-property': property,
                    'data-index': index,

                    value,
                    disabled,
                    rows: 1,

                    onInput: this.handleChange,
                    onKeyDown: this.handleKeyDown,
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
            if (evt) evt.preventDefault()
            sabaki.closeDrawer()
        }

        this.handleAddButtonClick = async evt => {
            evt.preventDefault()

            let {value} = await new Promise(resolve => dialog.showInputBox('Enter property name', resolve))
            let property = value.toUpperCase()

            if (blockedProperties.includes(property)) {
                dialog.showMessageBox('This property has been blocked.', 'warning')
                return
            }

            let {gameTree, treePosition} = this.props
            let newTree = gameTree.mutate(draft => {
                draft.addToProperty(treePosition, property, '')
            })

            sabaki.setCurrentTreePosition(newTree, treePosition)
            await sabaki.waitForRender()

            let textareas = this.propertiesElement.querySelectorAll(`textarea[data-property="${property}"]`)
            textareas.item(textareas.length - 1).focus()
        }

        this.handlePropertyChange = ({property, index, value}) => {
            let {gameTree, treePosition} = this.props

            let newTree = gameTree.mutate(draft => {
                let values = draft.get(treePosition).data[property]

                if (values == null) values = [value]
                else values = values.map((x, i) => i === index ? value : x)

                draft.updateProperty(treePosition, property, values)
            })

            let clearCache = clearCacheProperties.includes(property)
            sabaki.setCurrentTreePosition(newTree, treePosition, {clearCache})
        }

        this.handlePropertyRemove = ({property, index}) => {
            let {gameTree, treePosition} = this.props
            let newTree = gameTree.mutate(draft => {
                let values = draft.get(treePosition).data[property]

                if (values[index] == null) draft.removeProperty(treePosition, property)
                else draft.removeFromProperty(treePosition, property, values[index])
            })

            let clearCache = clearCacheProperties.includes(property)
            sabaki.setCurrentTreePosition(newTree, treePosition, {clearCache})
        }
    }

    shouldComponentUpdate({show}) {
        return show || show !== this.props.show
    }

    componentWillReceiveProps({treePosition}) {
        if (treePosition !== this.props.treePosition) {
            this.propertiesElement.scrollTop = 0
        }
    }

    render({gameTree, treePosition, show}) {
        let node = gameTree.get(treePosition)
        let properties = Object.keys(node.data).filter(x => x.toUpperCase() === x).sort()

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
                        node.data[property].map((value, i) => h(PropertyItem, {
                            key: `${property}-${i}`,

                            property,
                            value,
                            index: node.data[property].length === 1 ? null : i,
                            disabled: blockedProperties.includes(property),

                            onChange: this.handlePropertyChange,
                            onRemove: this.handlePropertyRemove,
                            onSubmit: this.handleCloseButtonClick
                        }))
                    ))
                ),

                h('p', {},
                    h('button', {class: 'add', type: 'button', onClick: this.handleAddButtonClick}, 'Add'),
                    h('button', {onClick: this.handleCloseButtonClick}, 'Close')
                )
            )
        )
    }
}

module.exports = AdvancedPropertiesDrawer
