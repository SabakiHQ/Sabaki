import {h, Component} from 'preact'
import classnames from 'classnames'

import sabaki from '../../modules/sabaki.js'
import i18n from '../../i18n.js'
import TextSpinner from '../TextSpinner.js'
import ToolBar, {ToolBarButton} from '../ToolBar.js'

const t = i18n.context('PeerList')

class EnginePeerListItem extends Component {
  constructor(props) {
    super(props)

    this.state = {
      busy: props.syncer.busy,
      suspended: props.syncer.suspended,
      error: props.syncer.error,
    }

    this.syncState = () => {
      this.setState({
        busy: this.props.syncer.busy,
        suspended: this.props.syncer.suspended,
        error: this.props.syncer.error,
      })
    }

    this.handleClick = (evt) => {
      let {syncer, onClick = () => {}} = this.props
      onClick({syncer})
    }

    this.handleContextMenu = (evt) => {
      let {syncer, onContextMenu = () => {}} = this.props
      onContextMenu(evt, {syncer})
    }
  }

  componentDidMount() {
    this.props.syncer
      .on('busy-changed', this.syncState)
      .on('suspended-changed', this.syncState)
      .on('error-changed', this.syncState)
  }

  componentWillUnmount() {
    this.props.syncer
      .removeListener('busy-changed', this.syncState)
      .removeListener('suspended-changed', this.syncState)
      .removeListener('error-changed', this.syncState)
  }

  render({syncer, analyzing, selected, blackPlayer, whitePlayer}) {
    let failed = this.state.error != null
    let status = failed
      ? t('Error')
      : !this.state.suspended
        ? t('Running')
        : t('Stopped')
    let statusIcon = failed
      ? 'alert-16'
      : !this.state.suspended
        ? 'triangle-right-16'
        : 'square-fill-16'

    return h(
      'li',
      {
        class: classnames('item', {
          analyzing,
          selected,
          failed,
          busy: this.state.busy,
          suspended: this.state.suspended,
        }),

        onClick: this.handleClick,
        onContextMenu: this.handleContextMenu,
      },

      !this.state.busy
        ? h(
            'div',
            {
              class: 'icon',
              title: failed ? this.state.error : status,
            },
            h('img', {
              src: `./node_modules/@primer/octicons/build/svg/${statusIcon}.svg`,
              alt: status,
            }),
          )
        : h(TextSpinner),

      h('span', {key: 'name', class: 'name'}, syncer.engine.name),

      analyzing &&
        h(
          'div',
          {
            key: 'analyzing',
            class: 'icon analyzing',
            title: t('Analyzer'),
          },
          h('img', {
            src: './node_modules/@primer/octicons/build/svg/pulse-16.svg',
            alt: t('Analyzer'),
          }),
        ),

      blackPlayer &&
        h(
          'div',
          {
            key: 'player_1',
            class: 'icon player',
            title: t('Plays as Black'),
          },
          h('img', {
            height: 14,
            src: './img/ui/black.svg',
            alt: t('Plays as Black'),
          }),
        ),

      whitePlayer &&
        h(
          'div',
          {
            key: 'player_-1',
            class: 'icon player',
            title: t('Plays as White'),
          },
          h('img', {
            height: 14,
            src: './img/ui/white.svg',
            alt: t('Plays as White'),
          }),
        ),
    )
  }
}

export class EnginePeerList extends Component {
  constructor(props) {
    super(props)

    this.handleEngineClick = (evt) => {
      let {onEngineSelect = () => {}} = this.props
      onEngineSelect(evt)
    }

    this.handleEngineContextMenu = (evt, {syncer}) => {
      let {onEngineSelect = () => {}} = this.props
      onEngineSelect({syncer})

      sabaki.openEngineActionMenu(syncer.id, {
        x: evt.clientX,
        y: evt.clientY,
      })
    }

    this.handleAttachEngineButtonClick = (evt) => {
      let {left, bottom} = evt.currentTarget.getBoundingClientRect()

      sabaki.openEnginesMenu({x: left, y: bottom})
    }

    this.handleStartStopGameButtonClick = (evt) => {
      sabaki.startStopEngineGame(sabaki.state.treePosition)
    }
  }

  render({
    attachedEngineSyncers,
    selectedEngineSyncerId,
    blackEngineSyncerId,
    whiteEngineSyncerId,
    analyzingEngineSyncerId,
    engineGameOngoing,
  }) {
    return h(
      'div',
      {
        class: 'engine-peer-list',
      },

      h(
        ToolBar,
        {},

        h(ToolBarButton, {
          icon: './node_modules/@primer/octicons/build/svg/play-16.svg',
          tooltip: t('Attach Engine…'),
          menu: true,
          onClick: this.handleAttachEngineButtonClick,
        }),

        h(ToolBarButton, {
          icon: './node_modules/@primer/octicons/build/svg/zap-16.svg',
          tooltip: !engineGameOngoing
            ? t('Start Engine vs. Engine Game')
            : t('Stop Engine vs. Engine Game'),
          checked: !!engineGameOngoing,
          onClick: this.handleStartStopGameButtonClick,
        }),
      ),

      h(
        'ul',
        {},
        attachedEngineSyncers.map((syncer) =>
          h(EnginePeerListItem, {
            key: syncer.id,

            syncer,
            analyzing: syncer.id === analyzingEngineSyncerId,
            selected: syncer.id === selectedEngineSyncerId,
            blackPlayer: syncer.id === blackEngineSyncerId,
            whitePlayer: syncer.id === whiteEngineSyncerId,

            onClick: this.handleEngineClick,
            onContextMenu: this.handleEngineContextMenu,
          }),
        ),
      ),
    )
  }
}
