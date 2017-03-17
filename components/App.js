const fs = require('fs')
const {ipcRenderer, clipboard, remote} = require('electron')
const {app, dialog, Menu} = remote
const {h, render, Component} = require('preact')

const MainView = require('./MainView')
const LeftSidebar = require('./LeftSidebar')
const Sidebar = require('./Sidebar')

const sgf = require('../modules/sgf')
const gametree = require('../modules/gametree')
const setting = require('../modules/setting')

class App extends Component {
    constructor() {
        super()

        let emptyTree = this.getEmptyGameTree()

        this.state = {
            mode: 'play',
            openDrawer: null,
            busy: false,

            representedFilename: null,
            gameTrees: [emptyTree],
            gameIndex: 0,
            treePosition: [emptyTree, 0],

            // Bar state

            undoable: false,
            undoText: 'Undo',
            selectedTool: 'stone_1',
            autoplaying: false,
            secondsPerMove: setting.get('autoplay.sec_per_move'),
            scoringMethod: setting.get('scoring.method'),
            findText: '',

            // Board state

            showCoordinates: setting.get('view.show_coordinates'),
            showMoveColorization: setting.get('view.show_move_colorization'),
            showNextMoves: setting.get('view.show_next_moves'),
            showSiblings: setting.get('view.show_siblings'),
            fuzzyStonePlacement: setting.get('view.fuzzy_stone_placement'),
            animatedStonePlacement: setting.get('view.animated_stone_placement'),

            // Sidebar state

            showLeftSidebar: setting.get('view.show_leftsidebar'),
            leftSidebarWidth: setting.get('view.leftsidebar_width'),
            showGameGraph: setting.get('view.show_graph'),
            showCommentBox: setting.get('view.show_comments'),
            sidebarWidth: setting.get('view.sidebar_width'),
            autoscrolling: 0
        }

        window.sabaki = this
        this.componentWillUpdate({}, this.state)
    }

    componentDidMount() {
        remote.getCurrentWindow().show()
    }

    componentWillUpdate(_, nextState) {
        document.title = app.getName()
    }

    getEmptyGameTree() {
        let handicap = setting.get('game.default_handicap')
        let size = setting.get('game.default_board_size').toString().split(':').map(x => +x)
        let [width, height] = [size[0], size.slice(-1)[0]]
        let stones = new Board(width, height).getHandicapPlacement(handicap).map(sgf.vertex2point)

        let buffer = [
            `;GM[1]FF[4]CA[UTF-8]`,
            `AP[${app.getName()}:${app.getVersion()}]`,
            `KM[${setting.get('game.default_komi')}]`,
            `SZ[${width}:${height}]`,
            stones.length > 0 ? `HA[${handicap}]AB[${stones.join('][')}]` : ''
        ].join('')

        return sgf.parse(sgf.tokenize(buffer))
    }

    goStep(step) {
        let treePosition = gametree.navigate(...this.state.treePosition, step)
        if (treePosition) this.setState({treePosition})
    }

    render(_, state) {
        return h('section',
            {
                class: {
                    leftsidebar: state.showLeftSidebar,
                    sidebar: state.showGameGraph || state.showCommentBox,
                    [state.mode]: true
                }
            },

            h(MainView, state),
            h(LeftSidebar, state),
            h(Sidebar, state)
        )
    }
}

render(h(App), document.body)
