import * as remote from '@electron/remote'
import {h, Component} from 'preact'

import i18n from '../../i18n.js'
import sabaki from '../../modules/sabaki.js'
import {wait, popupMenu} from '../../modules/helper.js'

import Drawer from './Drawer.js'

const t = i18n.context('CleanMarkupDrawer')
const setting = remote.require('./setting')

class CleanMarkupItem extends Component {
  constructor() {
    super()

    this.handleChange = evt => {
      setting.set(this.props.id, evt.currentTarget.checked)
    }
  }

  render({id, text}) {
    return h(
      'li',
      {},
      h(
        'label',
        {},
        h('input', {
          type: 'checkbox',
          checked: setting.get(id),
          onChange: this.handleChange
        }),
        ' ',

        text
      )
    )
  }
}

export default class CleanMarkupDrawer extends Component {
  constructor() {
    super()

    this.handleCloseButtonClick = evt => {
      evt.preventDefault()
      sabaki.closeDrawer()
    }

    this.handleRemoveButtonClick = evt => {
      evt.preventDefault()

      let doRemove = async work => {
        sabaki.setBusy(true)

        let data = {
          cross: ['MA'],
          triangle: ['TR'],
          square: ['SQ'],
          circle: ['CR'],
          line: ['LN'],
          arrow: ['AR'],
          label: ['LB'],
          comments: ['C', 'N'],
          annotations: ['DM', 'GB', 'GW', 'UC', 'BM', 'DO', 'IT', 'TE'],
          hotspots: ['HO'],
          winrate: ['SBKV']
        }

        let properties = Object.keys(data)
          .filter(id => setting.get(`cleanmarkup.${id}`))
          .map(id => data[id])
          .reduce((acc, x) => [...acc, ...x], [])

        await wait(100)

        let newTree = work(properties)

        sabaki.setCurrentTreePosition(newTree, this.props.treePosition)
        sabaki.setBusy(false)
        sabaki.closeDrawer()
      }

      let template = [
        {
          label: t('From Current &Position'),
          click: () =>
            doRemove(properties => {
              return this.props.gameTree.mutate(draft => {
                for (let prop of properties) {
                  draft.removeProperty(this.props.treePosition, prop)
                }
              })
            })
        },
        {
          label: t('From Entire &Game'),
          click: () =>
            doRemove(properties => {
              return this.props.gameTree.mutate(draft => {
                for (let node of this.props.gameTree.listNodes()) {
                  for (let prop of properties) {
                    draft.removeProperty(node.id, prop)
                  }
                }
              })
            })
        }
      ]

      let element = evt.currentTarget
      let {left, bottom} = element.getBoundingClientRect()

      popupMenu(template, left, bottom)
    }
  }

  shouldComponentUpdate({show}) {
    return show !== this.props.show
  }

  render({show}) {
    return h(
      Drawer,
      {
        type: 'cleanmarkup',
        show
      },

      h('h2', {}, t('Clean Markup')),

      h(
        'form',
        {},
        h(
          'ul',
          {},
          h(CleanMarkupItem, {
            id: 'cleanmarkup.cross',
            text: t('Cross markers')
          }),
          h(CleanMarkupItem, {
            id: 'cleanmarkup.triangle',
            text: t('Triangle markers')
          }),
          h(CleanMarkupItem, {
            id: 'cleanmarkup.square',
            text: t('Square markers')
          }),
          h(CleanMarkupItem, {
            id: 'cleanmarkup.circle',
            text: t('Circle markers')
          })
        ),
        h(
          'ul',
          {},
          h(CleanMarkupItem, {
            id: 'cleanmarkup.line',
            text: t('Line markers')
          }),
          h(CleanMarkupItem, {
            id: 'cleanmarkup.arrow',
            text: t('Arrow markers')
          }),
          h(CleanMarkupItem, {
            id: 'cleanmarkup.label',
            text: t('Label markers')
          })
        ),
        h(
          'ul',
          {},
          h(CleanMarkupItem, {
            id: 'cleanmarkup.comments',
            text: t('Comments')
          }),
          h(CleanMarkupItem, {
            id: 'cleanmarkup.annotations',
            text: t('Annotations')
          }),
          h(CleanMarkupItem, {
            id: 'cleanmarkup.hotspots',
            text: t('Hotspots markers')
          }),
          h(CleanMarkupItem, {
            id: 'cleanmarkup.winrate',
            text: t('Winrate data')
          })
        ),

        h(
          'p',
          {},
          h(
            'button',
            {
              type: 'button',
              class: 'dropdown',
              onClick: this.handleRemoveButtonClick
            },
            t('Remove')
          ),
          ' ',

          h('button', {onClick: this.handleCloseButtonClick}, t('Close'))
        )
      )
    )
  }
}
