const {h, Component} = require('preact')

const GtpConsole = require('./GtpConsole')

class LeftSidebar extends Component {
  constructor() {
    super()

    this.handleCommandSubmit = ({engineIndex, command}) => {
      let syncer = sabaki.attachedEngineSyncers[engineIndex]
      if (syncer != null) syncer.controller.sendCommand(command)
    }
  }

  shouldComponentUpdate(nextProps) {
    return (
      nextProps.showLeftSidebar != this.props.showLeftSidebar ||
      nextProps.showLeftSidebar
    )
  }

  render({showLeftSidebar, consoleLog, attachedEngines, engineCommands}) {
    return h(
      'section',
      {
        ref: el => (this.element = el),
        id: 'leftsidebar'
      },

      h(GtpConsole, {
        show: showLeftSidebar,
        consoleLog,
        attachedEngines,
        engineCommands,

        onSubmit: this.handleCommandSubmit
      })
    )
  }
}

module.exports = LeftSidebar
