import {h, Component} from 'preact'

import SplitContainer from './helpers/SplitContainer.js'
import GtpConsole from './sidebars/GtpConsole.js'
import {EnginePeerList} from './sidebars/PeerList.js'

export class LeftSidebar extends Component {
  constructor() {
    super()

    this.handleCommandSubmit = ({engineIndex, command}) => {
    }
  }

  shouldComponentUpdate(nextProps) {
    return nextProps.showLeftSidebar != this.props.showLeftSidebar || nextProps.showLeftSidebar
  }

  render({attachedEngineSyncers, showLeftSidebar, consoleLog}) {
    return h('section',
      {
        ref: el => this.element = el,
        id: 'leftsidebar'
      },

      h(SplitContainer, {
        vertical: true,
        invert: true,
        sideSize: 200,

        sideContent: h(EnginePeerList, {
          attachedEngineSyncers
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
        })
      })
    )
  }
}
