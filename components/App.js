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

            // Board state

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

        this.events = new EventEmitter()
        this.window = remote.getCurrentWindow()
        this.treeHash = this.generateTreeHash()

        this.componentWillUpdate({}, this.state)
    }

    componentDidMount() {
        // Handle file drag & drop

        document.body.addEventListener('dragover', evt => evt.preventDefault())
        document.body.addEventListener('drop', evt => {
            evt.preventDefault()

            if (evt.dataTransfer.files.length === 0) return
            sabaki.loadFile(evt.dataTransfer.files[0].path)
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
            if (!sabaki.askForSave()) evt.returnValue = ' '
        })

        this.newFile()
        this.window.show()

        this.events.emit('ready')
    }

    componentWillUpdate(_, nextState) {
        // Update title

        let {basename} = require('path')
        let title = app.getName()
        let {representedFilename, gameTrees, treePosition: [tree, ]} = this.state

        if (representedFilename)
            title = basename(representedFilename)
        if (gameTrees.length > 1)
            title += ' — Game ' + (this.inferredState.gameIndex + 1)
        if (representedFilename && process.platform != 'darwin')
            title += ' — ' + app.getName()

        if (document.title !== title)
            document.title = title

        // Handle full screen

        if (nextState.fullScreen !== this.state.fullScreen) {
            this.window.setFullScreen(nextState.fullScreen)
            this.window.setMenuBarVisibility(!nextState.fullScreen)
            this.window.setAutoHideMenuBar(nextState.fullScreen)
        }
    }

    // Sabaki API

    setSelectedTool(tool) {
        this.setState({selectedTool: tool})
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

    setSidebarWidth(sidebarWidth) {
        this.setState({sidebarWidth})
        window.dispatchEvent(new Event('resize'))
    }

    setSidebarSplit(sidebarSplit) {
        this.setState({sidebarSplit})
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

    // Shell

    showMessageBox(message, type = 'info', buttons = ['OK'], cancelId = 0) {
        this.setState({busy: true})
        ipcRenderer.send('build-menu', true)

        let result = dialog.showMessageBox(remote.getCurrentWindow(), {
            type,
            buttons,
            title: app.getName(),
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
        this.setState({mode})
    }

    setOpenDrawer(drawer) {
        this.setState({openDrawer: drawer})
    }

    closeDrawers() {
        this.setOpenDrawer(null)
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
                    this.openCommentMenu({x, y})
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
        }
    }

    makeMove(vertex, {ignoreAutoplay = false} = {}) {
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
            setTimeout(() => this.setState({animatedVertex: null}), 200)
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

        if (createNode) this.clearUndoPoint()

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

    makeResign() {
        // TODO
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

            if (tool === 'line' && toDelete === -1)
                toDelete = board.lines.findIndex(x => helper.equals(x.slice(0, 2), [endVertex, vertex]))

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
                `This file has been changed outside of ${app.getName()}.`,
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

    loadContent(content, format, {
        suppressAskForSave = false,
        ignoreEncoding = false,
        callback = helper.noop
    } = {}) {
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

    setCurrentTreePosition(tree, index, {ignoreAutoplay = false} = {}) {
        if (['scoring', 'estimator'].includes(this.state.mode))
            return
        if (!ignoreAutoplay && this.state.autoplaying)
            this.setState({autoplaying: false})

        this.events.emit('navigating', {tree, index})

        let t = tree
        while (t.parent != null) {
            t.parent.current = t.parent.subtrees.indexOf(t)
            t = t.parent
        }

        this.setState({treePosition: [tree, index]})
        this.events.emit('navigated')
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

        this.setState({
            undoable: true,
            undoText
        })
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

    copyVariation(tree, index) {
        let clone = gametree.clone(tree)
        if (index != 0) gametree.split(clone, index - 1)

        this.copyVariationData = clone
    }

    cutVariation(tree, index) {
        this.setUndoPoint('Undo Cut Variation')
        this.copyVariation(tree, index)
        this.removeNode(tree, index, {
            suppressConfirmation: true,
            setUndoPoint: false
        })
    }

    pasteVariation(tree, index) {
        if (this.copyVariationData == null) return

        this.setUndoPoint('Undo Paste Variation')

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

    flattenVariation(tree, index) {
        this.setUndoPoint('Undo Flatten')

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

    makeMainVariation(tree, index) {
        this.setUndoPoint('Restore Main Variation')
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

    shiftVariation(tree, index, step) {
        if (!tree.parent) return

        this.setUndoPoint('Undo Shift Variation')
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

        if (index != 0) {
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

    removeOtherVariations(tree, index, {suppressConfirmation = false} = {}) {
        if (suppressConfirmation !== true && setting.get('edit.show_removeothervariations_warning') && this.showMessageBox(
            'Do you really want to remove all other variations?',
            'warning',
            ['Remove Variations', 'Cancel'], 1
        ) == 1) return

        // Save undo information

        this.setUndoPoint('Undo Remove Other Variations')
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

    openNodeMenu(tree, index, options) {
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
        menu.popup(this.window, options)
    }

    // Render

    render(_, state) {
        // Calculate some inferred values

        let rootTree = gametree.getRoot(...state.treePosition)

        this.inferredState = {
            rootTree,
            gameIndex: state.gameTrees.indexOf(rootTree),
            gameInfo: gametree.getGameInfo(rootTree),
            currentPlayer: gametree.getCurrentPlayer(...state.treePosition)
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

document.querySelector('head link.userstyle').href = setting.stylesPath

// Render

render(h(App), document.body)
