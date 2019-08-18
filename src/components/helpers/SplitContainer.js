const {h, Component} = require('preact')

class SplitContainer extends Component {
    constructor(props) {
        super(props)

        this.handleResizerMouseDown = evt => {
            if (evt.button !== 0) return
            this.resizerMouseDown = true
        }

        this.handleMouseUp = evt => {
            this.resizerMouseDown = false
        }

        this.handleMouseMove = evt => {
            if (!this.resizerMouseDown) return

            let {vertical, invert, onChange = () => {}} = this.props
            let rect = this.element.getBoundingClientRect()

            let mousePosition = !vertical ? evt.clientX : evt.clientY
            let containerBegin = !vertical ? rect.left : rect.top
            let containerEnd = !vertical ? rect.right : rect.bottom
            let sideSize = !invert ? containerEnd - mousePosition : mousePosition - containerBegin

            onChange({sideSize})
        }
    }

    componentDidMount() {
        document.addEventListener('mouseup', this.handleMouseUp)
        document.addEventListener('mousemove', this.handleMouseMove)
    }

    componentWillUnmount() {
        document.removeEventListener('mouseup', this.handleMouseUp)
        document.removeEventListener('mousemove', this.handleMouseMove)
    }

    render() {
        let {
            id,
            class: classNames = '',
            style = {},
            vertical,
            invert,
            sideContent,
            mainContent,
            sideSize = 200,
            splitterSize = 5
        } = this.props

        let gridTemplate = ['1fr', `${sideSize}px`]
        if (invert) gridTemplate.reverse()

        let gridTemplateRows = !vertical ? 'none' : gridTemplate.join(' ')
        let gridTemplateColumns = vertical ? 'none' : gridTemplate.join(' ')

        let resizer = h('div', {
            class: 'resizer',
            style: {
                position: 'absolute',
                width: vertical ? 'auto' : splitterSize,
                height: !vertical ? 'auto' : splitterSize,
                cursor: vertical ? 'ns-resize' : 'ew-resize',
                left: vertical ? 0 : !invert ? 0 : 'auto',
                right: vertical ? 0 : invert ? 0 : 'auto',
                top: !vertical ? 0 : !invert ? 0 : 'auto',
                bottom: !vertical ? 0 : invert ? 0 : 'auto',
            },

            onMouseDown: this.handleResizerMouseDown
        })

        return h('div',
            {
                ref: el => this.element = el,
                id,
                class: `split-container ${classNames}`,
                style: {
                    ...style,
                    display: 'grid',
                    gridTemplate: `${gridTemplateRows} / ${gridTemplateColumns}`
                }
            },

            !invert && mainContent,

            h('div',
                {
                    class: 'side',
                    style: {
                        position: 'relative',
                        display: 'grid',
                        gridTemplate: '1fr / 1fr'
                    }
                },
                [sideContent, resizer]
            ),

            invert && mainContent,
        )
    }
}

module.exports = SplitContainer
