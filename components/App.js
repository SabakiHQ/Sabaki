const fs = require('fs')
const EventEmitter = require('events')
const {ipcRenderer, clipboard, remote} = require('electron')
const {app, Menu} = remote
const {h, render, Component} = require('preact')
const classNames = require('classnames')

const MainView = require('./MainView')
const LeftSidebar = require('./LeftSidebar')
const Sidebar = require('./Sidebar')
const DrawerManager = require('./DrawerManager')
const InputBox = require('./InputBox')
const BusyScreen = require('./BusyScreen')

const Board = require('../modules/board')
const boardmatcher = require('../modules/boardmatcher')
const deadstones = require('../modules/deadstones')
const dialog = require('../modules/dialog')
const fileformats = require('../modules/fileformats')
const gametree = require('../modules/gametree')
const gtp = require('../modules/gtp')
const helper = require('../modules/helper')
const setting = remote.require('./modules/setting')
const {sgf} = fileformats
const sound = require('../modules/sound')

class App extends Component {
    constructor() {
        super()
        window.sabaki = this

        let emptyTree = gametree.new()
        emptyTree.nodes.push({})

        this.state = {
            mode: 'play',
            openDrawer: null,
            busy: false,
            fullScreen: false,

            representedFilename: null,
            gameTrees: [emptyTree],
            treePosition: [emptyTree, 0],

            // Bars

            undoable: false,
            undoText: 'Undo',
            selectedTool: 'stone_1',
            scoringMethod: null,
            findText: '',
            findVertex: null,
            deadStones: [],
            blockedGuesses: [],

            // Goban

            highlightVertices: [],
            showCoordinates: null,
            showMoveColorization: null,
            showNextMoves: null,
            showSiblings: null,
            fuzzyStonePlacement: null,
            animatedStonePlacement: null,
            animatedVertex: null,

            // Sidebar

            showConsole: null,
            consoleLog: [],
            leftSidebarWidth: null,
            showGameGraph: null,
            showCommentBox: null,
            sidebarWidth: null,
            graphGridSize: null,
            graphNodeSize: null,

            // Engines

            engines: null,
            attachedEngines: [null, null],
            engineCommands: [[], []],
            generatingMoves: false,

            // Drawers

            preferencesTab: 'general',

            // Input Box

            showInputBox: false,
            inputBoxText: '',
            onInputBoxSubmit: helper.noop,
            onInputBoxCancel: helper.noop
        }

        this.events = new EventEmitter()
        this.appName = app.getName()
        this.version = app.getVersion()
        this.window = remote.getCurrentWindow()

        this.treeHash = this.generateTreeHash()
        this.attachedEngineControllers = [null, null]
        this.engineBoards = [null, null]

        // Expose submodules

        this.modules = {Board, boardmatcher, deadstones, dialog,
            fileformats, gametree, gtp, helper, setting, sound}

        // Bind state to settings

        setting.events.on('change', ({key}) => this.updateSettingState(key))
        this.updateSettingState()
    }

    componentDidMount() {
        window.addEventListener('load', () => {
            this.window.show()
            this.events.emit('ready')
        })

        ipcRenderer.on('load-file', (evt, ...args) => {
            setTimeout(() => this.loadFile(...args), setting.get('app.loadgame_delay'))
        })

        this.window.on('focus', () => {
            if (setting.get('file.show_reload_warning')) {
                this.askForReload()
            }

            ipcRenderer.send('build-menu', this.state.busy)
        })

        this.window.on('resize', () => {
            clearTimeout(this.resizeId)

            this.resizeId = setTimeout(() => {
                if (!this.window.isMaximized() && !this.window.isMinimized() && !this.window.isFullScreen()) {
                    let [width, height] = this.window.getContentSize()
                    setting.set('window.width', width).set('window.height', height)
                }
            }, 500)
        })

        // Handle main menu items

        let menuData = require('../data/menu')

        let handleMenuClicks = menu => {
            for (let item of menu) {
                if ('click' in item) {
                    ipcRenderer.on(`menu-click-${item.id}`, () => {
                        dialog.closeInputBox()
                        item.click()
                    })
                }

                if ('submenu' in item) {
                    handleMenuClicks(item.submenu)
                }
            }
        }

        handleMenuClicks(menuData)

        // Handle file drag & drop

        document.body.addEventListener('dragover', evt => evt.preventDefault())
        document.body.addEventListener('drop', evt => {
            evt.preventDefault()

            if (evt.dataTransfer.files.length === 0) return
            this.loadFile(evt.dataTransfer.files[0].path)
        })

        // Handle escape key

        document.addEventListener('keyup', evt => {
            if (evt.keyCode === 27) {
                // Escape

                if (this.state.generatingMoves) {
                    this.stopGeneratingMoves()
                } else if (this.state.openDrawer != null) {
                    this.closeDrawer()
                } else if (this.state.mode !== 'play') {
                    this.setMode('play')
                } else if (this.state.fullScreen) {
                    this.setState({fullScreen: false})
                }
            }
        })

        // Handle window closing

        window.addEventListener('beforeunload', evt => {
            if (this.closeWindow) return

            evt.returnValue = ' '

            setTimeout(() => {
                if (this.askForSave()) {
                    this.detachEngines()
                    this.closeWindow = true
                    this.window.close()
                }
            })
        })

        this.newFile()
    }

    componentDidUpdate(_, prevState) {
        // Update title

        let {basename} = require('path')
        let title = this.appName
        let {representedFilename, gameTrees, treePosition: [tree, ]} = this.state

        if (representedFilename)
            title = basename(representedFilename)
        if (gameTrees.length > 1)
            title += ' — Game ' + (this.inferredState.gameIndex + 1)
        if (representedFilename && process.platform != 'darwin')
            title += ' — ' + this.appName

        if (document.title !== title)
            document.title = title

        // Handle full screen

        if (prevState.fullScreen !== this.state.fullScreen) {
            this.window.setFullScreen(this.state.fullScreen)
            this.window.setMenuBarVisibility(!this.state.fullScreen)
            this.window.setAutoHideMenuBar(this.state.fullScreen)
        }

        // Handle sidebar showing/hiding

        if (prevState.showLeftSidebar !== this.state.showLeftSidebar
        || prevState.showSidebar !== this.state.showSidebar) {
            let [width, height] = this.window.getContentSize()
            let widthDiff = 0

            if (prevState.showSidebar !== this.state.showSidebar) {
                widthDiff += this.state.sidebarWidth * (this.state.showSidebar ? 1 : -1)
            }

            if (prevState.showLeftSidebar !== this.state.showLeftSidebar) {
                widthDiff += this.state.leftSidebarWidth * (this.state.showLeftSidebar ? 1 : -1)
            }

            this.window.setContentSize(width + widthDiff, height)
        }
    }

    updateSettingState(key = null) {
        let data = {
            'view.show_coordinates': 'showCoordinates',
            'view.show_move_colorization': 'showMoveColorization',
            'view.show_next_moves': 'showNextMoves',
            'view.show_siblings': 'showSiblings',
            'view.fuzzy_stone_placement': 'fuzzyStonePlacement',
            'view.animated_stone_placement': 'animatedStonePlacement',
            'view.show_leftsidebar': 'showConsole',
            'view.leftsidebar_width': 'leftSidebarWidth',
            'view.show_graph': 'showGameGraph',
            'view.show_comments': 'showCommentBox',
            'view.sidebar_width': 'sidebarWidth',
            'graph.grid_size': 'graphGridSize',
            'graph.node_size': 'graphNodeSize',
            'engines.list': 'engines',
            'scoring.method': 'scoringMethod'
        }

        if (key == null) {
            for (let k in data) this.updateSettingState(k)
            return
        }

        if (key in data) {
            this.setState({[data[key]]: setting.get(key)})
        }

        if (key === 'engines.list') {
            ipcRenderer.send('build-menu')
        }
    }

    // User Interface

    setSidebarWidth(sidebarWidth) {
        this.setState({sidebarWidth}, () => window.dispatchEvent(new Event('resize')))
    }

    setLeftSidebarWidth(leftSidebarWidth) {
        this.setState({leftSidebarWidth}, () => window.dispatchEvent(new Event('resize')))
    }

    setMode(mode) {
        let stateChange = {mode}

        if (['scoring', 'estimator'].includes(mode)) {
            // Guess dead stones

            let {guess} = require('../modules/deadstones')
            let {treePosition} = this.state
            let iterations = setting.get('score.estimator_iterations')
            let deadStones = guess(gametree.getBoard(...treePosition), mode === 'scoring', iterations)

            Object.assign(stateChange, {deadStones})
        }

        this.setState(stateChange)
        this.events.emit('modeChange')
    }

    openDrawer(drawer) {
        this.setState({openDrawer: drawer})
    }

    closeDrawer() {
        document.activeElement.blur()
        this.openDrawer(null)
    }

    setBusy(busy) {
        this.setState({busy})
    }

    // File Management

    getEmptyGameTree() {
        let handicap = setting.get('game.default_handicap')
        let size = setting.get('game.default_board_size').toString().split(':').map(x => +x)
        let [width, height] = [size[0], size.slice(-1)[0]]
        let handicapStones = new Board(width, height).getHandicapPlacement(handicap).map(sgf.vertex2point)

        let sizeInfo = width === height ? `SZ[${width}]` : `SZ[${width}:${height}]`
        let handicapInfo = handicapStones.length > 0 ? `HA[${handicap}]AB[${handicapStones.join('][')}]` : ''

        let buffer = `(;GM[1]FF[4]CA[UTF-8]AP[${this.appName}:${this.version}]
            KM[${setting.get('game.default_komi')}]${sizeInfo}${handicapInfo})`

        return sgf.parse(buffer)[0]
    }

    newFile({playSound = false, showInfo = false, suppressAskForSave = false} = {}) {
        if (!suppressAskForSave && !this.askForSave()) return

        if (showInfo && this.state.openDrawer === 'info') {
            this.closeDrawer()
        }

        this.detachEngines()
        this.setState(this.state, () => {
            let emptyTree = this.getEmptyGameTree()

            this.setState({
                openDrawer: showInfo ? 'info' : null,
                gameTrees: [emptyTree],
                treePosition: [emptyTree, 0],
                representedFilename: null
            })

            this.treeHash = this.generateTreeHash()
            this.fileHash = this.generateFileHash()

            if (playSound) sound.playNewGame()
        })
    }

    loadFile(filename = null, {suppressAskForSave = false} = {}) {
        if (!suppressAskForSave && !this.askForSave()) return

        if (!filename) {
            let result = dialog.showOpenDialog({
                properties: ['openFile'],
                filters: [...fileformats.meta, {name: 'All Files', extensions: ['*']}]
            })

            if (result) filename = result[0]
            if (!filename) return
        }

        let {extname} = require('path')
        let extension = extname(filename).slice(1)
        let content = fs.readFileSync(filename, {encoding: 'binary'})

        this.loadContent(content, extension, {
            suppressAskForSave: true,
            callback: err => {
                if (err) return

                this.setState({representedFilename: filename})
                this.fileHash = this.generateFileHash()
            }
        })
    }

    loadContent(content, extension, {suppressAskForSave = false, ignoreEncoding = false, callback = helper.noop} = {}) {
        if (!suppressAskForSave && !this.askForSave()) return

        this.setBusy(true)
        if (this.state.openDrawer !== 'gamechooser') this.closeDrawer()
        this.setMode('play')

        setTimeout(() => {
            let lastProgress = -1
            let error = false
            let gameTrees = []

            try {
                let fileFormatModule = fileformats.getModuleByExtension(extension)

                gameTrees = fileFormatModule.parse(content, evt => {
                    if (evt.progress - lastProgress < 0.1) return
                    this.window.setProgressBar(evt.progress)
                    lastProgress = evt.progress
                }, ignoreEncoding)

                if (gameTrees.length == 0) throw true
            } catch (err) {
                dialog.showMessageBox('This file is unreadable.', 'warning')
                error = true
            }

            if (gameTrees.length != 0) {
                this.setBusy(false)
                this.clearUndoPoint()
                this.detachEngines()
                this.setState({
                    representedFilename: null,
                    gameTrees,
                    treePosition: [gameTrees[0], 0]
                })

                this.treeHash = this.generateTreeHash()
                this.fileHash = this.generateFileHash()
            }

            if (gameTrees.length > 1) {
                setTimeout(() => {
                    this.openDrawer('gamechooser')
                }, setting.get('gamechooser.show_delay'))
            }

            this.window.setProgressBar(-1)
            callback(error)

            if (!error) this.events.emit('fileLoad')
        }, setting.get('app.loadgame_delay'))
    }

    saveFile(filename = null) {
        if (!filename) {
            filename = dialog.showSaveDialog({
                filters: [sgf.meta, {name: 'All Files', extensions: ['*']}]
            })

            if (!filename) return false
        }

        fs.writeFileSync(filename, this.getSGF())

        this.setBusy(false)
        this.setState({representedFilename: filename})

        this.treeHash = this.generateTreeHash()
        this.fileHash = this.generateFileHash()

        return true
    }

    getSGF() {
        let {gameTrees} = this.state

        for (let tree of gameTrees) {
            Object.assign(tree.nodes[0], {
                AP: [`${this.appName}:${this.version}`],
                CA: ['UTF-8']
            })
        }

        return sgf.stringify(gameTrees)
    }

    generateTreeHash() {
        return this.state.gameTrees.map(tree => gametree.getHash(tree)).join('')
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
            let answer = dialog.showMessageBox(
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
            let answer = dialog.showMessageBox([
                `This file has been changed outside of ${this.appName}.`,
                'Do you want to reload the file? Your changes will be lost.'
            ].join('\n'), 'warning', ['Reload', 'Don’t Reload'], 1)

            if (answer === 0) {
                this.loadFile(this.state.representedFilename, {suppressAskForSave: true})
            } else {
                this.treeHash = null
            }

            this.fileHash = hash
        }
    }

    // Playing

    clickVertex(vertex, {button = 0, ctrlKey = false, x = 0, y = 0} = {}) {
        this.closeDrawer()

        let [tree, index] = this.state.treePosition
        let board = gametree.getBoard(tree, index)
        let node = tree.nodes[index]

        if (typeof vertex == 'string') {
            vertex = board.coord2vertex(vertex)
        }

        if (['play', 'autoplay'].includes(this.state.mode)) {
            if (button === 0) {
                if (board.get(vertex) === 0) {
                    this.makeMove(vertex)

                    if (this.attachedEngineControllers.some(x => x != null)) {
                        setTimeout(() => this.startGeneratingMoves(), setting.get('gtp.move_delay'))
                    }
                } else if (vertex in board.markups
                && board.markups[vertex][0] === 'point'
                && setting.get('edit.click_currentvertex_to_remove')) {
                    this.removeNode(tree, index)
                }
            } else if (button === 2) {
                if (vertex in board.markups && board.markups[vertex][0] === 'point') {
                    this.openCommentMenu(tree, index, {x, y})
                }
            }
        } else if (this.state.mode === 'edit') {
            if (ctrlKey) {
                // Add coordinates to comment

                let coord = board.vertex2coord(vertex)
                let commentText = node.C ? node.C[0] : ''

                node.C = commentText !== '' ? [commentText.trim() + ' ' + coord] : [coord]
                return
            }

            let tool = this.state.selectedTool

            if (button === 2) {
                // Right mouse click

                if (['stone_1', 'stone_-1'].includes(tool)) {
                    // Switch stone tool

                    tool = tool === 'stone_1' ? 'stone_-1' : 'stone_1'
                } else if (['number', 'label'].includes(tool)) {
                    // Show label editing context menu

                    let click = () => dialog.showInputBox('Enter label text', ({value}) => {
                        this.useTool('label', vertex, value)
                    })

                    let template = [{label: '&Edit Label', click}]
                    let menu = Menu.buildFromTemplate(template)
                    menu.popup(this.window, {x, y, async: true})

                    return
                }
            }

            if (['line', 'arrow'].includes(tool)) {
                // Remember clicked vertex and pass as an argument the second time

                if (!this.editVertexData || this.editVertexData[0] !== tool) {
                    this.useTool(tool, vertex)
                    this.editVertexData = [tool, vertex]
                } else {
                    this.useTool(tool, vertex, this.editVertexData[1])
                    this.editVertexData = null
                }
            } else {
                this.useTool(tool, vertex)
                this.editVertexData = null
            }
        } else if (['scoring', 'estimator'].includes(this.state.mode)) {
            if (button !== 0 || board.get(vertex) === 0) return

            let {mode, deadStones} = this.state
            let dead = deadStones.some(v => helper.vertexEquals(v, vertex))
            let stones = mode === 'estimator' ? board.getChain(vertex) : board.getRelatedChains(vertex)

            if (!dead) {
                deadStones = [...deadStones, ...stones]
            } else {
                deadStones = deadStones.filter(v => !stones.some(w => helper.vertexEquals(v, w)))
            }

            this.setState({deadStones})
        } else if (this.state.mode === 'find') {
            if (button !== 0) return

            if (helper.vertexEquals(this.state.findVertex || [-1, -1], vertex)) {
                this.setState({findVertex: null})
            } else {
                this.setState({findVertex: vertex})
                this.findMove(1, {vertex, text: this.state.findText})
            }
        } else if (this.state.mode === 'guess') {
            if (button !== 0) return

            let tp = gametree.navigate(...this.state.treePosition, 1)
            if (!tp) return this.setMode('play')

            let nextNode = tp[0].nodes[tp[1]]
            if (!('B' in nextNode || 'W' in nextNode)) return this.setMode('play')

            let nextVertex = sgf.point2vertex(nextNode['B' in nextNode ? 'B' : 'W'][0])
            let board = gametree.getBoard(...this.state.treePosition)
            if (!board.hasVertex(nextVertex)) return this.setMode('play')

            if (helper.vertexEquals(vertex, nextVertex)) {
                this.makeMove(vertex, {player: 'B' in nextNode ? 1 : -1})
            } else {
                if (board.get(vertex) !== 0
                || this.state.blockedGuesses.some(v => helper.vertexEquals(v, vertex)))
                    return

                let blocked = []
                let [, i] = vertex.map((x, i) => Math.abs(x - nextVertex[i]))
                    .reduce(([max, i], x, j) => x > max ? [x, j] : [max, i], [-Infinity, -1])

                for (let x = 0; x < board.width; x++) {
                    for (let y = 0; y < board.height; y++) {
                        let z = i === 0 ? x : y
                        if (Math.abs(z - vertex[i]) < Math.abs(z - nextVertex[i]))
                            blocked.push([x, y])
                    }
                }

                let {blockedGuesses} = this.state
                blockedGuesses.push(...blocked)
                this.setState({blockedGuesses})
            }
        }

        this.events.emit('vertexClick')
    }

    makeMove(vertex, {player = null, clearUndoPoint = true} = {}) {
        if (!['play', 'autoplay', 'guess'].includes(this.state.mode)) {
            this.closeDrawer()
            this.setMode('play')
        }

        let [tree, index] = this.state.treePosition
        let board = gametree.getBoard(tree, index)

        if (typeof vertex == 'string') {
            vertex = board.coord2vertex(vertex)
        }

        let pass = !board.hasVertex(vertex)
        if (!pass && board.get(vertex) != 0) return

        let prev = gametree.navigate(tree, index, -1)
        if (!player) player = this.inferredState.currentPlayer
        let color = player > 0 ? 'B' : 'W'
        let capture = false, suicide = false, ko = false
        let createNode = true

        if (!pass) {
            // Check for ko

            if (prev && setting.get('game.show_ko_warning')) {
                let hash = board.makeMove(player, vertex).getPositionHash()

                ko = prev[0].nodes[prev[1]].board.getPositionHash() == hash

                if (ko && dialog.showMessageBox(
                    ['You are about to play a move which repeats a previous board position.',
                    'This is invalid in some rulesets.'].join('\n'),
                    'info',
                    ['Play Anyway', 'Don’t Play'], 1
                ) != 0) return
            }

            let vertexNeighbors = board.getNeighbors(vertex)

            // Check for suicide

            capture = vertexNeighbors
                .some(v => board.get(v) == -player && board.getLiberties(v).length == 1)

            suicide = !capture
            && vertexNeighbors.filter(v => board.get(v) == player)
                .every(v => board.getLiberties(v).length == 1)
            && vertexNeighbors.filter(v => board.get(v) == 0).length == 0

            if (suicide && setting.get('game.show_suicide_warning')) {
                if (dialog.showMessageBox(
                    ['You are about to play a suicide move.',
                    'This is invalid in some rulesets.'].join('\n'),
                    'info',
                    ['Play Anyway', 'Don’t Play'], 1
                ) != 0) return
            }

            // Animate board

            this.setState({animatedVertex: vertex})
        }

        // Update data

        let nextTreePosition

        if (tree.subtrees.length === 0 && tree.nodes.length - 1 === index) {
            // Append move

            let node = {}
            node[color] = [sgf.vertex2point(vertex)]
            tree.nodes.push(node)

            nextTreePosition = [tree, tree.nodes.length - 1]
        } else {
            if (index !== tree.nodes.length - 1) {
                // Search for next move

                let nextNode = tree.nodes[index + 1]
                let moveExists = color in nextNode
                    && helper.vertexEquals(sgf.point2vertex(nextNode[color][0]), vertex)

                if (moveExists) {
                    nextTreePosition = [tree, index + 1]
                    createNode = false
                }
            } else {
                // Search for variation

                let variations = tree.subtrees.filter(subtree => {
                    return subtree.nodes.length > 0
                        && color in subtree.nodes[0]
                        && helper.vertexEquals(sgf.point2vertex(subtree.nodes[0][color][0]), vertex)
                })

                if (variations.length > 0) {
                    nextTreePosition = [variations[0], 0]
                    createNode = false
                }
            }

            if (createNode) {
                // Create variation

                let updateRoot = tree.parent == null
                let splitted = gametree.split(tree, index)
                let newTree = gametree.new()
                let node = {[color]: [sgf.vertex2point(vertex)]}

                newTree.nodes = [node]
                newTree.parent = splitted

                splitted.subtrees.push(newTree)
                splitted.current = splitted.subtrees.length - 1

                if (updateRoot) {
                    let {gameTrees} = this.state
                    gameTrees[gameTrees.indexOf(tree)] = splitted
                }

                nextTreePosition = [newTree, 0]
            }
        }

        this.setCurrentTreePosition(...nextTreePosition)

        // Play sounds

        if (!pass) {
            let delay = setting.get('sound.capture_delay_min')
            delay += Math.floor(Math.random() * (setting.get('sound.capture_delay_max') - delay))

            if (capture || suicide)
                sound.playCapture(delay)

            sound.playPachi()
        } else {
            sound.playPass()
        }

        // Clear undo point

        if (createNode && clearUndoPoint) this.clearUndoPoint()

        // Enter scoring mode after two consecutive passes

        let enterScoring = false

        if (pass && createNode && prev) {
            let prevNode = tree.nodes[index]
            let prevColor = color === 'B' ? 'W' : 'B'
            let prevPass = prevColor in prevNode && prevNode[prevColor][0] === ''

            if (prevPass) {
                enterScoring = true
                this.setMode('scoring')
            }
        }

        // Emit event

        this.events.emit('makeMove', {pass, capture, suicide, ko, enterScoring})
    }

    makeResign({player = null, setUndoPoint = true} = {}) {
        let {rootTree, currentPlayer} = this.inferredState
        if (player == null) player = currentPlayer
        let color = player > 0 ? 'W' : 'B'
        let rootNode = rootTree.nodes[0]

        if (setUndoPoint) this.setUndoPoint('Undo Resignation')
        rootNode.RE = [`${color}+Resign`]

        this.makeMove([-1, -1], {player, clearUndoPoint: false})
        this.makeMainVariation(...this.state.treePosition, {setUndoPoint: false})

        this.events.emit('resign', {player})
    }

    useTool(tool, vertex, argument = null) {
        let [tree, index] = this.state.treePosition
        let {currentPlayer, gameIndex} = this.inferredState
        let board = gametree.getBoard(tree, index)
        let node = tree.nodes[index]

        if (typeof vertex == 'string') {
            vertex = board.coord2vertex(vertex)
        }

        let data = {
            cross: 'MA',
            triangle: 'TR',
            circle: 'CR',
            square: 'SQ',
            number: 'LB',
            label: 'LB'
        }

        if (['stone_-1', 'stone_1'].includes(tool)) {
            if ('B' in node || 'W' in node || gametree.navigate(tree, index, 1)) {
                // New variation needed

                let updateRoot = tree.parent == null
                let splitted = gametree.split(tree, index)

                if (splitted != tree || splitted.subtrees.length != 0) {
                    tree = gametree.new()
                    tree.parent = splitted
                    splitted.subtrees.push(tree)
                }

                node = {PL: currentPlayer > 0 ? ['B'] : ['W']}
                index = tree.nodes.length
                tree.nodes.push(node)

                if (updateRoot) {
                    let {gameTrees} = this.state
                    gameTrees[gameIndex] = splitted
                }
            }

            let sign = tool === 'stone_1' ? 1 : -1
            let oldSign = board.get(vertex)
            let properties = ['AW', 'AE', 'AB']
            let point = sgf.vertex2point(vertex)

            for (let prop of properties) {
                if (!(prop in node)) continue

                // Resolve compressed lists

                if (node[prop].some(x => x.includes(':'))) {
                    node[prop] = node[prop]
                        .map(value => sgf.compressed2list(value).map(sgf.vertex2point))
                        .reduce((list, x) => [...list, x])
                }

                // Remove residue

                node[prop] = node[prop].filter(x => x !== point)
                if (node[prop].length === 0) delete node[prop]
            }

            let prop = oldSign !== sign ? properties[sign + 1] : 'AE'

            if (prop in node) node[prop].push(point)
            else node[prop] = [point]
        } else if (['line', 'arrow'].includes(tool)) {
            let endVertex = argument

            if (!endVertex || helper.vertexEquals(vertex, endVertex)) return

            // Check whether to remove a line

            let toDelete = board.lines.findIndex(x => helper.equals(x.slice(0, 2), [vertex, endVertex]))

            if (toDelete === -1) {
                toDelete = board.lines.findIndex(x => helper.equals(x.slice(0, 2), [endVertex, vertex]))

                if (toDelete >= 0 && tool !== 'line' && board.lines[toDelete][2]) {
                    // Do not delete after all
                    toDelete = -1
                }
            }

            // Mutate board first, then apply changes to actual game tree

            if (toDelete >= 0) {
                board.lines.splice(toDelete, 1)
            } else {
                board.lines.push([vertex, endVertex, tool === 'arrow'])
            }

            node.LN = []
            node.AR = []

            for (let [v1, v2, arrow] of board.lines) {
                let [p1, p2] = [v1, v2].map(sgf.vertex2point)
                if (p1 === p2) continue

                node[arrow ? 'AR' : 'LN'].push([p1, p2].join(':'))
            }

            if (node.LN.length === 0) delete node.LN
            if (node.AR.length === 0) delete node.AR
        } else {
            // Mutate board first, then apply changes to actual game tree

            if (tool === 'number') {
                if (vertex in board.markups && board.markups[vertex][0] === 'label') {
                    delete board.markups[vertex]
                } else {
                    let number = !node.LB ? 1 : node.LB
                        .map(x => parseFloat(x.substr(3)))
                        .filter(x => !isNaN(x))
                        .sort((a, b) => a - b)
                        .filter((x, i, arr) => i === 0 || x !== arr[i - 1])
                        .concat([null])
                        .findIndex((x, i) => i + 1 !== x) + 1

                    argument = number.toString()
                    board.markups[vertex] = [tool, number.toString()]
                }
            } else if (tool === 'label') {
                let label = argument

                if (label != null && label.trim() === ''
                || label == null && vertex in board.markups && board.markups[vertex][0] === 'label') {
                    delete board.markups[vertex]
                } else {
                    if (label == null || label.trim() === '') {
                        let alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
                        let letterIndex = !node.LB ? 0 : node.LB
                            .filter(x => x.length === 4)
                            .map(x => alpha.indexOf(x[3]))
                            .filter(x => x >= 0)
                            .sort((a, b) => a - b)
                            .filter((x, i, arr) => i === 0 || x !== arr[i - 1])
                            .concat([null])
                            .findIndex((x, i) => i !== x)

                        label = alpha[Math.min(letterIndex, alpha.length - 1)]
                        argument = label
                    }

                    board.markups[vertex] = [tool, label]
                }
            } else {
                if (vertex in board.markups && board.markups[vertex][0] === tool) {
                    delete board.markups[vertex]
                } else {
                    board.markups[vertex] = [tool, '']
                }
            }

            for (let id in data) delete node[data[id]]

            // Now apply changes to game tree

            for (let x = 0; x < board.width; x++) {
                for (let y = 0; y < board.height; y++) {
                    let v = [x, y]
                    if (!(v in board.markups)) continue

                    let prop = data[board.markups[v][0]]
                    let value = sgf.vertex2point(v)

                    if (prop === 'LB')
                        value += ':' + board.markups[v][1]

                    if (prop in node) node[prop].push(value)
                    else node[prop] = [value]
                }
            }
        }

        this.clearUndoPoint()
        this.setCurrentTreePosition(tree, index)

        this.events.emit('toolUsed', {tool, vertex, argument})
    }

    // Undo Methods

    setUndoPoint(undoText = 'Undo') {
        let {treePosition: [tree, index]} = this.state
        let rootTree = gametree.clone(gametree.getRoot(tree))
        let level = gametree.getLevel(tree, index)

        this.undoData = [rootTree, level]
        this.setState({undoable: true, undoText})
    }

    clearUndoPoint() {
        this.undoData = null
        this.setState({undoable: false})
    }

    undo() {
        if (!this.state.undoable || !this.undoData) return

        this.setBusy(true)

        setTimeout(() => {
            let [undoRoot, undoLevel] = this.undoData
            let {treePosition, gameTrees} = this.state

            gameTrees[this.inferredState.gameIndex] = undoRoot
            treePosition = gametree.navigate(undoRoot, 0, undoLevel)

            this.setCurrentTreePosition(...treePosition)
            this.clearUndoPoint()
            this.setBusy(false)
        }, setting.get('edit.undo_delay'))
    }

    // Navigation

    setCurrentTreePosition(tree, index) {
        if (['scoring', 'estimator'].includes(this.state.mode))
            return

        let t = tree
        while (t.parent != null) {
            t.parent.current = t.parent.subtrees.indexOf(t)
            t = t.parent
        }

        this.setState({
            blockedGuesses: [],
            highlightVertices: [],
            treePosition: [tree, index]
        })

        this.events.emit('navigate')
    }

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

        treePosition = gametree.navigate(root, 0, Math.round(number))

        if (treePosition) this.setCurrentTreePosition(...treePosition)
        else this.goToEnd()
    }

    goToNextFork() {
        let [tree, index] = this.state.treePosition

        if (index !== tree.nodes.length - 1) {
            this.setCurrentTreePosition(tree, tree.nodes.length - 1)
        } else if (tree.subtrees.length !== 0) {
            let subtree = tree.subtrees[tree.current]
            this.setCurrentTreePosition(subtree, subtree.nodes.length - 1)
        }
    }

    goToPreviousFork() {
        let [tree, index] = this.state.treePosition

        if (tree.parent == null || tree.parent.nodes.length === 0) {
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
        this.setCurrentTreePosition(...tp)
    }

    goToSiblingVariation(step) {
        let [tree, index] = this.state.treePosition
        if (!tree.parent) return

        step = step < 0 ? -1 : 1

        let mod = tree.parent.subtrees.length
        let i = (tree.parent.current + mod + step) % mod

        this.setCurrentTreePosition(tree.parent.subtrees[i], 0)
    }

    goToMainVariation() {
        let tp = this.state.treePosition
        let root = gametree.getRoot(...tp)

        while (root.subtrees.length !== 0) {
            root.current = 0
            root = root.subtrees[0]
        }

        if (gametree.onMainTrack(...tp)) {
            this.setCurrentTreePosition(...tp)
        } else {
            let [tree] = tp

            while (!gametree.onMainTrack(tree)) {
                tree = tree.parent
            }

            this.setCurrentTreePosition(tree, tree.nodes.length - 1)
        }
    }

    // Find Methods

    findPosition(step, condition, callback = helper.noop) {
        if (isNaN(step)) step = 1
        else step = step >= 0 ? 1 : -1

        this.setBusy(true)

        setTimeout(() => {
            let tp = this.state.treePosition
            let iterator = gametree.makeHorizontalNavigator(...tp)

            while (true) {
                tp = step >= 0 ? iterator.next() : iterator.prev()

                if (!tp) {
                    let root = this.inferredState.rootTree

                    if (step === 1) {
                        tp = [root, 0]
                    } else {
                        let sections = gametree.getSection(root, gametree.getHeight(root) - 1)
                        tp = sections[sections.length - 1]
                    }

                    iterator = gametree.makeHorizontalNavigator(...tp)
                }

                if (helper.vertexEquals(tp, this.state.treePosition) || condition(...tp))
                    break
            }

            this.setCurrentTreePosition(...tp)
            this.setBusy(false)
            callback()
        }, setting.get('find.delay'))
    }

    findHotspot(step, callback = helper.noop) {
        this.findPosition(step, (tree, index) => 'HO' in tree.nodes[index], callback)
    }

    findMove(step, {vertex = null, text = ''}, callback = helper.noop) {
        if (vertex == null && text.trim() === '') return
        let point = vertex ? sgf.vertex2point(vertex) : null

        this.findPosition(step, (tree, index) => {
            let node = tree.nodes[index]
            let cond = (prop, value) => prop in node
                && node[prop][0].toLowerCase().includes(value.toLowerCase())

            return (!point || ['B', 'W'].some(x => cond(x, point)))
                && (!text || cond('C', text) || cond('N', text))
        }, callback)
    }

    // Node Actions

    getGameInfo(tree) {
        let root = gametree.getRoot(tree)

        let komi = gametree.getRootProperty(root, 'KM')
        if (komi != null && !isNaN(komi)) komi = +komi
        else komi = null

        let size = gametree.getRootProperty(root, 'SZ')
        if (size == null) {
            size = [19, 19]
        } else {
            let s = size.toString().split(':')
            size = [+s[0], +s[s.length - 1]]
        }

        let handicap = ~~gametree.getRootProperty(root, 'HA', 0)
        handicap = Math.max(1, Math.min(9, handicap))
        if (handicap === 1) handicap = 0

        let playerNames = ['B', 'W'].map(x =>
            gametree.getRootProperty(tree, `P${x}`) || gametree.getRootProperty(tree, `${x}T`)
        )

        let playerRanks = ['BR', 'WR'].map(x => gametree.getRootProperty(root, x))

        return {
            playerNames,
            playerRanks,
            blackName: playerNames[0],
            blackRank: playerRanks[0],
            whiteName: playerNames[1],
            whiteRank: playerRanks[1],
            gameName: gametree.getRootProperty(root, 'GN'),
            eventName: gametree.getRootProperty(root, 'EV'),
            date: gametree.getRootProperty(root, 'DT'),
            result: gametree.getRootProperty(root, 'RE'),
            komi,
            handicap,
            size
        }
    }

    setGameInfo(tree, data) {
        let root = gametree.getRoot(tree)
        let node = root.nodes[0]

        if ('size' in data) {
            // Update board size

            if (data.size) {
                let value = data.size
                value = value.map((x, i) => isNaN(x) || !x ? 19 : Math.min(25, Math.max(3, x)))

                if (value[0] === value[1]) value = value[0]
                else value = value.join(':')

                setting.set('game.default_board_size', value)
                node.SZ = [value]
            } else {
                delete node.SZ
            }
        }

        let props = {
            blackName: 'PB',
            blackRank: 'BR',
            whiteName: 'PW',
            whiteRank: 'WR',
            gameName: 'GN',
            eventName: 'EV',
            date: 'DT',
            result: 'RE',
            komi: 'KM',
            handicap: 'HA'
        }

        for (let key in props) {
            if (key in data) {
                let value = data[key]

                if (value && value.toString().trim() !== '') {
                    if (key === 'komi') {
                        if (isNaN(value)) value = 0

                        setting.set('game.default_komi', value)
                    } else if (key === 'handicap') {
                        let board = gametree.getBoard(root, 0)
                        let stones = board.getHandicapPlacement(+value)

                        value = stones.length
                        node.AB = stones.map(sgf.vertex2point)

                        setting.set('game.default_handicap', value)
                    }

                    node[props[key]] = [value]
                } else {
                    delete node[props[key]]
                }
            }
        }
    }

    getPlayer(tree, index) {
        let node = tree.nodes[index]

        return 'PL' in node ? (node.PL[0] == 'W' ? -1 : 1)
            : 'B' in node || 'HA' in node && +node.HA[0] >= 1 ? -1
            : 1
    }

    setPlayer(tree, index, sign) {
        let node = tree.nodes[index]
        let intendedSign = 'B' in node || 'HA' in node && +node.HA[0] >= 1 ? -1 : +('W' in node)

        if (intendedSign === sign || sign === 0) {
            delete node.PL
        } else {
            node.PL = [sign > 0 ? 'B' : 'W']
        }

        this.clearUndoPoint()
    }

    setComment(tree, index, data) {
        let node = tree.nodes[index]

        for (let [key, prop] of [['title', 'N'], ['comment', 'C']]) {
            if (key in data) {
                if (data[key] && data[key].trim() !== '') node[prop] = [data[key]]
                else delete node[prop]
            }
        }

        if ('hotspot' in data) {
            if (data.hotspot) node.HO = [1]
            else delete node.HO
        }

        let clearProperties = properties => properties.forEach(p => delete node[p])

        if ('moveAnnotation' in data) {
            let moveProps = {'BM': 1, 'DO': '', 'IT': '', 'TE': 1}

            clearProperties(Object.keys(moveProps))

            if (data.moveAnnotation != null)
                node[data.moveAnnotation] = moveProps[data.moveAnnotation]
        }

        if ('positionAnnotation' in data) {
            let positionProps = {'UC': 1, 'GW': 1, 'GB': 1, 'DM': 1}

            clearProperties(Object.keys(positionProps))

            if (data.positionAnnotation != null)
                node[data.positionAnnotation] = positionProps[data.positionAnnotation]
        }

        this.clearUndoPoint()
    }

    copyVariation(tree, index) {
        let clone = gametree.clone(tree)
        if (index != 0) gametree.split(clone, index - 1)

        this.copyVariationData = clone
    }

    cutVariation(tree, index, {setUndoPoint = true} = {}) {
        if (setUndoPoint) this.setUndoPoint('Undo Cut Variation')

        this.copyVariation(tree, index)
        this.removeNode(tree, index, {
            suppressConfirmation: true,
            setUndoPoint: false
        })
    }

    pasteVariation(tree, index, {setUndoPoint = true} = {}) {
        if (this.copyVariationData == null) return

        if (setUndoPoint) this.setUndoPoint('Undo Paste Variation')
        this.closeDrawer()
        this.setMode('play')

        let updateRoot = !tree.parent
        let oldLength = tree.nodes.length
        let splitted = gametree.split(tree, index)
        let copied = gametree.clone(this.copyVariationData)

        copied.parent = splitted
        splitted.subtrees.push(copied)

        if (updateRoot) {
            let {gameTrees} = this.state
            gameTrees[this.inferredState.gameIndex] = splitted
            this.setState({gameTrees})
        }

        if (splitted.subtrees.length === 1) {
            gametree.reduce(splitted)
            this.setCurrentTreePosition(splitted, oldLength)
        } else {
            this.setCurrentTreePosition(copied, 0)
        }
    }

    flattenVariation(tree, index, {setUndoPoint = true} = {}) {
        if (setUndoPoint) this.setUndoPoint('Undo Flatten')
        this.closeDrawer()
        this.setMode('play')

        let {gameTrees} = this.state
        let {rootTree, gameIndex} = this.inferredState
        let board = gametree.getBoard(tree, index)
        let rootNode = rootTree.nodes[0]
        let inherit = ['BR', 'BT', 'DT', 'EV', 'GN', 'GC', 'PB', 'PW', 'RE', 'SO', 'WT', 'WR']

        let clone = gametree.clone(tree)
        if (index !== 0) gametree.split(clone, index - 1)
        let node = clone.nodes[0]

        node.AB = []
        node.AW = []
        delete node.AE
        delete node.B
        delete node.W

        clone.parent = null
        inherit.forEach(x => x in rootNode ? node[x] = rootNode[x] : null)

        for (let x = 0; x < board.width; x++) {
            for (let y = 0; y < board.height; y++) {
                let sign = board.get([x, y])
                if (sign == 0) continue

                node[sign > 0 ? 'AB' : 'AW'].push(sgf.vertex2point([x, y]))
            }
        }

        if (node.AB.length === 0) delete node.AB
        if (node.AW.length === 0) delete node.AW

        gameTrees[gameIndex] = clone
        this.setState({gameTrees})
        this.setCurrentTreePosition(clone, 0)
    }

    makeMainVariation(tree, index, {setUndoPoint = true} = {}) {
        if (setUndoPoint) this.setUndoPoint('Restore Main Variation')
        this.closeDrawer()
        this.setMode('play')

        let t = tree

        while (t.parent != null) {
            t.parent.subtrees.splice(t.parent.subtrees.indexOf(t), 1)
            t.parent.subtrees.unshift(t)
            t.parent.current = 0

            t = t.parent
        }

        t = tree

        while (t.subtrees.length !== 0) {
            let [x] = t.subtrees.splice(t.current, 1)
            t.subtrees.unshift(x)
            t.current = 0

            t = x
        }

        this.setCurrentTreePosition(tree, index)
    }

    shiftVariation(tree, index, step, {setUndoPoint = true} = {}) {
        if (!tree.parent) return

        if (setUndoPoint) this.setUndoPoint('Undo Shift Variation')
        this.closeDrawer()
        this.setMode('play')

        let subtrees = tree.parent.subtrees
        let m = subtrees.length
        let i = subtrees.indexOf(tree)
        let iNew = ((i + step) % m + m) % m

        subtrees.splice(i, 1)
        subtrees.splice(iNew, 0, tree)

        this.setCurrentTreePosition(...this.state.treePosition)
    }

    removeNode(tree, index, {suppressConfirmation = false, setUndoPoint = true} = {}) {
        if (!tree.parent && index === 0) {
            dialog.showMessageBox('The root node cannot be removed.', 'warning')
            return
        }

        if (suppressConfirmation !== true
        && setting.get('edit.show_removenode_warning')
        && dialog.showMessageBox(
            'Do you really want to remove this node?',
            'warning',
            ['Remove Node', 'Cancel'], 1
        ) === 1) return

        if (setUndoPoint) this.setUndoPoint('Undo Remove Node')
        this.closeDrawer()
        this.setMode('play')

        // Remove node

        let prev = gametree.navigate(tree, index, -1)

        if (index !== 0) {
            tree.nodes.splice(index, tree.nodes.length)
            tree.current = null
            tree.subtrees.length = 0
        } else {
            let parent = tree.parent
            let i = parent.subtrees.indexOf(tree)

            parent.subtrees.splice(i, 1)
            if (parent.current >= 1) parent.current--
            gametree.reduce(parent)
        }

        if (!prev) prev = this.state.treePosition
        this.setCurrentTreePosition(...prev)
    }

    removeOtherVariations(tree, index, {suppressConfirmation = false, setUndoPoint = true} = {}) {
        if (suppressConfirmation !== true
        && setting.get('edit.show_removeothervariations_warning')
        && dialog.showMessageBox(
            'Do you really want to remove all other variations?',
            'warning',
            ['Remove Variations', 'Cancel'], 1
        ) == 1) return

        // Save undo information

        if (setUndoPoint) this.setUndoPoint('Undo Remove Other Variations')
        this.closeDrawer()
        this.setMode('play')

        // Remove all subsequent variations

        let t = tree

        while (t.subtrees.length != 0) {
            t.subtrees = [t.subtrees[t.current]]
            t.current = 0

            t = t.subtrees[0]
        }

        // Remove all precedent variations

        t = tree

        while (t.parent != null) {
            t.parent.subtrees = [t]
            t.parent.current = 0

            t = t.parent
        }

        this.setCurrentTreePosition(tree, index)
    }

    // Menus

    openNodeMenu(tree, index, options = {}) {
        if (this.state.mode === 'scoring') return

        let template = [
            {
                label: 'C&opy Variation',
                click: () => this.copyVariation(tree, index)
            },
            {
                label: 'C&ut Variation',
                click: () => this.cutVariation(tree, index)
            },
            {
                label: '&Paste Variation',
                click: () => this.pasteVariation(tree, index)
            },
            {type: 'separator'},
            {
                label: 'Make &Main Variation',
                click: () => this.makeMainVariation(tree, index)
            },
            {
                label: "Shift &Left",
                click: () => this.shiftVariation(tree, index, -1)
            },
            {
                label: "Shift Ri&ght",
                click: () => this.shiftVariation(tree, index, 1)
            },
            {type: 'separator'},
            {
                label: '&Flatten',
                click: () => this.flattenVariation(tree, index)
            },
            {
                label: '&Remove Node',
                click: () => this.removeNode(tree, index)
            },
            {
                label: 'Remove &Other Variations',
                click: () => this.removeOtherVariations(tree, index)
            }
        ]

        let menu = Menu.buildFromTemplate(template)
        menu.popup(this.window, Object.assign({async: true}, options))
    }

    openCommentMenu(tree, index, options = {}) {
        let node = tree.nodes[index]

        let template = [
            {
                label: '&Clear Annotations',
                click: () => {
                    this.setComment({positionAnnotation: null, moveAnnotation: null})
                }
            },
            {type: 'separator'},
            {
                label: 'Good for &Black',
                type: 'checkbox',
                data: {positionAnnotation: 'GB'}
            },
            {
                label: '&Unclear Position',
                type: 'checkbox',
                data: {positionAnnotation: 'UC'}
            },
            {
                label: '&Even Position',
                type: 'checkbox',
                data: {positionAnnotation: 'DM'}
            },
            {
                label: 'Good for &White',
                type: 'checkbox',
                data: {positionAnnotation: 'GW'}
            }
        ]

        if ('B' in node || 'W' in node) {
            template.push(
                {type: 'separator'},
                {
                    label: '&Good Move',
                    type: 'checkbox',
                    data: {moveAnnotation: 'TE'}
                },
                {
                    label: '&Interesting Move',
                    type: 'checkbox',
                    data: {moveAnnotation: 'IT'}
                },
                {
                    label: '&Doubtful Move',
                    type: 'checkbox',
                    data: {moveAnnotation: 'DO'}
                },
                {
                    label: 'B&ad Move',
                    type: 'checkbox',
                    data: {moveAnnotation: 'BM'}
                }
            )
        }

        template.push(
            {type: 'separator'},
            {
                label: '&Hotspot',
                type: 'checkbox',
                data: {hotspot: true}
            }
        )

        for (let item of template) {
            if (!('data' in item)) continue

            let [key] = Object.keys(item.data)
            let prop = key === 'hotspot' ? 'HO' : item.data[key]

            item.checked = prop in node
            if (item.checked) item.data[key] = null

            item.click = () => this.setComment(tree, index, item.data)
        }

        let menu = Menu.buildFromTemplate(template)
        menu.popup(this.window, Object.assign({async: true}, options))
    }

    // GTP Engines

    attachEngines(...engines) {
        let {engineCommands, attachedEngines} = this.state

        if (helper.vertexEquals([engines[1], engines[0]], attachedEngines)) {
            // Just swap engines

            this.attachedEngineControllers.reverse()
            this.engineBoards.reverse()

            this.setState({
                engineCommands: engineCommands.reverse(),
                attachedEngines: engines
            })

            return
        }

        let command = name => new gtp.Command(null, name)

        for (let i = 0; i < attachedEngines.length; i++) {
            if (attachedEngines[i] != engines[i]) {
                this.sendGTPCommand(this.attachedEngineControllers[i], command('quit'))

                try {
                    let controller = engines[i] ? new gtp.Controller(engines[i]) : null
                    this.attachedEngineControllers[i] = controller
                    this.engineBoards[i] = null

                    this.sendGTPCommand(controller, command('name'))
                    this.sendGTPCommand(controller, command('version'))
                    this.sendGTPCommand(controller, command('protocol_version'))
                    this.sendGTPCommand(controller, command('list_commands'), ({response}) => {
                        engineCommands[i] = response.content.split('\n')
                    })

                    controller.on('stderr', ({content}) => {
                        this.setState(({consoleLog}) => ({
                            consoleLog: [...consoleLog, [
                                i === 0 ? 1 : -1,
                                controller.name,
                                null,
                                new gtp.Response(null, content, false, true)
                            ]]
                        }))
                    })

                    this.setState({engineCommands})
                } catch (err) {
                    this.attachedEngineControllers[i] = null
                    engines[i] = null
                }
            }
        }

        this.setState({attachedEngines: engines})
        this.syncEngines()
    }

    detachEngines() {
        this.attachEngines(null, null)
    }

    sendGTPCommand(controller, command, callback = helper.noop) {
        if (controller == null) return

        let {consoleLog} = this.state
        let sign = 1 - this.attachedEngineControllers.indexOf(controller) * 2
        if (sign > 1) sign = 0
        let entry = [sign, controller.name, command]
        let maxLength = setting.get('console.max_history_count')

        let newLog = consoleLog.slice(Math.max(consoleLog.length - maxLength + 1, 0))
        newLog.push(entry)

        this.setState({consoleLog: newLog})

        controller.sendCommand(command, ({response}) => {
            this.setState(({consoleLog}) => {
                let index = consoleLog.indexOf(entry)
                if (index === -1) return {}

                let newLog = [...consoleLog]
                newLog[index] = [...entry, response]

                return {consoleLog: newLog}
            })

            callback({response, command})
        })
    }

    syncEngines() {
        if (this.attachedEngineControllers.every(x => x == null)) return

        let board = gametree.getBoard(...this.state.treePosition)

        if (!board.isSquare()) {
            dialog.showMessageBox('GTP engines don’t support non-square boards.', 'warning')
            return this.detachEngines()
        } else if (!board.isValid()) {
            dialog.showMessageBox('GTP engines don’t support invalid board positions.', 'warning')
            return this.detachEngines()
        }

        this.setBusy(true)

        for (let i = 0; i < this.attachedEngineControllers.length; i++) {
            if (this.attachedEngineControllers[i] == null
                || this.engineBoards[i] != null
                && board.getPositionHash() === this.engineBoards[i].getPositionHash()) continue

            let controller = this.attachedEngineControllers[i]

            if (this.engineBoards[i] != null) {
                // Diff boards

                let synced = false
                let diff = this.engineBoards[i].diff(board).filter(([, sign]) => sign !== 0)

                if (diff.length === 1) {
                    let [vertex, sign] = diff[0]
                    let move = this.engineBoards[i].makeMove(sign, vertex)

                    if (move.getPositionHash() === board.getPositionHash()) {
                        // Incremental board update possible

                        let color = sign > 0 ? 'B' : 'W'
                        let point = board.vertex2coord(vertex)

                        this.sendGTPCommand(controller, new gtp.Command(null, 'play', color, point))
                        synced = true
                    }
                }

                if (synced) continue
            }

            // Replay

            this.sendGTPCommand(controller, new gtp.Command(null, 'boardsize', board.width))
            this.sendGTPCommand(controller, new gtp.Command(null, 'clear_board'))
            this.sendGTPCommand(controller, new gtp.Command(null, 'komi', this.inferredState.gameInfo.komi || 0))

            for (let x = 0; x < board.width; x++) {
                for (let y = 0; y < board.height; y++) {
                    let vertex = [x, y]
                    let sign = board.get(vertex)
                    if (sign === 0) continue

                    let color = sign > 0 ? 'B' : 'W'
                    let point = board.vertex2coord(vertex)

                    this.sendGTPCommand(controller, new gtp.Command(null, 'play', color, point))
                }
            }

            this.engineBoards[i] = board
        }

        this.setBusy(false)
    }

    startGeneratingMoves({followUp = false} = {}) {
        this.closeDrawer()

        if (followUp) {
            if (!this.state.generatingMoves) return this.setBusy(false)
        } else {
            this.setState({generatingMoves: true})
        }

        let {currentPlayer, rootTree} = this.inferredState
        let [color, opponent] = currentPlayer > 0 ? ['B', 'W'] : ['W', 'B']
        let [playerIndex, otherIndex] = currentPlayer > 0 ? [0, 1] : [1, 0]
        let playerController = this.attachedEngineControllers[playerIndex]
        let otherController = this.attachedEngineControllers[otherIndex]

        if (playerController == null) {
            if (otherController != null) {
                // Switch engines, so the attached engine can play

                let engines = [...this.state.attachedEngines].reverse()
                this.attachEngines(...engines)
                ;[playerController, otherController] = [otherController, playerController]
            } else {
                return
            }
        }

        this.syncEngines()
        this.setBusy(true)

        this.sendGTPCommand(playerController, new gtp.Command(null, 'genmove', color), ({response}) => {
            let sign = color === 'B' ? 1 : -1
            let vertex = [-1, -1]

            if (response.content.toLowerCase() !== 'pass') {
                vertex = gametree.getBoard(rootTree, 0).coord2vertex(response.content)
            }

            if (response.content.toLowerCase() === 'resign') {
                dialog.showMessageBox(`${playerController.name} has resigned.`)
                this.makeResign()
                return
            }

            this.makeMove(vertex, {player: sign})
            this.engineBoards[playerIndex] = gametree.getBoard(...this.state.treePosition)

            if (otherController != null && !helper.vertexEquals(vertex, [-1, -1])) {
                setTimeout(() => this.startGeneratingMoves({followUp: true}), setting.get('gtp.move_delay'))
            } else {
                this.stopGeneratingMoves()
                this.setBusy(false)
            }
        })
    }

    stopGeneratingMoves() {
        this.setState({generatingMoves: false})
    }

    // Render

    render(_, state) {
        // Calculate some inferred values

        let rootTree = gametree.getRoot(...state.treePosition)
        let scoreBoard, areaMap

        if (['scoring', 'estimator'].includes(state.mode)) {
            // Calculate area map

            scoreBoard = gametree.getBoard(...state.treePosition).clone()

            for (let vertex of state.deadStones) {
                let sign = scoreBoard.get(vertex)
                if (sign === 0) continue

                scoreBoard.captures[sign > 0 ? 1 : 0]++
                scoreBoard.set(vertex, 0)
            }

            areaMap = state.mode === 'estimator' ? scoreBoard.getAreaEstimateMap()
                : scoreBoard.getAreaMap()
        }

        this.inferredState = {
            showSidebar: state.showGameGraph || state.showCommentBox,
            showLeftSidebar: state.showConsole,
            rootTree,
            gameIndex: state.gameTrees.indexOf(rootTree),
            gameInfo: this.getGameInfo(rootTree),
            currentPlayer: this.getPlayer(...state.treePosition),
            scoreBoard,
            areaMap
        }

        state = Object.assign(state, this.inferredState)

        return h('section',
            {
                class: classNames({
                    leftsidebar: state.showLeftSidebar,
                    sidebar: state.showSidebar,
                    [state.mode]: true
                })
            },

            h('link', {rel: 'stylesheet', type: 'text/css', href: setting.stylesPath}),

            h(MainView, state),
            h(LeftSidebar, state),
            h(Sidebar, state),
            h(DrawerManager, state),

            h(InputBox, {
                text: state.inputBoxText,
                show: state.showInputBox,
                onSubmit: state.onInputBoxSubmit,
                onCancel: state.onInputBoxCancel
            }),

            h(BusyScreen, {show: state.busy})
        )
    }
}

// Render

render(h(App), document.body)
