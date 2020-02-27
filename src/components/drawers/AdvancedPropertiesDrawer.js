import {h, Component} from 'preact'

import i18n from '../../i18n.js'
import sabaki from '../../modules/sabaki.js'
import {showInputBox, showMessageBox} from '../../modules/dialog.js'
import {noop} from '../../modules/helper.js'

import Drawer from './Drawer.js'

const t = i18n.context('AdvancedPropertiesDrawer')
const blockedProperties = ['AP', 'CA']
const clearCacheProperties = ['AE', 'AW', 'AB', 'SZ', 'W', 'B']

class PropertyItem extends Component {
  constructor(props) {
    super(props)

    this.handleRemoveButtonClick = evt => {
      evt.preventDefault()

      let {property, index, onRemove = noop} = this.props
      onRemove({property, index})
    }

    this.handleChange = evt => {
      let {property, index, onChange = noop} = this.props
      onChange({property, index, value: evt.currentTarget.value})
    }

    this.handleKeyDown = evt => {
      if (evt.key === 'Enter') {
        if (!evt.shiftKey) {
          evt.preventDefault()

          let {onSubmit = noop} = this.props
          onSubmit()
        }
      }
    }
  }

  shouldComponentUpdate({property, index, value, disabled}) {
    return (
      property !== this.props.property ||
      index !== this.props.index ||
      value !== this.props.value ||
      disabled !== this.props.disabled
    )
  }

  render({property, index, value, disabled}) {
    return h(
      'tr',
      {},
      h(
        'th',
        {
          onClick: () => this.inputElement.focus()
        },

        index == null ? property : [property, h('em', {}, `[${index}]`)]
      ),

      h(
        'td',
        {},
        h('textarea', {
          ref: el => (this.inputElement = el),
          'data-property': property,
          'data-index': index,

          value,
          disabled,
          rows: 1,

          onInput: this.handleChange,
          onKeyDown: this.handleKeyDown,
          onBlur: () => (this.inputElement.scrollTop = 0)
        })
      ),

      h(
        'td',
        {class: 'action'},
        !disabled &&
          h(
            'a',
            {
              class: 'remove',
              title: t('Remove'),
              href: '#',
              onClick: this.handleRemoveButtonClick
            },

            h('img', {src: './node_modules/@primer/octicons/build/svg/x.svg'})
          )
      )
    )
  }
}

export default class AdvancedPropertiesDrawer extends Component {
  constructor(props) {
    super(props)

    this.handleCloseButtonClick = evt => {
      if (evt) evt.preventDefault()
      sabaki.closeDrawer()
    }

    this.handleAddButtonClick = async evt => {
      evt.preventDefault()

      let value = await showInputBox(t('Enter property name'))
      if (value == null) return

      let property = value.toUpperCase()

      if (blockedProperties.includes(property)) {
        showMessageBox(t('This property has been blocked.'), 'warning')
        return
      }

      let {gameTree, treePosition} = this.props
      let newTree = gameTree.mutate(draft => {
        draft.addToProperty(treePosition, property, '')
      })

      sabaki.setCurrentTreePosition(newTree, treePosition)
      await sabaki.waitForRender()

      let textareas = this.propertiesElement.querySelectorAll(
        `textarea[data-property="${property}"]`
      )
      textareas.item(textareas.length - 1).focus()
    }

    this.handlePropertyChange = ({property, index, value}) => {
      let {gameTree, treePosition} = this.props

      let newTree = gameTree.mutate(draft => {
        let values = draft.get(treePosition).data[property]

        if (values == null || index == null) values = [value]
        else values = values.map((x, i) => (i === index ? value : x))

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
    let properties = Object.keys(node.data)
      .filter(x => x.toUpperCase() === x)
      .sort()

    return h(
      Drawer,
      {
        type: 'advancedproperties',
        show
      },

      h(
        'form',
        {},
        h(
          'div',
          {
            ref: el => (this.propertiesElement = el),
            class: 'properties-list'
          },

          h(
            'table',
            {},
            properties.map(property =>
              node.data[property].map((value, i) =>
                h(PropertyItem, {
                  key: `${property}-${i}`,

                  property,
                  value,
                  index: node.data[property].length === 1 ? null : i,
                  disabled: blockedProperties.includes(property),

                  onChange: this.handlePropertyChange,
                  onRemove: this.handlePropertyRemove,
                  onSubmit: this.handleCloseButtonClick
                })
              )
            )
          )
        ),

        h(
          'p',
          {},
          h(
            'button',
            {class: 'add', type: 'button', onClick: this.handleAddButtonClick},
            t('Add')
          ),
          h('button', {onClick: this.handleCloseButtonClick}, t('Close'))
        )
      )
    )
  }
}
