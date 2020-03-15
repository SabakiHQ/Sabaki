import {h, Component} from 'preact'
import classNames from 'classnames'

import i18n from '../../i18n.js'
import sabaki from '../../modules/sabaki.js'
import * as helper from '../../modules/helper.js'
import TextSpinner from '../TextSpinner.js'

const t = i18n.context('PlayBar')

export default class PlayBar extends Component {
  constructor(props) {
    super(props)

    this.state = {
      playerBusy: [false, false]
    }

    this.syncState = () => {
      this.setState({
        playerBusy: this.props.engineSyncers.map(syncer =>
          syncer == null ? false : syncer.busy
        )
      })
    }

    this.handleCurrentPlayerClick = () => this.props.onCurrentPlayerClick

    this.handleMenuClick = () => {
      let {left, top} = this.menuButtonElement.getBoundingClientRect()

      helper.popupMenu(
        [
          {
            label: t('&Pass'),
            click: () => sabaki.makeMove([-1, -1])
          },
          {
            label: t('&Resign'),
            click: () => sabaki.makeResign()
          },
          {type: 'separator'},
          {
            label: t('Es&timate'),
            click: () => sabaki.setMode('estimator')
          },
          {
            label: t('&Score'),
            click: () => sabaki.setMode('scoring')
          },
          {
            label: t('&Edit'),
            click: () => sabaki.setMode('edit')
          },
          {
            label: t('&Find'),
            click: () => sabaki.setMode('find')
          },
          {type: 'separator'},
          {
            label: t('&Info'),
            click: () => sabaki.openDrawer('info')
          }
        ],
        left,
        top
      )
    }

    for (let syncer of this.props.engineSyncers) {
      if (syncer == null) continue

      syncer.on('busy-changed', this.syncState)
    }
  }

  shouldComponentUpdate(nextProps) {
    return nextProps.mode !== this.props.mode || nextProps.mode === 'play'
  }

  componentWillReceiveProps(nextProps) {
    for (let i = 0; i < nextProps.engineSyncers.length; i++) {
      if (nextProps.engineSyncers !== this.props.engineSyncers) {
        if (this.props.engineSyncers[i] != null) {
          this.props.engineSyncers[i].removeListener(
            'busy-changed',
            this.syncState
          )
        }

        if (nextProps.engineSyncers[i] != null) {
          nextProps.engineSyncers[i].on('busy-changed', this.syncState)
        }
      }
    }
  }

  render(
    {
      mode,
      engineSyncers,
      playerNames,
      playerRanks,
      playerCaptures,
      currentPlayer,
      showHotspot,

      onCurrentPlayerClick = helper.noop
    },
    {playerBusy}
  ) {
    let captureStyle = index => ({
      opacity: playerCaptures[index] === 0 ? 0 : 0.7
    })

    return h(
      'header',
      {
        class: classNames({
          hotspot: showHotspot,
          current: mode === 'play'
        })
      },

      h('div', {class: 'hotspot', title: t('Hotspot')}),

      h(
        'span',
        {class: 'playercontent player_1'},
        h(
          'span',
          {class: 'captures', style: captureStyle(0)},
          playerCaptures[0]
        ),
        ' ',

        engineSyncers[0] == null &&
          playerRanks[0] &&
          h('span', {class: 'rank'}, playerRanks[0]),
        ' ',

        engineSyncers[0] != null && playerBusy[0] && h(TextSpinner),
        ' ',

        h(
          'span',
          {
            class: classNames('name', {engine: engineSyncers[0] != null}),
            title: engineSyncers[0] != null ? t('Engine') : null
          },

          engineSyncers[0] == null
            ? playerNames[0] || t('Black')
            : engineSyncers[0].engine.name
        )
      ),

      h(
        'a',
        {
          class: 'current-player',
          title: t('Change Player'),
          onClick: onCurrentPlayerClick
        },
        h('img', {
          src: `./img/ui/player_${currentPlayer}.svg`,
          height: 21,
          alt: currentPlayer < 0 ? t('White to play') : t('Black to play')
        })
      ),

      h(
        'span',
        {class: 'playercontent player_-1'},
        h(
          'span',
          {
            class: classNames('name', {engine: engineSyncers[1] != null}),
            title: engineSyncers[1] != null ? t('Engine') : null
          },
          engineSyncers[1] == null
            ? playerNames[1] || t('White')
            : engineSyncers[1].engine.name
        ),
        ' ',

        engineSyncers[1] != null && playerBusy[1] && h(TextSpinner),
        ' ',

        engineSyncers[1] == null &&
          playerRanks[1] &&
          h('span', {class: 'rank'}, playerRanks[1]),
        ' ',

        h(
          'span',
          {class: 'captures', style: captureStyle(1)},
          playerCaptures[1]
        )
      ),

      h(
        'a',
        {
          ref: el => (this.menuButtonElement = el),
          class: 'menu',
          onClick: this.handleMenuClick
        },
        h('img', {
          src: './node_modules/@primer/octicons/build/svg/three-bars.svg',
          height: 22
        })
      )
    )
  }
}
