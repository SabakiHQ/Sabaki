const {remote} = require('electron')
const {h, Component} = require('preact')

const setting = remote.require('./setting')

const SplitContainer = require('./helpers/SplitContainer')
const WinrateGraph = require('./WinrateGraph')
const Slider = require('./Slider')
const GameGraph = require('./GameGraph')
const CommentBox = require('./CommentBox')

let propertiesMinHeight = setting.get('view.properties_minheight')
let winrateGraphMinHeight = setting.get('view.winrategraph_minheight')
let winrateGraphMaxHeight = setting.get('view.winrategraph_maxheight')

class Sidebar extends Component {
    constructor(props) {
        super(props)

        this.state = {
            winrateGraphHeight: setting.get('view.winrategraph_height'),
            sidebarSplit: setting.get('view.properties_height')
        }

        this.handleGraphNodeClick = ({button, gameTree, treePosition, x, y}) => {
            if (button === 0) {
                sabaki.setCurrentTreePosition(gameTree, treePosition)
            } else {
                sabaki.openNodeMenu(gameTree, treePosition, {x, y})
            }
        }

        this.handleSliderChange = ({percent}) => {
            let moveNumber = Math.round((this.props.gameTree.getHeight() - 1) * percent)
            sabaki.goToMoveNumber(moveNumber)
        }

        this.handleWinrateGraphChange = ({index}) => {
            sabaki.goToMoveNumber(index)
        }

        this.handleSidebarSplitChange = ({sideSize}) => {
            sideSize = Math.min(Math.max(
                propertiesMinHeight,
                sideSize
            ), 100 - propertiesMinHeight)

            this.setState({sidebarSplit: sideSize})
        }

        this.handleSidebarSplitFinish = () => {
            setting.set('view.properties_height', this.state.sidebarSplit)
        }

        this.handleWinrateGraphSplitChange = ({sideSize}) => {
            sideSize = Math.min(
                Math.max(winrateGraphMinHeight, sideSize),
                winrateGraphMaxHeight
            )

            this.setState({winrateGraphHeight: sideSize})
        }

        this.handleWinrateGraphSplitFinish = () => {
            setting.set('view.winrategraph_height', this.state.winrateGraphHeight)
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

        graphGridSize,
        graphNodeSize
    }, {
        winrateData,
        winrateGraphHeight,
        sidebarSplit
    }) {
        let node = gameTree.get(treePosition)
        let winrateGraphWidth = Math.max(Math.ceil((gameTree.getHeight() - 1) / 50) * 50, 1)
        let level = gameTree.getLevel(treePosition)
        let showWinrateGraph = winrateData.some(x => x != null)

        return h('section',
            {
                ref: el => this.element = el,
                id: 'sidebar'
            },

            h(SplitContainer, {
                vertical: true,
                invert: true,
                sideSize: !showWinrateGraph ? 0 : winrateGraphHeight,

                sideContent: h(WinrateGraph, {
                    width: winrateGraphWidth,
                    data: winrateData,
                    currentIndex: level,
                    onCurrentIndexChange: this.handleWinrateGraphChange
                }),

                mainContent: h(SplitContainer, {
                    vertical: true,
                    sideSize: !showGameGraph ? 100 : !showCommentBox ? 0 : sidebarSplit,
                    procentualSplit: true,

                    mainContent: h('div',
                        {
                            ref: el => this.horizontalSplitContainer = el,
                            class: 'graphproperties'
                        },

                        h(Slider, {
                            showSlider: showGameGraph,
                            text: level,
                            percent: gameTree.getHeight() <= 1 ? 0
                                : (level / (gameTree.getHeight() - 1)) * 100,

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
                        })
                    ),

                    sideContent: h(CommentBox, {
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

                        onCommentInput: this.handleCommentInput
                    }),

                    onChange: this.handleSidebarSplitChange,
                    onFinish: this.handleSidebarSplitFinish
                }),

                onChange: this.handleWinrateGraphSplitChange,
                onFinish: this.handleWinrateGraphSplitFinish
            })
        )
    }
}

module.exports = Sidebar
