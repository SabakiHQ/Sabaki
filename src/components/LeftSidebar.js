import {remote} from 'electron'
import {h, Component} from 'preact'

import {SplitContainer} from './helpers/SplitContainer.js'
import {GtpConsole} from './sidebars/GtpConsole.js'
import {EnginePeerList} from './sidebars/PeerList.js'

const setting = remote.require('./setting')
const peerListMinHeight = setting.get('view.peerlist_minheight')

export class LeftSidebar extends Component {
  constructor() {
    super()

    this.state = {
      peerListHeight: setting.get('view.peerlist_height'),
      selectedEngineSyncerId: null
    }

    this.handlePeerListHeightChange = ({sideSize}) => {
      this.setState({peerListHeight: Math.max(sideSize, peerListMinHeight)})
    }

    this.handlePeerListHeightFinish = () => {
      setting.set('view.peerlist_height', this.state.peerListHeight)
    }

    this.handleEngineSelect = ({syncer}) => {
      this.setState({selectedEngineSyncerId: syncer.id})
    }

    this.handleCommandSubmit = ({command}) => {
      let engineSyncer = this.props.attachedEngineSyncers
        .find(syncer => syncer.id === this.state.selectedEngineSyncerId)

      if (engineSyncer != null) {
        engineSyncer.controller.sendCommand(command)
      }
    }
  }

  shouldComponentUpdate(nextProps) {
    return nextProps.showLeftSidebar != this.props.showLeftSidebar || nextProps.showLeftSidebar
  }

  render({
    attachedEngineSyncers,
    analyzingEngineSyncerId,
    showLeftSidebar,
    consoleLog
  }, {
    peerListHeight,
    selectedEngineSyncerId
  }) {
    return h('section',
      {
        ref: el => this.element = el,
        id: 'leftsidebar'
      },

      h(SplitContainer, {
        vertical: true,
        invert: true,
        sideSize: peerListHeight,

        sideContent: h(EnginePeerList, {
          attachedEngineSyncers,
          analyzingEngineSyncerId,
          selectedEngineSyncerId,

          onEngineSelect: this.handleEngineSelect
        }),

        mainContent: h(GtpConsole, {
          show: showLeftSidebar,
          consoleLog,
          attachedEngine: attachedEngineSyncers.map(syncer =>
            syncer.id !== selectedEngineSyncerId ? null : {
              name: syncer.engine.name,
              get commands() {
                return syncer.commands
              }
            }
          ).find(x => x != null),

          onSubmit: this.handleCommandSubmit
        }),

        onChange: this.handlePeerListHeightChange,
        onFinish: this.handlePeerListHeightFinish
      })
    )
  }
}

LeftSidebar.getDerivedStateFromProps = (props, state) => {
  if (
    props.attachedEngineSyncers.length > 0
    && props.attachedEngineSyncers.find(syncer =>
      syncer.id === state.selectedEngineSyncerId
    ) == null
  ) {
    return {selectedEngineSyncerId: props.attachedEngineSyncers[0].id}
  } else if (props.attachedEngineSyncers.length === 0) {
    return {selectedEngineSyncerId: null}
  }
}
