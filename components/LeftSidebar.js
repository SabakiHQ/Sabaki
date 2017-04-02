const {h, Component} = require('preact')
const GtpConsole = require('./GtpConsole')
const setting = require('../modules/setting')

let sidebarMinWidth = setting.get('view.sidebar_minwidth')

class LeftSidebar extends Component {
    constructor() {
        super()

        this.handleVerticalResizerMouseDown = ({button, x, y}) => {
            if (button !== 0) return

            this.oldSidebarWidth = this.props.leftSidebarWidth
            this.oldMousePosition = [x, y]
            this.verticalResizerMouseDown = true
        }
    }

    shouldComponentUpdate(nextProps) {
        return nextProps.showLeftSidebar
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
                let {leftSidebarWidth} = this.props
                let diff = [evt.x, evt.y].map((x, i) => x - this.oldMousePosition[i])

                leftSidebarWidth = Math.max(sidebarMinWidth, this.oldSidebarWidth + diff[0])
                sabaki.setLeftSidebarWidth(leftSidebarWidth)
            }
        })
    }

    render({leftSidebarWidth}) {
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

            h(GtpConsole)
        )
    }
}

module.exports = LeftSidebar
