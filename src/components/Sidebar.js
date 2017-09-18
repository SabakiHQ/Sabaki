const {remote} = require('electron')
const {h, Component} = require('preact')

const gametree = require('../modules/gametree')
const helper = require('../modules/helper')
const setting = remote.require('./setting')

const Slider = require('./Slider')
const GameGraph = require('./GameGraph')
const CommentBox = require('./CommentBox')

let sidebarMinWidth = setting.get('view.sidebar_minwidth')
let sidebarMinSplit = setting.get('view.properties_minheight')

class Sidebar extends Component {
    constructor(props) {
        super()

        this.state = {
            sidebarSplit: setting.get('view.properties_height'),
            sidebarSplitTransition: true
        }

        this.handleGraphNodeClick = ({button, treePosition, x, y}) => {
            if (button === 0) {
                sabaki.setCurrentTreePosition(...treePosition)
            } else {
                sabaki.openNodeMenu(...treePosition, {x, y})
            }
        }

        this.handleVerticalResizerMouseDown = ({button, x, y}) => {
            if (button !== 0) return

            this.oldSidebarWidth = this.props.sidebarWidth
            this.oldMousePosition = [x, y]
            this.verticalResizerMouseDown = true
        }

        this.handleHorizontalResizerMouseDown = ({button}) => {
            if (button !== 0) return
            this.horizontalResizerMouseDown = true
        }

        this.handleSliderChange = ({percent}) => {
            let moveNumber = Math.round((this.state.treeHeight - 1) * percent)
            sabaki.goToMoveNumber(moveNumber)
        }

        this.handleStartAutoscrolling = ({step}) => {
            let minDelay = setting.get('autoscroll.min_interval')
            let diff = setting.get('autoscroll.diff')

            let scroll = (delay = null) => {
                sabaki.goStep(step)

                clearTimeout(this.autoscrollId)
                this.autoscrollId = setTimeout(() => scroll(Math.max(minDelay, delay - diff)), delay)
            }

            scroll(setting.get('autoscroll.max_interval'))
        }

        this.handleStopAutoscrolling = () => {
            clearTimeout(this.autoscrollId)
        }

        this.handleCommentInput = evt => {
            sabaki.setComment(...this.props.treePosition, evt)
        }

        this.componentWillReceiveProps(props)
    }

    shouldComponentUpdate(nextProps) {
        return nextProps.showSidebar != this.props.showSidebar || nextProps.showSidebar
    }

    componentWillReceiveProps({treePosition, rootTree} = {}) {
        // Update tree height

        if (this.props && treePosition === this.props.treePosition) return
        this.setState({treeHeight: gametree.getHeight(rootTree)})
    }

    componentDidMount() {
        document.addEventListener('mouseup', () => {
            if (this.verticalResizerMouseDown || this.horizontalResizerMouseDown) {
                this.verticalResizerMouseDown = false
                this.horizontalResizerMouseDown = false

                setting.set('view.properties_height', this.state.sidebarSplit)
                setting.set('view.sidebar_width', this.props.sidebarWidth)
                this.setState({sidebarSplitTransition: false})
                window.dispatchEvent(new Event('resize'))
            }
        })

        document.addEventListener('mousemove', evt => {
            if (this.verticalResizerMouseDown) {
                evt.preventDefault()

                let {sidebarWidth} = this.props
                let diff = [evt.clientX, evt.clientY].map((x, i) => x - this.oldMousePosition[i])

                sidebarWidth = Math.max(sidebarMinWidth, this.oldSidebarWidth - diff[0])
                sabaki.setSidebarWidth(sidebarWidth)
            } else if (this.horizontalResizerMouseDown) {
                evt.preventDefault()

                let sidebarSplit = Math.min(100 - sidebarMinSplit,
                    Math.max(sidebarMinSplit, 100 - evt.clientY * 100 / this.element.offsetHeight))

                this.setState({sidebarSplit, sidebarSplitTransition: false})
            }
        })
    }

    render({
        mode,
        treePosition,
        rootTree,
        showGameGraph,
        showCommentBox,
        sidebarWidth,

        graphGridSize,
        graphNodeSize
    }, {
        treeHeight,
        sidebarSplit,
        sidebarSplitTransition
    }) {
        let [tree, index] = treePosition
        let node = tree.nodes[index]
        let level = gametree.getLevel(tree, index)

        return h('section',
            {
                ref: el => this.element = el,
                id: 'sidebar',
                style: {width: sidebarWidth}
            },

            h('div', {
                class: 'verticalresizer',
                onMouseDown: this.handleVerticalResizerMouseDown
            }),

            h(Slider, {
                showSlider: showGameGraph,
                text: level,
                percent: (level / (treeHeight - 1)) * 100,
                height: !showGameGraph ? 0 : !showCommentBox ? 100 : 100 - sidebarSplit,

                onChange: this.handleSliderChange,
                onStartAutoscrolling: this.handleStartAutoscrolling,
                onStopAutoscrolling: this.handleStopAutoscrolling
            }),

            h(GameGraph, {
                treePosition,
                showGameGraph,
                viewportWidth: sidebarWidth,
                height: !showGameGraph ? 0 : !showCommentBox ? 100 : 100 - sidebarSplit,
                gridSize: graphGridSize,
                nodeSize: graphNodeSize,

                onNodeClick: this.handleGraphNodeClick
            }),

            h(CommentBox, {
                mode,
                treePosition,
                showCommentBox,
                moveAnnotation: 'BM' in node ? [-1, node.BM[0]]
                    : 'DO' in node ? [0, 1]
                    : 'IT' in node ? [1, 1]
                    : 'TE' in node ? [2, node.TE[0]]
                    : [null, 1],
                positionAnnotation: 'UC' in node ? [-2, node.UC[0]]
                    : 'GW' in node ? [-1, node.GW[0]]
                    : 'DM' in node ? [0, node.DM[0]]
                    : 'GB' in node ? [1, node.GB[0]]
                    : [null, 1],
                title: 'N' in node ? node.N[0].trim() : '',
                comment: 'C' in node ? node.C[0] : '',
                height: !showCommentBox ? 0 : !showGameGraph ? 100 : sidebarSplit,
                sidebarSplitTransition,

                onResizerMouseDown: this.handleHorizontalResizerMouseDown,
                onCommentInput: this.handleCommentInput
            })
        )
    }
}

module.exports = Sidebar
