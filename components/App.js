const fs = require('fs')
const {ipcRenderer, clipboard, remote} = require('electron')
const {app, dialog, Menu} = remote
const {h, render, Component} = require('preact')
const Pikaday = require('pikaday')

const MainView = require('./MainView')
const LeftSidebar = require('./LeftSidebar')
const Sidebar = require('./Sidebar')

const $ = require('../modules/sprint')
const sgf = require('../modules/sgf')
const fuzzyfinder = require('../modules/fuzzyfinder')
const gametree = require('../modules/gametree')
const sound = require('../modules/sound')
const helper = require('../modules/helper')
const setting = require('../modules/setting')
const gtp = require('../modules/gtp')
const Board = require('../modules/board')

class App extends Component {
    constructor() {
        super()
        
        let emptyTree = this.getEmptyGameTree()

        this.state = {
            app: this,
            mode: 'play',
            busy: false,

            representedFilename: null,
            gameTrees: [emptyTree],
            gameIndex: 0,
            treePosition: [emptyTree, 0],

            undoable: false,
            selectedTool: 'stone_1',
            scoringMethod: setting.get('scoring.method'),

            showCoordinates: setting.get('view.show_coordinates'),
            showMoveColorization: setting.get('view.show_move_colorization'),
            showNextMoves: setting.get('view.show_next_moves'),
            showSiblings: setting.get('view.show_siblings'),
            fuzzyStonePlacement: setting.get('view.fuzzy_stone_placement'),
            animatedStonePlacement: setting.get('view.animated_stone_placement'),

            showLeftSidebar: setting.get('view.show_leftsidebar'),
            leftSidebarWidth: setting.get('view.leftsidebar_width'),
            showGameTree: setting.get('view.show_graph'),
            showCommentBox: setting.get('view.show_comments'),
            sidebarWidth: setting.get('view.sidebar_width'),
            sidebarSplit: setting.get('view.properties_height')
        }
    }

    componentDidMount() {
        remote.getCurrentWindow().show()
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

    render(_, state) {
        return h('section',
            {
                class: {
                    leftsidebar: state.showLeftSidebar,
                    sidebar: state.showGameTree || state.showCommentBox
                }
            },

            h(MainView, state),
            h(LeftSidebar, state),
            h(Sidebar, state)
        )
    }
}

render(h(App), document.body)
