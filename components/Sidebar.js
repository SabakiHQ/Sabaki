const {h, Component} = require('preact')
const setting = require('../modules/setting')

const GameGraph = require('./GameGraph')
const CommentBox = require('./CommentBox')

let sidebarMinWidth = setting.get('view.sidebar_minwidth')
let sidebarMinSplit = setting.get('view.properties_minheight')

class Sidebar extends Component {
    constructor() {
        super()

        this.handleGraphNodeClick = evt => {
            let {button, treePosition, x, y} = evt

            if (button === 0) {
                sabaki.setCurrentTreePosition(...treePosition)
            } else {
                sabaki.openNodeMenu(...treePosition)
            }
        }

        this.handleVerticalResizerMouseDown = evt => {
            if (evt.button !== 0) return

            this.oldSidebarWidth = this.props.sidebarWidth
            this.oldMousePosition = [evt.x, evt.y]
            this.verticalResizerMouseDown = true
        }

        this.handleHorizontalResizerMouseDown = evt => {
            if (evt.button !== 0) return

            this.horizontalResizerMouseDown = true
        }
    }

    componentDidMount() {
        document.addEventListener('mouseup', () => {
            if (this.verticalResizerMouseDown || this.horizontalResizerMouseDown) {
                this.verticalResizerMouseDown = false
                this.horizontalResizerMouseDown = false
                this.setState({sidebarSplitTransition: false})
            }
        })

        document.addEventListener('mousemove', evt => {
            if (this.verticalResizerMouseDown) {
                let {sidebarWidth} = this.props
                let diff = [evt.x, evt.y].map((x, i) => x - this.oldMousePosition[i])

                sidebarWidth = Math.max(sidebarMinWidth, this.oldSidebarWidth - diff[0])
                sabaki.setSidebarWidth(sidebarWidth)
            } else if (this.horizontalResizerMouseDown) {
                let sidebarSplit = Math.min(100 - sidebarMinSplit,
                        Math.max(sidebarMinSplit, 100 - evt.y * 100 / this.element.offsetHeight))

                this.setState({sidebarSplitTransition: false})
                sabaki.setSidebarSplit(sidebarSplit)
            }
        })
    }

    render({
        treePosition,
        board,

        showGameGraph,
        showCommentBox,
        sidebarWidth,
        sidebarSplit,
        autoscrolling
    }, {sidebarSplitTransition = true}) {
        let [tree, index] = treePosition
        let node = tree.nodes[index]

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

            h(GameGraph, {
                treePosition,
                showGameGraph,
                viewportWidth: sidebarWidth,
                height: !showGameGraph ? 0
                    : !showCommentBox ? 100 : 100 - sidebarSplit,

                onNodeClick: this.handleGraphNodeClick
            }),

            h(CommentBox, {
                board,
                treePosition,
                moveAnnotation: 'BM' in node ? [-1, node.BM[0]]
                    : 'TE' in node ? [2, node.TE[0]]
                    : 'DO' in node ? [0, 1]
                    : 'IT' in node ? [1, 1]
                    : [null, 1],
                positionAnnotation: 'UC' in node ? [-2, node.UC[0]]
                    : 'GW' in node ? [-1, node.GW[0]]
                    : 'DM' in node ? [0, node.DM[0]]
                    : 'GB' in node ? [1, node.GB[0]]
                    : [null, 1],
                title: 'N' in node ? node.N[0].trim() : '',
                comment: 'C' in node ? node.C[0] : '',
                height: !showCommentBox ? 0
                    : !showGameGraph ? 100 : sidebarSplit,
                sidebarSplitTransition,

                onResizerMouseDown: this.handleHorizontalResizerMouseDown
            })
        )
    }
}

module.exports = Sidebar
