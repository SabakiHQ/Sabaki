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
      peerListHeight: setting.get('view.peerlist_height')
    }

    this.handlePeerListHeightChange = ({sideSize}) => {
      this.setState({peerListHeight: Math.max(sideSize, peerListMinHeight)})
    }

    this.handlePeerListHeightFinish = () => {
      setting.set('view.peerlist_height', this.state.peerListHeight)
    }

    this.handleCommandSubmit = ({engineIndex, command}) => {
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
    peerListHeight
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
          analyzingEngineSyncerId
        }),

        mainContent: h(GtpConsole, {
          show: showLeftSidebar,
          consoleLog,
          engineIndex: 0,
          attachedEngines: attachedEngineSyncers.map(syncer => ({
            name: syncer.engine.name,
            get commands() {
              return syncer.commands
            }
          })),

          onSubmit: this.handleCommandSubmit
        }),

        onChange: this.handlePeerListHeightChange,
        onFinish: this.handlePeerListHeightFinish
      })
    )
  }
}
