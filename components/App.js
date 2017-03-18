const fs = require('fs')
const {ipcRenderer, clipboard, remote} = require('electron')
const {app, dialog, Menu} = remote
const {h, render, options, Component} = require('preact')

const MainView = require('./MainView')
const LeftSidebar = require('./LeftSidebar')
const Sidebar = require('./Sidebar')
const DrawerManager = require('./DrawerManager')

const Board = require('../modules/board')
const sound = require('../modules/sound')
const gametree = require('../modules/gametree')
const setting = require('../modules/setting')

const sgf = require('../modules/sgf')
const ngf = require('../modules/ngf')
const gib = require('../modules/gib')

options.syncComponentUpdates = true

class App extends Component {
    constructor() {
        super()
        window.sabaki = this

        let emptyTree = this.getEmptyGameTree()

        this.state = {
            mode: 'play',
            openDrawer: null,
            busy: false,

            representedFilename: null,
            gameTrees: [emptyTree],
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

        this.window = remote.getCurrentWindow()

        this.componentWillUpdate({}, this.state)
    }

    componentDidMount() {
        this.window.show()
    }

    componentWillUpdate(_, nextState) {
        // document.title = app.getName()
    }

    setSelectedTool(toolId) {
        this.setState({selectedTool: toolId})
    }

    setCurrentPlayer(sign) {
        let [tree, index] = this.state.treePosition
        let node = tree.nodes[index]
        let intendedSign = 'B' in node || 'HA' in node && +node.HA[0] >= 1 ? -1 : +('W' in node)

        if (intendedSign == sign) {
            delete node.PL
        } else {
            node.PL = [sign > 0 ? 'B' : 'W']
        }

        this.setState(this.state)
    }

    setHotspot(hotspot) {
        let [tree, index] = this.state.treePosition
        let node = tree.nodes[index]

        if (hotspot) node.HO = [1]
        else delete node.HO

        this.setState(this.state)
    }

    setCurrentTreePosition(tree, index, {ignoreAutoplay = false} = {}) {
        if (['scoring', 'estimator'].includes(this.state.mode))
            return
        if (!ignoreAutoplay && this.state.autoplaying)
            this.setState({autoplaying: false})

        this.setState({treePosition: [tree, index]})
    }

    getEmptyGameTree() {
        let handicap = setting.get('game.default_handicap')
        let size = setting.get('game.default_board_size').toString().split(':').map(x => +x)
        let [width, height] = [size[0], size.slice(-1)[0]]
        let handicapStones = new Board(width, height).getHandicapPlacement(handicap).map(sgf.vertex2point)

        let sizeInfo = width === height ? width : `SZ[${width}:${height}]`
        let handicapInfo = handicapStones.length > 0 ? `HA[${handicap}]AB[${handicapStones.join('][')}]` : ''

        let buffer = `(;GM[1]FF[4]CA[UTF-8]
            AP[${app.getName()}:${app.getVersion()}]
            KM[${setting.get('game.default_komi')}]
            ${sizeInfo}${handicapInfo})`

        return sgf.parse(buffer)[0]
    }

    getSGF() {
        let {gameTrees} = this.state

        gameTrees.forEach(tree => {
            tree.nodes[0].AP = [`${app.getName()}:${app.getVersion()}`]
        })

        return sgf.stringify(gameTrees)
    }

    // Modes & Drawers

    setMode(mode) {
        this.setState({mode})
    }

    setOpenDrawer(drawer) {
        this.setState({openDrawer: drawer})
    }

    closeDrawers() {
        this.setOpenDrawer(null)
    }

    // File hashes

    generateTreeHash() {
        let hash = []

        for (let tree of this.state.gameTrees) {
            hash.push(gametree.getHash(tree))
        }

        return hash.join('')
    }

    generateFileHash() {
        let {representedFilename} = this.state
        if (!representedFilename) return null

        try {
            let content = fs.readFileSync(representedFilename, 'utf8')
            return helper.hash(content)
        } catch (err) {}

        return null
    }

    askForSave() {
        let hash = this.generateTreeHash()

        if (hash !== this.treeHash) {
            let answer = this.showMessageBox(
                'Your changes will be lost if you close this file without saving.',
                'warning',
                ['Save', 'Don’t Save', 'Cancel'], 2
            )

            if (answer === 0) return this.saveFile(this.state.representedFilename)
            else if (answer === 2) return false
        }

        return true
    }

    askForReload() {
        let hash = this.generateFileHash()

        if (hash != null && hash !== this.fileHash) {
            let answer = this.showMessageBox([
                `This file has been changed outside of ${app.getName()}.`,
                'Do you want to reload the file? Your changes will be lost.'
            ].join('\n'), 'warning', ['Reload', 'Don’t Reload'], 1)

            if (answer === 0) {
                sabaki.loadFile(this.state.representedFilename, {suppressAskForSave: true})
            }

            this.fileHash = hash
        }
    }

    // File methods

    newFile({sound = false, showInfo = false} = {}) {
        if (this.state.busy || !this.askForSave()) return

        let emptyTree = this.getEmptyGameTree()

        this.setState({
            openDrawer: showInfo ? 'info' : null,
            gameTrees: [emptyTree],
            treePosition: [emptyTree, 0],
            representedFilename: null
        })

        this.treeHash = this.generateTreeHash()
        this.fileHash = this.generateFileHash()

        if (sound) sound.playNewGame()
    }

    loadFile(filename = null, {suppressAskForSave = false} = {}) {
        if (this.state.busy || !suppressAskForSave && !this.askForSave()) return

        if (!filename) {
            let result = this.showOpenDialog({
                properties: ['openFile'],
                filters: [{name: 'Go Records', extensions: ['sgf', 'gib', 'ngf']}, {name: 'All Files', extensions: ['*']}]
            })

            if (result) filename = result[0]
            if (!filename) return
        }

        let {extname} = require('path')
        let format = extname.slice(1).toLowerCase()
        let content = fs.readFileSync(filename, {encoding: 'binary'})

        this.loadContent(content, format, {
            suppressAskForSave: true,
            callback: err => {
                if (err) return

                this.setState({representedFilename: filename})
                this.fileHash = this.generateFileHash()
            }
        })
    }

    loadContent(content, format, {
        suppressAskForSave = false,
        ignoreEncoding = false,
        callback = helper.noop
    } = {}) {
        if (this.state.busy || !suppressAskForSave && !this.askForSave()) return

        this.setState({busy: true, openDrawer: null})

        setTimeout(() => {
            let lastProgress = -1
            let error = false
            let gameTrees = []

            try {
                let fileFormatModule = {sgf, gib, ngf}[format] || sgf

                gameTrees = fileFormatModule.parse(content, evt => {
                    if (evt.progress - lastProgress < 0.1) return
                    this.window.setProgressBar(progress)
                }, ignoreEncoding)

                if (gameTrees.length == 0) throw true
            } catch (err) {
                this.showMessageBox('This file is unreadable.', 'warning')
                error = true
            }

            if (gameTrees.length != 0) {
                this.setState({
                    busy: false,
                    representedFilename: null,
                    gameTrees,
                    treePosition: [gameTrees[0], 0]
                })

                this.treeHash = this.generateTreeHash()
                this.fileHash = this.generateFileHash()
            }

            if (gameTrees.length > 1) {
                setTimeout(() => {
                    this.setState({openDrawer: 'gamechooser'})
                }, setting.get('gamechooser.show_delay'))
            }

            this.window.setProgressBar(0)
            callback(error)
        }, setting.get('app.loadgame_delay'))
    }

    saveFile(filename = null) {
        if (this.state.busy) return false

        if (!filename) {
            filename = this.showSaveDialog({
                filters: [sgf.meta, {name: 'All Files', extensions: ['*']}]
            })

            if (!filename) return false
        }

        fs.writeFileSync(filename, this.getSGF())

        this.setState({
            busy: false,
            representedFilename: filename
        })

        this.treeHash = this.generateTreeHash()
        this.fileHash = this.generateFileHash()

        return true
    }

    // Navigation

    goStep(step) {
        let treePosition = gametree.navigate(...this.state.treePosition, step)
        if (treePosition) this.setCurrentTreePosition(...treePosition)
    }

    goToMoveNumber(number) {
        number = +number

        if (isNaN(number)) return
        if (number < 0) number = 0

        let {treePosition} = this.state
        let root = gametree.getRoot(...treePosition)

        tp = gametree.navigate(root, 0, Math.round(number))

        if (tp) this.setCurrentTreePosition(...tp)
        else this.goToEnd()
    }

    goToNextFork() {
        let [tree, index] = this.state.treePosition

        if (index != tree.nodes.length - 1)
            this.setCurrentTreePosition(tree, tree.nodes.length - 1)
        else if (tree.current != null) {
            let subtree = tree.subtrees[tree.current]
            this.setCurrentTreePosition(subtree, subtree.nodes.length - 1)
        }
    }

    goToPreviousFork() {
        let [tree, index] = this.state.treePosition

        if (tree.parent == null || tree.parent.nodes.length == 0) {
            if (index != 0) this.setCurrentTreePosition(tree, 0)
        } else {
            this.setCurrentTreePosition(tree.parent, tree.parent.nodes.length - 1)
        }
    }

    goToComment(step) {
        let tp = this.state.treePosition

        while (true) {
            tp = gametree.navigate(...tp, step)
            if (!tp) break

            let node = tp[0].nodes[tp[1]]

            if (setting.get('sgf.comment_properties').some(p => p in node))
                break
        }

        if (tp) this.setCurrentTreePosition(...tp)
    }

    goToBeginning() {
        this.setCurrentTreePosition(gametree.getRoot(...this.state.treePosition), 0)
    }

    goToEnd() {
        let rootTree = gametree.getRoot(...this.state.treePosition)
        let tp = gametree.navigate(rootTree, 0, gametree.getCurrentHeight(rootTree) - 1)
        sabaki.setCurrentTreePosition(...tp)
    }

    goToSiblingVariation(sign) {
        let [tree, index] = this.state.treePosition

        sign = sign < 0 ? -1 : 1

        let mod = tree.parent.subtrees.length
        let i = (tree.parent.current + mod + sign) % mod

        this.setCurrentTreePosition(tree.parent.subtrees[i], 0)
    }

    goToMainVariation() {
        let tp = this.state.treePosition
        let root = sabaki.getRootTree()

        let [tree] = tp

        while (!gametree.onMainTrack(tree)) {
            tree = tree.parent
        }

        while (root.current != null) {
            root.current = 0
            root = root.subtrees[0]
        }

        if (gametree.onMainTrack(tp[0])) {
            this.setCurrentTreePosition(tree, tp[1])
        } else {
            this.setCurrentTreePosition(tree, tree.nodes.length - 1)
        }
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
            h(Sidebar, state),
            h(DrawerManager, state)
        )
    }
}

// Load userstyle

document.querySelector('head link.userstyle').href = setting.stylesPath

// Render

render(h(App), document.body)
