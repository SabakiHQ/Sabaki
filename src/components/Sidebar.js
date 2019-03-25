const {remote} = require('electron')
const {h, Component} = require('preact')
const classNames = require('classnames')

const setting = remote.require('./setting')

const WinrateGraph = require('./WinrateGraph')
const Slider = require('./Slider')
const GameGraph = require('./GameGraph')
const CommentBox = require('./CommentBox')

let sidebarMinWidth = setting.get('view.sidebar_minwidth')
let sidebarMinSplit = setting.get('view.properties_minheight')

class Sidebar extends Component {
    constructor(props) {
        super(props)

        this.state = {
            sidebarSplit: setting.get('view.properties_height'),
            sidebarSplitTransition: true
        }

        this.handleGraphNodeClick = ({button, gameTree, treePosition, x, y}) => {
            if (button === 0) {
                sabaki.setCurrentTreePosition(gameTree, treePosition)
            } else {
                sabaki.openNodeMenu(gameTree, treePosition, {x, y})
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
            let moveNumber = Math.round((this.props.gameTree.getHeight() - 1) * percent)
            sabaki.goToMoveNumber(moveNumber)
        }

        this.handleWinrateGraphChange = ({index}) => {
            sabaki.goToMoveNumber(index)
        }

        this.handleStartAutoscrolling = ({step}) => {
            sabaki.startAutoscrolling(step)
        }

        this.handleStopAutoscrolling = () => {
            sabaki.stopAutoscrolling()
        }

        this.handleCommentInput = evt => {
            sabaki.setComment(this.props.gameTree, this.props.treePosition, evt)
        }

        this.componentWillReceiveProps(props)
    }

    shouldComponentUpdate(nextProps) {
        return nextProps.showSidebar != this.props.showSidebar || nextProps.showSidebar
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

                let {top, height} = this.horizontalSplitContainer.getBoundingClientRect()

                let sidebarSplit = Math.min(
                    100 - sidebarMinSplit,
                    Math.max(sidebarMinSplit, 100 - (evt.clientY - top) * 100 / height)
                )

                this.setState({sidebarSplit, sidebarSplitTransition: false})
            }
        })
    }

    componentWillReceiveProps({gameTree, gameCurrents, gameIndex} = {}) {
        // Get winrate data

        let currentTrack = [...gameTree.listCurrentNodes(gameCurrents[gameIndex])]
        let winrateData = currentTrack.map(x => x.data.SBKV && x.data.SBKV[0])

        this.setState({winrateData})
    }

    componentDidUpdate(_, {winrateData}) {
        if (winrateData.some(x => x != null) !== this.state.winrateData.some(x => x != null)) {
            this.gameGraph.remeasure()
        }
    }

    render({
        mode,
        gameIndex,
        gameTree,
        gameCurrents,
        treePosition,
        showGameGraph,
        showCommentBox,
        sidebarWidth,

        graphGridSize,
        graphNodeSize
    }, {
        winrateData,
        sidebarSplit,
        sidebarSplitTransition
    }) {
        let node = gameTree.get(treePosition)
        let winrateGraphWidth = Math.max(Math.ceil((gameTree.getHeight() - 1) / 50) * 50, 1)
        let level = gameTree.getLevel(treePosition)
        let showWinrateGraph = winrateData.some(x => x != null)

        return h('section',
            {
                ref: el => this.element = el,
                id: 'sidebar',
                class: classNames({
                    showwinrate: showWinrateGraph
                }),
                style: {width: sidebarWidth}
            },

            h('div', {
                class: 'verticalresizer',
                onMouseDown: this.handleVerticalResizerMouseDown
            }),

            h(WinrateGraph, {
                width: winrateGraphWidth,
                data: winrateData,
                currentIndex: level,
                onCurrentIndexChange: this.handleWinrateGraphChange
            }),

            h('div', {ref: el => this.horizontalSplitContainer = el, class: 'graphproperties'},
                h(Slider, {
                    showSlider: showGameGraph,
                    text: level,
                    percent: (level / (gameTree.getHeight() - 1)) * 100,
                    height: !showGameGraph ? 0 : !showCommentBox ? 100 : 100 - sidebarSplit,

                    onChange: this.handleSliderChange,
                    onStartAutoscrolling: this.handleStartAutoscrolling,
                    onStopAutoscrolling: this.handleStopAutoscrolling
                }),

                h(GameGraph, {
                    ref: component => this.gameGraph = component,

                    gameTree,
                    gameCurrents: gameCurrents[gameIndex],
                    treePosition,
                    showGameGraph,
                    height: !showGameGraph ? 0 : !showCommentBox ? 100 : 100 - sidebarSplit,
                    gridSize: graphGridSize,
                    nodeSize: graphNodeSize,

                    onNodeClick: this.handleGraphNodeClick
                }),

                h(CommentBox, {
                    mode,
                    gameTree,
                    treePosition,
                    showCommentBox,
                    moveAnnotation: node.data.BM != null ? [-1, node.data.BM[0]]
                        : node.data.DO != null ? [0, 1]
                        : node.data.IT != null ? [1, 1]
                        : node.data.TE != null ? [2, node.data.TE[0]]
                        : [null, 1],
                    positionAnnotation: node.data.UC != null ? [-2, node.data.UC[0]]
                        : node.data.GW != null ? [-1, node.data.GW[0]]
                        : node.data.DM != null ? [0, node.data.DM[0]]
                        : node.data.GB != null ? [1, node.data.GB[0]]
                        : [null, 1],
                    title: node.data.N != null ? node.data.N[0] : '',
                    comment: node.data.C != null ? node.data.C[0] : '',
                    height: !showCommentBox ? 0 : !showGameGraph ? 100 : sidebarSplit,
                    sidebarSplitTransition,

                    onResizerMouseDown: this.handleHorizontalResizerMouseDown,
                    onCommentInput: this.handleCommentInput
                })
            )
        )
    }
}

module.exports = Sidebar
