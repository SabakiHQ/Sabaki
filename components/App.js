const fs = require('fs')
const EventEmitter = require('events')
const {ipcRenderer, clipboard, remote} = require('electron')
const {app, dialog, Menu} = remote
const {h, render, options, Component} = require('preact')

const MainView = require('./MainView')
const LeftSidebar = require('./LeftSidebar')
const Sidebar = require('./Sidebar')
const DrawerManager = require('./DrawerManager')

const Board = require('../modules/board')
const gametree = require('../modules/gametree')
const helper = require('../modules/helper')
const setting = require('../modules/setting')
const sound = require('../modules/sound')

const sgf = require('../modules/sgf')
const ngf = require('../modules/ngf')
const gib = require('../modules/gib')

options.syncComponentUpdates = true

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

            // Bar state

            undoable: false,
            undoText: 'Undo',
            selectedTool: 'stone_1',
            autoplaying: false,
            secondsPerMove: setting.get('autoplay.sec_per_move'),
            scoringMethod: setting.get('scoring.method'),
            findText: '',
            findVertex: null,
            deadStones: [],

            // Board state

            highlightVertices: [],
            showCoordinates: setting.get('view.show_coordinates'),
            showMoveColorization: setting.get('view.show_move_colorization'),
            showNextMoves: setting.get('view.show_next_moves'),
            showSiblings: setting.get('view.show_siblings'),
            fuzzyStonePlacement: setting.get('view.fuzzy_stone_placement'),
            animatedStonePlacement: setting.get('view.animated_stone_placement'),
            animatedVertex: null,

            // Sidebar state

            showLeftSidebar: setting.get('view.show_leftsidebar'),
            leftSidebarWidth: setting.get('view.leftsidebar_width'),
            showGameGraph: setting.get('view.show_graph'),
            showCommentBox: setting.get('view.show_comments'),
            sidebarWidth: setting.get('view.sidebar_width'),
            autoscrolling: 0
        }

        this.appName = app.getName()
        this.version = app.getVersion()
        this.events = new EventEmitter()
        this.window = remote.getCurrentWindow()
        this.treeHash = this.generateTreeHash()
    }

    componentDidMount() {
        // Handle file drag & drop

        document.body.addEventListener('dragover', evt => evt.preventDefault())
        document.body.addEventListener('drop', evt => {
            evt.preventDefault()

            if (evt.dataTransfer.files.length === 0) return
            this.loadFile(evt.dataTransfer.files[0].path)
        })

        // Handle escape key

        document.addEventListener('keydown', evt => {
            if (evt.keyCode === 27) {
                // Escape

                if (this.state.openDrawer != null) {
                    this.closeDrawers()
                } else if (this.state.mode !== 'play') {
                    this.setMode('play')
                } else if (this.state.fullScreen) {
                    this.setState({fullScreen: false})
                }
            }
        })

        // Handle window closing

        window.addEventListener('beforeunload', evt => {
            if (!this.askForSave()) evt.returnValue = ' '
        })

        this.newFile()
        this.window.show()

        this.events.emit('ready')
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
    }

    // Sabaki API

    setSelectedTool(tool) {
        this.setState({selectedTool: tool})
    }

    setSidebarWidth(sidebarWidth) {
        this.setState({sidebarWidth})
        window.dispatchEvent(new Event('resize'))
    }

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

    getSGF() {
        let {gameTrees} = this.state

        gameTrees.forEach(tree => {
            tree.nodes[0].AP = [`${this.appName}:${this.version}`]
        })

        return sgf.stringify(gameTrees)
    }

    // Shell

    showMessageBox(message, type = 'info', buttons = ['OK'], cancelId = 0) {
        this.setState({busy: true})
        ipcRenderer.send('build-menu', true)

        let result = dialog.showMessageBox(remote.getCurrentWindow(), {
            type,
            buttons,
            title: this.appName,
            message,
            cancelId,
            noLink: true
        })

        ipcRenderer.send('build-menu')
        this.setState({busy: false})

        return result
    }

    showFileDialog(type, options) {
        this.setState({busy: true})
        ipcRenderer.send('build-menu', true)

        let [t, ...ype] = [...type]
        type = t.toUpperCase() + ype.join('').toLowerCase()

        let result = dialog[`show${type}Dialog`](this.window, options)

        ipcRenderer.send('build-menu')
        this.setState({busy: false})

        return result
    }

    showOpenDialog(options) {
        return this.showFileDialog('open', options)
    }

    showSaveDialog(options) {
        return this.showFileDialog('save', options)
    }

    // Modes & drawers

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
    }

    openDrawer(drawer) {
        this.setState({openDrawer: drawer})
    }

    closeDrawers() {
        this.openDrawer(null)
    }

    // Playing

    clickVertex(vertex, {button = 0, ctrlKey = false, x = 0, y = 0} = {}) {
        this.closeDrawers()

        let [tree, index] = this.state.treePosition
        let board = gametree.getBoard(tree, index)
        let node = tree.nodes[index]

        if (['play', 'autoplay'].includes(this.state.mode)) {
            if (button === 0) {
                if (board.get(vertex) === 0) {
                    this.makeMove(vertex)
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
            } else {
                let tool = this.state.selectedTool

                if (button === 2) {
                    tool = tool === 'stone_1' ? 'stone_-1'
                        : tool === 'stone_-1' ? 'stone_1'
                        : tool
                }

                if (!this.editVertexData || this.editVertexData[0] !== tool) {
                    this.editVertexData = [tool, vertex]
                    this.useTool(tool, vertex)
                } else {
                    this.useTool(tool, vertex, this.editVertexData[1])
                    this.editVertexData = null
                }
            }
        } else if (['scoring', 'estimator'].includes(this.state.mode)) {
            if (button !== 0 || board.get(vertex) === 0) return

            let {mode, deadStones} = this.state
            let dead = deadStones.some(v => helper.vertexEquals(v, vertex))
            let stones = mode === 'estimator' ? board.getChain(vertex) : board.getRelatedChains(vertex)

            if (!dead) {
                deadStones.push(...stones)
            } else {
                deadStones = deadStones.filter(v => !stones.some(w => helper.vertexEquals(v, w)))
            }

            this.setState({deadStones})
        }
    }

    makeMove(vertex, {cancelAutoplay = false, clearUndoPoint = true} = {}) {
        if (!['play', 'autoplay', 'guess'].includes(this.state.mode))
            this.closeDrawers()

        let [tree, index] = this.state.treePosition
        let board = gametree.getBoard(tree, index)
        let pass = !board.hasVertex(vertex)
        if (!pass && board.get(vertex) != 0) return

        let prev = gametree.navigate(tree, index, -1)
        let sign = this.inferredState.currentPlayer
        let color = sign > 0 ? 'B' : 'W'
        let capture = false, suicide = false, ko = false
        let createNode = true

        if (!pass) {
            // Check for ko

            if (prev && setting.get('game.show_ko_warning')) {
                let hash = board.makeMove(sign, vertex).getHash()

                ko = prev[0].nodes[prev[1]].board.getHash() == hash

                if (ko && this.showMessageBox(
                    ['You are about to play a move which repeats a previous board position.',
                    'This is invalid in some rulesets.'].join('\n'),
                    'info',
                    ['Play Anyway', 'Don’t Play'], 1
                ) != 0) return
            }

            let vertexNeighbors = board.getNeighbors(vertex)

            // Check for suicide

            capture = vertexNeighbors
                .some(v => board.get(v) == -sign && board.getLiberties(v).length == 1)

            suicide = !capture
            && vertexNeighbors.filter(v => board.get(v) == sign)
                .every(v => board.getLiberties(v).length == 1)
            && vertexNeighbors.filter(v => board.get(v) == 0).length == 0

            if (suicide && setting.get('game.show_suicide_warning')) {
                if (view.showMessageBox(
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

        if (tree.current == null && tree.nodes.length - 1 == index) {
            // Append move

            let node = {}
            node[color] = [sgf.vertex2point(vertex)]
            tree.nodes.push(node)

            nextTreePosition = [tree, tree.nodes.length - 1]
        } else {
            if (index != tree.nodes.length - 1) {
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

        prev = gametree.navigate(tree, index, -1)
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
            let prevNode = prev[0].nodes[prev[1]]
            let prevColor = sign > 0 ? 'W' : 'B'
            let prevPass = prevColor in prevNode && prevNode[prevColor][0] == ''

            if (prevPass) {
                enterScoring = true
                this.setMode('scoring')
            }
        }

        // Emit event

        this.events.emit('move-made', {pass, capture, suicide, ko})
    }

    makeResign({setUndoPoint = true} = {}) {
        let {rootTree, currentPlayer} = this.inferredState
        let player = currentPlayer > 0 ? 'W' : 'B'
        let rootNode = rootTree.nodes[0]

        if (setUndoPoint) this.setUndoPoint('Undo Resignation')
        rootNode.RE = [player + '+Resign']

        this.makeMove([-1, -1], {clearUndoPoint: false})
        this.makeMainVariation(...this.state.treePosition, {setUndoPoint: false})
    }

    useTool(tool, vertex, endVertex = null) {
        let [tree, index] = this.state.treePosition
        let {currentPlayer, gameIndex} = this.inferredState
        let board = gametree.getBoard(tree, index)
        let node = tree.nodes[index]

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
            let props = ['AW', 'AE', 'AB']
            let point = sgf.vertex2point(vertex)

            for (let prop of props) {
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

            let prop = oldSign !== sign ? props[sign + 1] : 'AE'

            if (prop in node) node[prop].push(point)
            else node[prop] = [point]
        } else if (['line', 'arrow'].includes(tool)) {
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
                        .concat([null])
                        .findIndex((x, i, a) => i + 1 !== x) + 1

                    board.markups[vertex] = [tool, number.toString()]
                }
            } else if (tool === 'label') {
                if (vertex in board.markups && board.markups[vertex][0] === 'label') {
                    delete board.markups[vertex]
                } else {
                    let alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
                    let letterIndex = !node.LB ? 0 : node.LB
                        .filter(x => x.length === 4)
                        .map(x => alpha.indexOf(x[3]))
                        .filter(x => x >= 0)
                        .sort((a, b) => a - b)
                        .concat([null])
                        .findIndex((x, i, a) => i !== x)

                    board.markups[vertex] = [tool, alpha[Math.min(letterIndex, alpha.length - 1)]]
                }
            } else {
                if (vertex in board.markups && board.markups[vertex][0] == tool) {
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

        this.events.emit('tool-used', {tool, vertex, endVertex})
    }

    // File hashes

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
                `This file has been changed outside of ${this.appName}.`,
                'Do you want to reload the file? Your changes will be lost.'
            ].join('\n'), 'warning', ['Reload', 'Don’t Reload'], 1)

            if (answer === 0) {
                this.loadFile(this.state.representedFilename, {suppressAskForSave: true})
            }

            this.fileHash = hash
        }
    }

    // File methods

    newFile({sound = false, showInfo = false, suppressAskForSave = false} = {}) {
        if (this.state.busy || !suppressAskForSave && !this.askForSave()) return

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
            let extensions = [sgf, gib, ngf].map(x => x.meta)
            let combinedExtensions = extensions.map(x => x.extensions)
                .reduce((acc, x) => [...acc, ...x], [])

            let result = this.showOpenDialog({
                properties: ['openFile'],
                filters: [
                    {name: 'Game Records', extensions: combinedExtensions},
                    ...extensions,
                    {name: 'All Files', extensions: ['*']}
                ]
            })

            if (result) filename = result[0]
            if (!filename) return
        }

        let {extname} = require('path')
        let format = extname(filename).slice(1).toLowerCase()
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

    loadContent(content, format, {suppressAskForSave = false, ignoreEncoding = false, callback = helper.noop} = {}) {
        if (this.state.busy || !suppressAskForSave && !this.askForSave()) return

        this.setState({busy: true, openDrawer: null, mode: 'play'})

        setTimeout(() => {
            let lastProgress = -1
            let error = false
            let gameTrees = []

            try {
                let fileFormatModule = {sgf, gib, ngf}[format] || sgf

                gameTrees = fileFormatModule.parse(content, evt => {
                    if (evt.progress - lastProgress < 0.1) return
                    this.window.setProgressBar(evt.progress)
                    lastProgress = evt.progress
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

            if (!error) this.events.emit('file-loaded')
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

    setCurrentTreePosition(tree, index, {cancelAutoplay = true} = {}) {
        if (['scoring', 'estimator'].includes(this.state.mode))
            return

        this.events.emit('navigating', {tree, index})

        let t = tree
        while (t.parent != null) {
            t.parent.current = t.parent.subtrees.indexOf(t)
            t = t.parent
        }

        this.setState(({autoplaying}) => ({
            autoplaying: cancelAutoplay && autoplaying ? false : autoplaying,
            treePosition: [tree, index]
        }))

        this.events.emit('navigated')
    }

    startAutoscrolling(step) {
        let minDelay = setting.get('autoscroll.min_interval')
        let diff = setting.get('autoscroll.diff')

        let scroll = (delay = null) => {
            this.goStep(step)
            this.autoscrollId = setTimeout(() => scroll(Math.max(minDelay, delay - diff)), delay)
        }

        scroll(setting.get('autoscroll.max_interval'))
    }

    stopAutoscrolling() {
        clearTimeout(this.autoscrollId)
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
        this.setCurrentTreePosition(...tp)
    }

    goToSiblingVariation(step) {
        let [tree, index] = this.state.treePosition

        step = step < 0 ? -1 : 1

        let mod = tree.parent.subtrees.length
        let i = (tree.parent.current + mod + step) % mod

        this.setCurrentTreePosition(tree.parent.subtrees[i], 0)
    }

    goToMainVariation() {
        let tp = this.state.treePosition
        let root = gametree.getRoot(...tp)

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

    // Undo methods

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

        this.setState({busy: true})

        setTimeout(() => {
            let [undoRoot, undoLevel] = this.undoData
            let {treePosition, gameTrees} = this.state

            gameTrees[this.inferredState.gameIndex] = undoRoot
            treePosition = gametree.navigate(undoRoot, 0, undoLevel)

            this.setCurrentTreePosition(...treePosition)
            this.clearUndoPoint()
            this.setState({busy: false})
        }, setting.get('edit.undo_delay'))
    }

    // Node actions

    setPlayer(tree, index, sign) {
        let node = tree.nodes[index]
        let intendedSign = 'B' in node || 'HA' in node && +node.HA[0] >= 1 ? -1 : +('W' in node)

        if (intendedSign === sign || sign === 0) {
            delete node.PL
        } else {
            node.PL = [sign > 0 ? 'B' : 'W']
        }

        this.setState(this.state)
    }

    setComment(tree, index, data) {
        let node = tree.nodes[index]

        if ('title' in data) {
            if (data.title && data.title.trim() !== '') node.N = [data.title]
            else delete node.N
        }

        if ('comment' in data) {
            if (data.comment && data.comment.trim() !== '') node.C = [data.comment]
            else delete node.C
        }

        if ('hotspot' in data) {
            if (data.hotspot) node.HO = [1]
            else delete node.HO
        }

        let clearProperties = properties => properties.forEach(p => delete node[p])

        if ('moveAnnotation' in data) {
            let moveData = {'BM': 1, 'DO': '', 'IT': '', 'TE': 1}

            clearProperties(Object.keys(moveData))

            if (data.moveAnnotation != null)
                node[data.moveAnnotation] = moveData[data.moveAnnotation]
        }

        if ('positionAnnotation' in data) {
            let positionData = {'UC': 1, 'GW': 1, 'GB': 1, 'DM': 1}

            clearProperties(Object.keys(positionData))

            if (data.positionAnnotation != null)
                node[data.positionAnnotation] = positionData[data.positionAnnotation]
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

        let updateRoot = !tree.parent
        let oldLength = tree.nodes.length
        let splitted = gametree.split(tree, index)
        let copied = gametree.clone(this.copyVariationData, true)

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

        let {rootTree, gameIndex} = this.inferredState
        let board = gametree.get(tree, index)
        let rootNode = rootTree.nodes[0]
        let inherit = ['BR', 'BT', 'DT', 'EV', 'GN', 'GC', 'PB', 'PW', 'RE', 'SO', 'WT', 'WR']

        let clone = gametree.clone(tree)
        if (index !== 0) gametree.split(clone, index - 1)
        let node = clone.nodes[0]

        node.AB = []
        node.AW = []
        node.AE = []
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

        let {gameTrees} = this.state
        gameTrees[gameIndex] = clone
        this.setState({gameTrees})
        this.setCurrentTreePosition(clone, 0)
    }

    makeMainVariation(tree, index, {setUndoPoint = true} = {}) {
        if (setUndoPoint) this.setUndoPoint('Restore Main Variation')
        this.closeDrawers()

        let t = tree

        while (t.parent != null) {
            t.parent.subtrees.splice(t.parent.subtrees.indexOf(t), 1)
            t.parent.subtrees.unshift(t)
            t.parent.current = 0

            t = t.parent
        }

        t = tree

        while (t.current != null) {
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
        this.closeDrawers()

        let subtrees = tree.parent.subtrees
        let m = subtrees.length
        let i = subtrees.indexOf(tree)
        let iNew = ((i + step) % m + m) % m

        subtrees.splice(i, 1)
        subtrees.splice(iNew, 0, tree)

        this.setCurrentTreePosition(tree, index)
    }

    removeNode(tree, index, {suppressConfirmation = false, setUndoPoint = true} = {}) {
        if (!tree.parent && index === 0) {
            this.showMessageBox('The root node cannot be removed.', 'warning')
            return
        }

        if (suppressConfirmation !== true
        && setting.get('edit.show_removenode_warning')
        && this.showMessageBox(
            'Do you really want to remove this node?',
            'warning',
            ['Remove Node', 'Cancel'], 1
        ) === 1) return

        // Save undo information

        if (setUndoPoint) this.setUndoPoint('Undo Remove Node')

        // Remove node

        this.closeDrawers()
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
        && this.showMessageBox(
            'Do you really want to remove all other variations?',
            'warning',
            ['Remove Variations', 'Cancel'], 1
        ) == 1) return

        // Save undo information

        if (setUndoPoint) this.setUndoPoint('Undo Remove Other Variations')
        this.closeDrawers()

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
        menu.popup(remote.getCurrentWindow(), Object.assign({async: true}, options))
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
                scoreBoard.captures[sign > 0 ? 0 : 1]++
                scoreBoard.set(vertex, 0)
            }

            areaMap = state.mode === 'estimator' ? scoreBoard.getAreaEstimateMap()
                : scoreBoard.getAreaMap()
        }

        this.inferredState = {
            rootTree,
            gameIndex: state.gameTrees.indexOf(rootTree),
            gameInfo: gametree.getGameInfo(rootTree),
            currentPlayer: gametree.getCurrentPlayer(...state.treePosition),
            scoreBoard,
            areaMap
        }

        state = Object.assign(state, this.inferredState)

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

document.querySelector('link.userstyle').href = setting.stylesPath

// Render

render(h(App), document.body)
