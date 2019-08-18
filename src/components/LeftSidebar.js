const {h, Component} = require('preact')

const GtpConsole = require('./GtpConsole')

class LeftSidebar extends Component {
    constructor() {
        super()

        this.handleCommandSubmit = ({engineIndex, command}) => {
        }
    }

    shouldComponentUpdate(nextProps) {
        return nextProps.showLeftSidebar != this.props.showLeftSidebar || nextProps.showLeftSidebar
    }

    render({showLeftSidebar, consoleLog}) {
        return h('section',
            {
                ref: el => this.element = el,
                id: 'leftsidebar'
            },

            h(GtpConsole, {
                show: showLeftSidebar,
                consoleLog,
                engineIndex: 0,
                attachedEngines: [],

                onSubmit: this.handleCommandSubmit
            })
        )
    }
}

module.exports = LeftSidebar
