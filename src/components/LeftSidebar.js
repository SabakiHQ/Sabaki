const {remote} = require('electron')
const {h, Component} = require('preact')

const GtpConsole = require('./GtpConsole')
const gametree = require('../modules/gametree')
const setting = remote.require('./setting')

let sidebarMinWidth = setting.get('view.sidebar_minwidth')
let maxConsoleLength = setting.get('console.max_history_count')

class LeftSidebar extends Component {
    constructor() {
        super()

        this.handleVerticalResizerMouseDown = ({button, x, y}) => {
            if (button !== 0) return

            this.oldSidebarWidth = this.props.leftSidebarWidth
            this.oldMousePosition = [x, y]
            this.verticalResizerMouseDown = true
        }

        this.handleCommandSubmit = ({engineIndex, command}) => {
            let blockedCommands = setting.get('console.blocked_commands')

            if (blockedCommands.includes(command.name)) {
                sabaki.setState(({consoleLog}) => {
                    let newLog = consoleLog.slice(consoleLog.length >= maxConsoleLength ? 1 : 0)

                    newLog.push({
                        sign: engineIndex === 0 ? 1 : -1,
                        name: this.props.attachedEngines[engineIndex].name,
                        command,
                        response: {id: command.id, content: 'blocked command', error: true, internal: true}
                    })

                    return {consoleLog: newLog}
                })
            } else {
                let controller = sabaki.attachedEngineControllers[engineIndex]
                if (controller != null) controller.sendCommand(command)
            }
        }
    }

    shouldComponentUpdate(nextProps) {
        return nextProps.showLeftSidebar != this.props.showLeftSidebar || nextProps.showLeftSidebar
    }

    componentDidMount() {
        document.addEventListener('mouseup', () => {
            if (this.verticalResizerMouseDown) {
                this.verticalResizerMouseDown = false
                setting.set('view.leftsidebar_width', this.props.leftSidebarWidth)
                window.dispatchEvent(new Event('resize'))
            }
        })

        document.addEventListener('mousemove', evt => {
            if (this.verticalResizerMouseDown) {
                evt.preventDefault()

                let {leftSidebarWidth} = this.props
                let diff = [evt.clientX, evt.clientY].map((x, i) => x - this.oldMousePosition[i])

                leftSidebarWidth = Math.max(sidebarMinWidth, this.oldSidebarWidth + diff[0])
                sabaki.setLeftSidebarWidth(leftSidebarWidth)
            }
        })
    }

    render({treePosition, leftSidebarWidth, consoleLog, attachedEngines, engineCommands}) {
        return h('section',
            {
                ref: el => this.element = el,
                id: 'leftsidebar',
                style: {width: leftSidebarWidth}
            },

            h('div', {
                class: 'verticalresizer',
                onMouseDown: this.handleVerticalResizerMouseDown
            }),

            h(GtpConsole, {
                consoleLog,
                attachedEngines,
                engineCommands,

                onSubmit: this.handleCommandSubmit
            })
        )
    }
}

module.exports = LeftSidebar
