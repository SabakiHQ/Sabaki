const fs = require('fs')
const EventEmitter = require('events')
const {ipcRenderer, remote} = require('electron')
const {app} = remote
const {h, render, Component} = require('preact')
const classNames = require('classnames')

const ThemeManager = require('./ThemeManager')
const MainView = require('./MainView')
const LeftSidebar = require('./LeftSidebar')
const Sidebar = require('./Sidebar')
const DrawerManager = require('./DrawerManager')
const InputBox = require('./InputBox')
const BusyScreen = require('./BusyScreen')
const InfoOverlay = require('./InfoOverlay')

const deadstones = require('@sabaki/deadstones')
const gtp = require('@sabaki/gtp')
const sgf = require('@sabaki/sgf')
const influence = require('@sabaki/influence')

deadstones.useFetch('./node_modules/@sabaki/deadstones/wasm/deadstones_bg.wasm')

const Board = require('../modules/board')
const EngineSyncer = require('../modules/enginesyncer')
const dialog = require('../modules/dialog')
const fileformats = require('../modules/fileformats')
const gametree = require('../modules/gametree')
const helper = require('../modules/helper')
const rotation = require('../modules/rotation')
const setting = remote.require('./setting')
const sound = require('../modules/sound')
const gtplogger = require('../modules/gtplogger')

class App extends Component {
    constructor() {
        super()
        window.sabaki = this

        let emptyTree = gametree.new()

        this.state = {
            mode: 'play',
            openDrawer: null,
            busy: 0,
            fullScreen: false,
            showMenuBar: null,
            zoomFactor: null,

            representedFilename: null,
            gameIndex: 0,
            gameTrees: [emptyTree],
            gameCurrents: [{}],
            treePosition: emptyTree.root.id,

            // Bars

            selectedTool: 'stone_1',
            scoringMethod: null,
            findText: '',
            findVertex: null,
            deadStones: [],
            blockedGuesses: [],

            // Goban

            highlightVertices: [],
            playVariation: null,
            showCoordinates: null,
            showMoveColorization: null,
            showMoveNumbers: null,
            showNextMoves: null,
            showSiblings: null,
            fuzzyStonePlacement: null,
            animateStonePlacement: null,

            // Sidebar

            consoleLog: [],
            showConsole: setting.get('view.show_leftsidebar'),
            leftSidebarWidth: setting.get('view.leftsidebar_width'),
            showGameGraph: setting.get('view.show_graph'),
            showCommentBox: setting.get('view.show_comments'),
            sidebarWidth: setting.get('view.sidebar_width'),
            graphGridSize: null,
            graphNodeSize: null,

            // Engines

            engines: null,
            attachedEngines: [null, null],
            engineBusy: [false, false],
            engineCommands: [[], []],
            generatingMoves: false,
            analysisTreePosition: null,
            analysis: null,

            // Drawers

            preferencesTab: 'general',

            // Input Box

            showInputBox: false,
            inputBoxText: '',
            onInputBoxSubmit: helper.noop,
            onInputBoxCancel: helper.noop,

            // Info Overlay

            infoOverlayText: '',
            showInfoOverlay: false
        }

        this.events = new EventEmitter()
        this.appName = app.getName()
        this.version = app.getVersion()
        this.window = remote.getCurrentWindow()

        this.treeHash = this.generateTreeHash()
        this.attachedEngineSyncers = [null, null]

        this.historyPointer = 0
        this.history = []
        this.recordHistory()

        // Expose submodules

        this.modules = {Board, EngineSyncer, dialog, fileformats,
            gametree, helper, setting, sound}

        // Bind state to settings

        setting.events.on('change', ({key}) => this.updateSettingState(key))
        this.updateSettingState()
    }

    componentDidMount() {
        window.addEventListener('contextmenu', evt => {
            evt.preventDefault()
        })

        window.addEventListener('load', () => {
            this.events.emit('ready')
        })

        ipcRenderer.on('load-file', (evt, ...args) => {
            setTimeout(() => this.loadFile(...args), setting.get('app.loadgame_delay'))
        })

        this.window.on('focus', () => {
            if (setting.get('file.show_reload_warning')) {
                this.askForReload()
            }

            ipcRenderer.send('build-menu', this.state.busy > 0)
        })

        this.window.on('resize', () => {
            clearTimeout(this.resizeId)

            this.resizeId = setTimeout(() => {
                if (!this.window.isMaximized() && !this.window.isMinimized() && !this.window.isFullScreen()) {
                    let [width, height] = this.window.getContentSize()
                    setting.set('window.width', width).set('window.height', height)
                }
            }, 1000)
        })

        // Handle mouse wheel

        for (let el of document.querySelectorAll('#main main, #graph, #winrategraph')) {
            el.addEventListener('wheel', evt => {
                evt.preventDefault()

                if (this.residueDeltaY == null) this.residueDeltaY = 0
                this.residueDeltaY += evt.deltaY

                if (Math.abs(this.residueDeltaY) >= setting.get('game.navigation_sensitivity')) {
                    this.goStep(Math.sign(this.residueDeltaY))
                    this.residueDeltaY = 0
                }
            })
        }

        // Handle file drag & drop

        document.body.addEventListener('dragover', evt => evt.preventDefault())
        document.body.addEventListener('drop', evt => {
            evt.preventDefault()

            if (evt.dataTransfer.files.length === 0) return
            this.loadFile(evt.dataTransfer.files[0])
        })

        // Handle keys

        document.addEventListener('keydown', evt => {
            if (evt.key === 'Escape') {
                if (this.state.generatingMoves) {
                    this.stopGeneratingMoves()
                } else if (this.state.openDrawer != null) {
                    this.closeDrawer()
                } else if (this.state.mode !== 'play') {
                    this.setMode('play')
                } else if (this.state.fullScreen) {
                    this.setState({fullScreen: false})
                }
            } else if (!evt.ctrlKey && !evt.metaKey && ['ArrowUp', 'ArrowDown'].includes(evt.key)) {
                if (
                    this.state.busy > 0
                    || helper.isTextLikeElement(document.activeElement)
                ) return

                evt.preventDefault()

                let sign = evt.key === 'ArrowUp' ? -1 : 1
                this.startAutoscrolling(sign)
            } else if ((evt.ctrlKey || evt.metaKey) && ['z', 'y'].includes(evt.key.toLowerCase())) {
                if (this.state.busy > 0) return

                // Hijack browser undo/redo

                let step = evt.key.toLowerCase() === 'z' ? -1 : 1
                if (evt.shiftKey) step = -step

                let action = step < 0 ? 'undo' : 'redo'

                if (action != null) {
                    if (helper.isTextLikeElement(document.activeElement)) {
                        return
                    } else {
                        evt.preventDefault()
                        this[action]()
                    }
                }
            }
        })

        document.addEventListener('keyup', evt => {
            if (this.autoscrollId == null) return

            if (['ArrowUp', 'ArrowDown'].includes(evt.key)) {
                this.stopAutoscrolling()
            }
        })

        // Handle other keyboard shortcuts

        document.addEventListener('keydown', evt => {
            if (['input', 'textarea'].indexOf(document.activeElement.tagName.toLowerCase()) >= 0) {
                return
            }

            if (evt.key === 'Home') {
                this.goToBeginning()
            } else if (evt.key === 'End') {
                this.goToEnd()
            } else if (evt.key === 'ArrowLeft') {
                this.goToSiblingVariation(-1)
            } else if (evt.key === 'ArrowRight') {
                this.goToSiblingVariation(1)
            }
        })

        // Handle window closing

        window.addEventListener('beforeunload', evt => {
            evt.returnValue = ' '
        })

        this.newFile()
    }

    componentDidUpdate(_, prevState = {}) {
        // Update title

        let {basename} = require('path')
        let title = this.appName
        let {representedFilename, gameIndex, gameTrees} = this.state

        if (representedFilename)
            title = basename(representedFilename)
        if (gameTrees.length > 1)
            title += ' — Game ' + (gameIndex + 1)
        if (representedFilename && process.platform != 'darwin')
            title += ' — ' + this.appName

        if (document.title !== title)
            document.title = title

        // Handle full screen & menu bar

        if (prevState.fullScreen !== this.state.fullScreen) {
            if (this.state.fullScreen) this.flashInfoOverlay('Press Esc to exit full screen mode')
            this.window.setFullScreen(this.state.fullScreen)
        }

        if (prevState.showMenuBar !== this.state.showMenuBar) {
            if (!this.state.showMenuBar) this.flashInfoOverlay('Press Alt to show menu bar')
            this.window.setMenuBarVisibility(this.state.showMenuBar)
            this.window.setAutoHideMenuBar(!this.state.showMenuBar)
        }

        // Handle sidebar showing/hiding

        if (
            prevState.showLeftSidebar !== this.state.showLeftSidebar
            || prevState.showSidebar !== this.state.showSidebar
        ) {
            let [width, height] = this.window.getContentSize()
            let widthDiff = 0

            if (prevState.showSidebar !== this.state.showSidebar) {
                widthDiff += this.state.sidebarWidth * (this.state.showSidebar ? 1 : -1)
            }

            if (prevState.showLeftSidebar !== this.state.showLeftSidebar) {
                widthDiff += this.state.leftSidebarWidth * (this.state.showLeftSidebar ? 1 : -1)
            }

            if (!this.window.isMaximized() && !this.window.isMinimized() && !this.window.isFullScreen()) {
                this.window.setContentSize(width + widthDiff, height)
            }

            window.dispatchEvent(new Event('resize'))
        }

        // Handle zoom factor

        if (prevState.zoomFactor !== this.state.zoomFactor) {
            this.window.webContents.setZoomFactor(this.state.zoomFactor)
        }
    }

    updateSettingState(key = null) {
        let data = {
            'app.zoom_factor': 'zoomFactor',
            'view.show_menubar': 'showMenuBar',
            'view.show_coordinates': 'showCoordinates',
            'view.show_move_colorization': 'showMoveColorization',
            'view.show_move_numbers': 'showMoveNumbers',
            'view.show_next_moves': 'showNextMoves',
            'view.show_siblings': 'showSiblings',
            'view.fuzzy_stone_placement': 'fuzzyStonePlacement',
            'view.animated_stone_placement': 'animateStonePlacement',
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
            ipcRenderer.send('build-menu', this.state.busy > 0)
            this.setState({[data[key]]: setting.get(key)})
        }
    }

    waitForRender() {
        return new Promise(resolve => this.setState({}, resolve))
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

            let {gameIndex, gameTrees, treePosition} = this.state
            let iterations = setting.get('score.estimator_iterations')
            let tree = gameTrees[gameIndex]

            deadstones.guess(gametree.getBoard(tree, treePosition).arrangement, {
                finished: mode === 'scoring',
                iterations
            }).then(result => {
                this.setState({deadStones: result})
            })
        } else if (mode === 'edit') {
            this.waitForRender()
            .then(() => {
                let textarea = document.querySelector('#properties .edit textarea')

                textarea.selectionStart = textarea.selectionEnd = 0
                textarea.focus()
            })
        }

        this.setState(stateChange)
        this.events.emit('modeChange')
    }

    openDrawer(drawer) {
        this.setState({openDrawer: drawer})
    }

    closeDrawer() {
        this.openDrawer(null)
    }

    setBusy(busy) {
        let diff = busy ? 1 : -1;
        this.setState(s => ({busy: Math.max(s.busy + diff, 0)}))
    }

    showInfoOverlay(text) {
        this.setState({
            infoOverlayText: text,
            showInfoOverlay: true
        })
    }

    hideInfoOverlay() {
        this.setState({showInfoOverlay: false})
    }

    flashInfoOverlay(text, duration = null) {
        if (duration == null) duration = setting.get('infooverlay.duration')

        this.showInfoOverlay(text)

        clearTimeout(this.hideInfoOverlayId)
        this.hideInfoOverlayId = setTimeout(() => this.hideInfoOverlay(), duration)
    }

    clearConsole() {
        this.setState({consoleLog: []})
    }

    // History Management

    recordHistory({prevGameIndex, prevTreePosition} = {}) {
        let currentEntry = this.history[this.historyPointer]
        let newEntry = {
            gameIndex: this.state.gameIndex,
            gameTrees: this.state.gameTrees,
            treePosition: this.state.treePosition,
            timestamp: Date.now()
        }

        if (
            currentEntry != null
            && helper.shallowEquals(currentEntry.gameTrees, newEntry.gameTrees)
        ) return

        this.history = this.history.slice(-setting.get('edit.max_history_count'), this.historyPointer + 1)

        if (
            currentEntry != null
            && newEntry.timestamp - currentEntry.timestamp < setting.get('edit.history_batch_interval')
        ) {
            this.history[this.historyPointer] = newEntry
        } else {
            if (currentEntry != null && prevGameIndex != null && prevTreePosition != null) {
                currentEntry.gameIndex = prevGameIndex
                currentEntry.treePosition = prevTreePosition
            }

            this.history.push(newEntry)
            this.historyPointer = this.history.length - 1
        }
    }

    clearHistory() {
        this.history = []
        this.recordHistory()
    }

    checkoutHistory(historyPointer) {
        let entry = this.history[historyPointer]
        if (entry == null) return

        let gameTree = entry.gameTrees[entry.gameIndex]

        this.historyPointer = historyPointer
        this.setState({
            gameIndex: entry.gameIndex,
            gameTrees: entry.gameTrees,
            gameCurrents: entry.gameTrees.map(_ => ({}))
        })

        this.setCurrentTreePosition(gameTree, entry.treePosition, {clearCache: true})
    }

    undo() {
        this.checkoutHistory(this.historyPointer - 1)
    }

    redo() {
        this.checkoutHistory(this.historyPointer + 1)
    }

    // File Management

    getEmptyGameTree() {
        let handicap = setting.get('game.default_handicap')
        let size = setting.get('game.default_board_size').toString().split(':').map(x => +x)
        let [width, height] = [size[0], size.slice(-1)[0]]
        let handicapStones = new Board(width, height).getHandicapPlacement(handicap).map(sgf.stringifyVertex)

        let sizeInfo = width === height ? width.toString() : `${width}:${height}`
        let date = new Date()
        let dateInfo = sgf.stringifyDates([[date.getFullYear(), date.getMonth() + 1, date.getDate()]])

        return gametree.new().mutate(draft => {
            let rootData = {
                GM: ['1'], FF: ['4'], CA: ['UTF-8'],
                AP: [`${this.appName}:${this.version}`],
                KM: [setting.get('game.default_komi')],
                SZ: [sizeInfo], DT: [dateInfo]
            }

            if (handicapStones.length > 0) {
                Object.assign(rootData, {
                    HA: [handicap.toString()],
                    AB: handicapStones
                })
            }

            for (let prop in rootData) {
                draft.updateProperty(draft.root.id, prop, rootData[prop])
            }
        })
    }

    async newFile({playSound = false, showInfo = false, suppressAskForSave = false} = {}) {
        let emptyTree = this.getEmptyGameTree()

        await this.loadGameTrees([emptyTree], {suppressAskForSave})

        if (showInfo) this.openDrawer('info')
        if (playSound) sound.playNewGame()
    }

    async loadFile(file = null, {suppressAskForSave = false} = {}) {
        if (!suppressAskForSave && !this.askForSave()) return

        if (!file) {
            dialog.showOpenDialog({
                properties: ['openFile'],
                filters: [...fileformats.meta, {name: 'All Files', extensions: ['*']}]
            }, ({result}) => {
                if (result) file = result[0]
                if (file) this.loadFile(file, {suppressAskForSave: true})
            })

            return
        }

        this.setBusy(true)

        let {extname} = require('path')
        let extension = extname(file.name).slice(1)
        let content = await new Promise((resolve, reject) =>
            fs.readFile(file, (err, content) => err ? reject(err) : resolve(content))
        )

        let gameTrees = []
        let success = true
        let lastProgress = -1

        try {
            let fileFormatModule = fileformats.getModuleByExtension(extension)

            gameTrees = fileFormatModule.parse(content, evt => {
                if (evt.progress - lastProgress < 0.1) return
                this.window.setProgressBar(evt.progress)
                lastProgress = evt.progress
            }, true)

            if (gameTrees.length == 0) throw true
        } catch (err) {
            dialog.showMessageBox('This file is unreadable.', 'warning')
            success = false
        }

        if (success) {
            await this.loadGameTrees(gameTrees, {suppressAskForSave: true})

            this.setState({representedFilename: file.name})
            this.fileHash = this.generateFileHash()

            if (setting.get('game.goto_end_after_loading')) {
                this.goToEnd()
            }
        }

        this.setBusy(false)
    }

    async loadContent(content, extension, {suppressAskForSave = false} = {}) {
        this.setBusy(true)

        let gameTrees = []
        let success = true
        let lastProgress = -1

        try {
            let fileFormatModule = fileformats.getModuleByExtension(extension)

            gameTrees = fileFormatModule.parse(content, evt => {
                if (evt.progress - lastProgress < 0.1) return
                this.window.setProgressBar(evt.progress)
                lastProgress = evt.progress
            })

            if (gameTrees.length == 0) throw true
        } catch (err) {
            dialog.showMessageBox('This file is unreadable.', 'warning')
            success = false
        }

        if (success) {
            await this.loadGameTrees(gameTrees, {suppressAskForSave})
        }

        this.setBusy(false)
    }

    async loadGameTrees(gameTrees, {suppressAskForSave = false} = {}) {
        gtplogger.rotate()

        if (!suppressAskForSave && !this.askForSave()) return

        this.setBusy(true)
        if (this.state.openDrawer !== 'gamechooser') this.closeDrawer()
        this.setMode('play')

        await helper.wait(setting.get('app.loadgame_delay'))

        if (gameTrees.length != 0) {
            this.detachEngines()
            this.clearConsole()

            this.setState({
                representedFilename: null,
                gameIndex: 0,
                gameTrees,
                gameCurrents: gameTrees.map(_ => ({}))
            })

            let [firstTree, ] = gameTrees
            this.setCurrentTreePosition(firstTree, firstTree.root.id, {clearCache: true})

            this.treeHash = this.generateTreeHash()
            this.fileHash = this.generateFileHash()

            this.clearHistory()
        }

        this.setBusy(false)
        this.window.setProgressBar(-1)
        this.events.emit('fileLoad')

        if (gameTrees.length > 1) {
            await helper.wait(setting.get('gamechooser.show_delay'))
            this.openDrawer('gamechooser')
        }
    }

    saveFile(filename = null) {
        dialog.showSaveDialog({
            type: 'application/x-go-sgf',
            name: this.state.representedFilename || 'game.sgf',
            content: this.getSGF()
        })

        this.treeHash = this.generateTreeHash()
        this.fileHash = this.generateFileHash()

        return true
    }

    getSGF() {
        let {gameTrees} = this.state

        gameTrees = gameTrees.map(tree => tree.mutate(draft => {
            draft.updateProperty(draft.root.id, 'AP', [`${this.appName}:${this.version}`])
            draft.updateProperty(draft.root.id, 'CA', ['UTF-8'])
        }))

        this.setState({gameTrees})
        this.recordHistory()

        return sgf.stringify(gameTrees.map(tree => tree.root))
    }

    generateTreeHash() {
        return this.state.gameTrees.map(tree => gametree.getHash(tree)).join('-')
    }

    generateFileHash() {
    }

    askForSave() {
        let hash = this.generateTreeHash()

        if (hash !== this.treeHash) {
            let answer = dialog.showMessageBox(
                'Your changes will be lost if you close this file without saving. Do you want to continue?',
                'warning',
                ['Save', 'Don’t Save', 'Cancel'], 2
            )

            if (answer === 0) return true
            else if (answer === 2) return false
        }

        return true
    }

    askForReload() {
    }

    // Playing

    clickVertex(vertex, {button = 0, ctrlKey = false, x = 0, y = 0} = {}) {
        this.closeDrawer()

        let {gameTrees, gameIndex, gameCurrents, treePosition} = this.state
        let tree = gameTrees[gameIndex]
        let board = gametree.getBoard(tree, treePosition)
        let node = tree.get(treePosition)

        if (typeof vertex == 'string') {
            vertex = board.coord2vertex(vertex)
        }

        let [vx, vy] = vertex

        if (['play', 'autoplay'].includes(this.state.mode)) {
            if (button === 0) {
                if (board.get(vertex) === 0) {
                    let autoGenmove = setting.get('gtp.auto_genmove')
                    this.makeMove(vertex, {sendToEngine: autoGenmove})
                } else if (
                    board.markers[vy][vx] != null
                    && board.markers[vy][vx].type === 'point'
                    && setting.get('edit.click_currentvertex_to_remove')
                ) {
                    this.removeNode(tree, treePosition)
                }
            } else if (button === 2) {
                if (
                    board.markers[vy][vx] != null
                    && board.markers[vy][vx].type === 'point'
                ) {
                    // Show annotation context menu

                    this.openCommentMenu(tree, treePosition, {x, y})
                } else if (this.state.analysis != null) {
                    // Show analysis context menu

                    let data = this.state.analysis.find(x => helper.vertexEquals(x.vertex, vertex))

                    if (data != null) {
                        let maxVisitsWin = Math.max(...this.state.analysis.map(x => x.visits * x.win))
                        let strength = Math.round(data.visits * data.win * 8 / maxVisitsWin) + 1
                        let annotationProp = strength >= 8 ? 'TE'
                            : strength >= 5 ? 'IT'
                            : strength >= 3 ? 'DO'
                            : 'BM'
                        let annotationValues = {'BM': '1', 'DO': '', 'IT': '', 'TE': '1'}
                        let winrate = Math.round((data.sign > 0 ? data.win : 100 - data.win) * 100) / 100

                        this.openVariationMenu(data.sign, data.variation, {
                            x, y,
                            startNodeProperties: {
                                [annotationProp]: [annotationValues[annotationProp]],
                                SBKV: [winrate.toString()]
                            }
                        })
                    }
                }
            }
        } else if (this.state.mode === 'edit') {
            if (ctrlKey) {
                // Add coordinates to comment

                let coord = board.vertex2coord(vertex)
                let commentText = node.data.C ? node.data.C[0] : ''

                let newTree = tree.mutate(draft => {
                    draft.updateProperty(node.id, 'C',
                        commentText !== '' ? [commentText.trim() + ' ' + coord] : [coord]
                    )
                })

                this.setCurrentTreePosition(newTree, node.id)
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
                    helper.popupMenu(template, x, y)

                    return
                }
            }

            if (['line', 'arrow'].includes(tool)) {
                // Remember clicked vertex and pass as an argument the second time

                if (!this.editVertexData || this.editVertexData[0] !== tool) {
                    this.useTool(tool, vertex)
                    this.editVertexData = [tool, vertex]
                } else {
                    this.useTool(tool, this.editVertexData[1], vertex)
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

            let nextNode = tree.navigate(treePosition, 1, gameCurrents[gameIndex])
            if (nextNode == null || (nextNode.data.B == null && nextNode.data.W == null)) {
                return this.setMode('play')
            }

            let nextVertex = sgf.parseVertex(nextNode.data[nextNode.data.B != null ? 'B' : 'W'][0])
            let board = gametree.getBoard(tree, treePosition)
            if (!board.hasVertex(nextVertex)) {
                return this.setMode('play')
            }

            if (helper.vertexEquals(vertex, nextVertex)) {
                this.makeMove(vertex, {player: nextNode.data.B != null ? 1 : -1})
            } else {
                if (
                    board.get(vertex) !== 0
                    || this.state.blockedGuesses.some(v => helper.vertexEquals(v, vertex))
                ) return

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

    makeMove(vertex, {player = null, sendToEngine = false} = {}) {
        if (!['play', 'autoplay', 'guess'].includes(this.state.mode)) {
            this.closeDrawer()
            this.setMode('play')
        }

        let {gameTrees, gameIndex, treePosition} = this.state
        let tree = gameTrees[gameIndex]
        let node = tree.get(treePosition)
        let board = gametree.getBoard(tree, treePosition)

        if (typeof vertex == 'string') {
            vertex = board.coord2vertex(vertex)
        }

        let pass = !board.hasVertex(vertex)
        if (!pass && board.get(vertex) !== 0) return

        let prev = tree.get(node.parentId)
        if (!player) player = this.inferredState.currentPlayer
        let color = player > 0 ? 'B' : 'W'
        let capture = false, suicide = false, ko = false
        let newNodeData = {[color]: [sgf.stringifyVertex(vertex)]}

        if (!pass) {
            // Check for ko

            if (prev != null && setting.get('game.show_ko_warning')) {
                let hash = board.makeMove(player, vertex).getPositionHash()
                let prevBoard = gametree.getBoard(tree, prev.id)

                ko = prevBoard.getPositionHash() === hash

                if (ko && dialog.showMessageBox(
                    [
                        'You are about to play a move which repeats a previous board position.',
                        'This is invalid in some rulesets. Do you want to play anyway?'
                    ].join('\n'),
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
                    [
                        'You are about to play a suicide move.',
                        'This is invalid in some rulesets. Do you want to play anyway?'
                    ].join('\n'),
                    'info',
                    ['Play Anyway', 'Don’t Play'], 1
                ) != 0) return
            }
        }

        // Update data

        let nextTreePosition
        let newTree = tree.mutate(draft => {
            nextTreePosition = draft.appendNode(treePosition, newNodeData)
        })

        let createNode = tree.get(nextTreePosition) == null

        this.setCurrentTreePosition(newTree, nextTreePosition)

        // Play sounds

        if (!pass) {
            let delay = setting.get('sound.capture_delay_min')
            delay += Math.floor(Math.random() * (setting.get('sound.capture_delay_max') - delay))

            if (capture || suicide) sound.playCapture(delay)
            sound.playPachi()
        } else {
            sound.playPass()
        }

        // Enter scoring mode after two consecutive passes

        let enterScoring = false

        if (pass && createNode && prev != null) {
            let prevColor = color === 'B' ? 'W' : 'B'
            let prevPass = node.data[prevColor] != null && node.data[prevColor][0] === ''

            if (prevPass) {
                enterScoring = true
                this.setMode('scoring')
            }
        }

        // Emit event

        this.events.emit('moveMake', {pass, capture, suicide, ko, enterScoring})

        if (sendToEngine && this.attachedEngineSyncers.some(x => x != null)) {
            // Send command to engine

            let passPlayer = pass ? player : null
            setTimeout(() => this.generateMove({passPlayer}), setting.get('gtp.move_delay'))
        }
    }

    makeResign({player = null} = {}) {
        let {gameTrees, gameIndex, treePosition} = this.state
        let {currentPlayer} = this.inferredState
        if (player == null) player = currentPlayer
        let color = player > 0 ? 'W' : 'B'
        let tree = gameTrees[gameIndex]

        let newTree = tree.mutate(draft => {
            draft.updateProperty(draft.root.id, 'RE', [`${color}+Resign`])
        })

        this.makeMainVariation(newTree, treePosition)
        this.makeMove([-1, -1], {player})

        this.events.emit('resign', {player})
    }

    useTool(tool, vertex, argument = null) {
        let {gameTrees, gameIndex, treePosition} = this.state
        let {currentPlayer} = this.inferredState
        let tree = gameTrees[gameIndex]
        let board = gametree.getBoard(tree, treePosition)
        let node = tree.get(treePosition)

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

        let newTree = tree.mutate(draft => {
            if (['stone_-1', 'stone_1'].includes(tool)) {
                if (node.data.B != null || node.data.W != null || node.children.length > 0) {
                    // New child needed

                    let id = draft.appendNode(treePosition, {PL: currentPlayer > 0 ? ['B'] : ['W']})
                    node = draft.get(id)
                }

                let sign = tool === 'stone_1' ? 1 : -1
                let oldSign = board.get(vertex)
                let properties = ['AW', 'AE', 'AB']
                let point = sgf.stringifyVertex(vertex)

                for (let prop of properties) {
                    if (node.data[prop] == null) continue

                    // Resolve compressed lists

                    if (node.data[prop].some(x => x.includes(':'))) {
                        draft.updateProperty(node.id, prop,
                            node.data[prop]
                            .map(value => sgf.parseCompressedVertices(value).map(sgf.stringifyVertex))
                            .reduce((list, x) => [...list, x])
                        )
                    }

                    // Remove residue

                    draft.removeFromProperty(node.id, prop, point)
                }

                let prop = oldSign !== sign ? properties[sign + 1] : 'AE'
                draft.addToProperty(node.id, prop, point)
            } else if (['line', 'arrow'].includes(tool)) {
                let endVertex = argument
                if (!endVertex || helper.vertexEquals(vertex, endVertex)) return

                // Check whether to remove a line

                let toDelete = board.lines.findIndex(x => helper.equals([x.v1, x.v2], [vertex, endVertex]))

                if (toDelete === -1) {
                    toDelete = board.lines.findIndex(x => helper.equals([x.v1, x.v2], [endVertex, vertex]))

                    if (toDelete >= 0 && tool !== 'line' && board.lines[toDelete].type === 'arrow') {
                        // Do not delete after all
                        toDelete = -1
                    }
                }

                // Mutate board first, then apply changes to actual game tree

                if (toDelete >= 0) {
                    board.lines.splice(toDelete, 1)
                } else {
                    board.lines.push({v1: vertex, v2: endVertex, type: tool})
                }

                draft.removeProperty(node.id, 'AR')
                draft.removeProperty(node.id, 'LN')

                for (let {v1, v2, type} of board.lines) {
                    let [p1, p2] = [v1, v2].map(sgf.stringifyVertex)
                    if (p1 === p2) continue

                    draft.addToProperty(node.id, type === 'arrow' ? 'AR' : 'LN', [p1, p2].join(':'))
                }
            } else {
                // Mutate board first, then apply changes to actual game tree

                let [x, y] = vertex

                if (tool === 'number') {
                    if (
                        board.markers[y][x] != null
                        && board.markers[y][x].type === 'label'
                    ) {
                        board.markers[y][x] = null
                    } else {
                        let number = node.data.LB == null ? 1 : node.data.LB
                            .map(x => parseFloat(x.slice(3)))
                            .filter(x => !isNaN(x))
                            .sort((a, b) => a - b)
                            .filter((x, i, arr) => i === 0 || x !== arr[i - 1])
                            .concat([null])
                            .findIndex((x, i) => i + 1 !== x) + 1

                        argument = number.toString()
                        board.markers[y][x] = {type: tool, label: number.toString()}
                    }
                } else if (tool === 'label') {
                    let label = argument

                    if (
                        label != null
                        && label.trim() === ''
                        || label == null
                        && board.markers[y][x] != null
                        && board.markers[y][x].type === 'label'
                    ) {
                        board.markers[y][x] = null
                    } else {
                        if (label == null) {
                            let alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
                            let letterIndex = Math.max(
                                node.data.LB == null ? 0 : node.data.LB
                                    .filter(x => x.length === 4)
                                    .map(x => alpha.indexOf(x[3]))
                                    .filter(x => x >= 0)
                                    .sort((a, b) => a - b)
                                    .filter((x, i, arr) => i === 0 || x !== arr[i - 1])
                                    .concat([null])
                                    .findIndex((x, i) => i !== x),
                                node.data.L == null ? 0 : node.data.L.length
                            )

                            label = alpha[Math.min(letterIndex, alpha.length - 1)]
                            argument = label
                        }

                        board.markers[y][x] = {type: tool, label}
                    }
                } else {
                    if (
                        board.markers[y][x] != null
                        && board.markers[y][x].type === tool
                    ) {
                        board.markers[y][x] = null
                    } else {
                        board.markers[y][x] = {type: tool}
                    }
                }

                draft.removeProperty(node.id, 'L')
                for (let id in data) draft.removeProperty(node.id, data[id])

                // Now apply changes to game tree

                for (let x = 0; x < board.width; x++) {
                    for (let y = 0; y < board.height; y++) {
                        let v = [x, y]
                        if (board.markers[y][x] == null) continue

                        let prop = data[board.markers[y][x].type]
                        let value = sgf.stringifyVertex(v)
                        if (prop === 'LB') value += ':' + board.markers[y][x].label

                        draft.addToProperty(node.id, prop, value)
                    }
                }
            }
        })

        this.setCurrentTreePosition(newTree, node.id)

        this.events.emit('toolUse', {tool, vertex, argument})
    }

    // Navigation

    setCurrentTreePosition(tree, id, {clearCache = false} = {}) {
        if (clearCache) gametree.clearBoardCache()

        if (['scoring', 'estimator'].includes(this.state.mode)) {
            this.setState({mode: 'play'})
        }

        let {gameTrees, gameCurrents} = this.state
        let gameIndex = gameTrees.findIndex(t => t.root.id === tree.root.id)
        let currents = gameCurrents[gameIndex]

        let n = tree.get(id)
        while (n.parentId != null) {
            // Update currents

            currents[n.parentId] = n.id
            n = tree.get(n.parentId)
        }

        if (this.state.analysisTreePosition != null && id !== this.state.analysisTreePosition) {
            // Continuous analysis

            clearTimeout(this.navigateAnalysisId)

            this.stopAnalysis({removeAnalysisData: false})
            this.navigateAnalysisId = setTimeout(() => {
                this.startAnalysis({showWarning: false})
            }, setting.get('game.navigation_analysis_delay'))
        }

        let prevGameIndex = this.state.gameIndex
        let prevTreePosition = this.state.treePosition

        this.setState({
            playVariation: null,
            blockedGuesses: [],
            highlightVertices: [],
            gameTrees: gameTrees.map((t, i) => i !== gameIndex ? t : tree),
            gameIndex,
            treePosition: id
        })

        this.recordHistory({prevGameIndex, prevTreePosition})

        this.events.emit('navigate')
    }

    goStep(step) {
        let {gameTrees, gameIndex, gameCurrents, treePosition} = this.state
        let tree = gameTrees[gameIndex]
        let node = tree.navigate(treePosition, step, gameCurrents[gameIndex])
        if (node != null) this.setCurrentTreePosition(tree, node.id)
    }

    goToMoveNumber(number) {
        number = +number

        if (isNaN(number)) return
        if (number < 0) number = 0

        let {gameTrees, gameIndex, gameCurrents} = this.state
        let tree = gameTrees[gameIndex]
        let node = tree.navigate(tree.root.id, Math.round(number), gameCurrents[gameIndex])

        if (node != null) this.setCurrentTreePosition(tree, node.id)
        else this.goToEnd()
    }

    goToNextFork() {
        let {gameTrees, gameIndex, gameCurrents, treePosition} = this.state
        let tree = gameTrees[gameIndex]
        let next = tree.navigate(treePosition, 1, gameCurrents[gameIndex])
        if (next == null) return
        let sequence = [...tree.getSequence(next.id)]

        this.setCurrentTreePosition(tree, sequence.slice(-1)[0].id)
    }

    goToPreviousFork() {
        let {gameTrees, gameIndex, gameCurrents, treePosition} = this.state
        let tree = gameTrees[gameIndex]
        let node = tree.get(treePosition)
        let prev = tree.get(node.parentId)
        if (prev == null) return
        let newTreePosition = tree.root.id

        for (let node of tree.listNodesVertically(prev.id, -1, gameCurrents[gameIndex])) {
            if (node.children.length > 1) {
                newTreePosition = node.id
                break
            }
        }

        this.setCurrentTreePosition(tree, newTreePosition)
    }

    goToComment(step) {
        let {gameTrees, gameIndex, gameCurrents, treePosition} = this.state
        let tree = gameTrees[gameIndex]
        let commentProps = setting.get('sgf.comment_properties')
        let newTreePosition = null

        for (let node of tree.listNodesVertically(treePosition, step, gameCurrents[gameIndex])) {
            if (node.id !== treePosition && commentProps.some(prop => node.data[prop] != null)) {
                newTreePosition = node.id
                break
            }
        }

        if (newTreePosition != null) this.setCurrentTreePosition(tree, newTreePosition)
    }

    goToBeginning() {
        let {gameTrees, gameIndex} = this.state
        let tree = gameTrees[gameIndex]

        this.setCurrentTreePosition(tree, tree.root.id)
    }

    goToEnd() {
        let {gameTrees, gameIndex, gameCurrents} = this.state
        let tree = gameTrees[gameIndex]
        let [node] = [...tree.listCurrentNodes(gameCurrents[gameIndex])].slice(-1)

        this.setCurrentTreePosition(tree, node.id)
    }

    goToSiblingVariation(step) {
        let {gameTrees, gameIndex, treePosition} = this.state
        let tree = gameTrees[gameIndex]
        let section = [...tree.getSection(tree.getLevel(treePosition))]
        let index = section.findIndex(node => node.id === treePosition)
        let newIndex = ((step + index) % section.length + section.length) % section.length

        this.setCurrentTreePosition(tree, section[newIndex].id)
    }

    goToMainVariation() {
        let {gameTrees, gameIndex, gameCurrents, treePosition} = this.state
        let tree = gameTrees[gameIndex]

        gameCurrents[gameIndex] = {}
        this.setState({gameCurrents})

        if (tree.onMainLine(treePosition)) {
            this.setCurrentTreePosition(tree, treePosition)
        } else {
            let id = treePosition
            while (!tree.onMainLine(id)) {
                id = tree.get(id).parentId
            }

            this.setCurrentTreePosition(tree, id)
        }
    }

    goToSiblingGame(step) {
        let {gameTrees, gameIndex} = this.state
        let newIndex = Math.max(0, Math.min(gameTrees.length - 1, gameIndex + step))

        this.setCurrentTreePosition(gameTrees[newIndex], gameTrees[newIndex].root.id)
    }

    startAutoscrolling(step) {
        if (this.autoscrollId != null) return

        let first = true
        let maxDelay = setting.get('autoscroll.max_interval')
        let minDelay = setting.get('autoscroll.min_interval')
        let diff = setting.get('autoscroll.diff')

        let scroll = (delay = null) => {
            this.goStep(step)

            clearTimeout(this.autoscrollId)
            this.autoscrollId = setTimeout(() => {
                scroll(first ? maxDelay : Math.max(minDelay, delay - diff))
                first = false
            }, delay)
        }

        scroll(400)
    }

    stopAutoscrolling() {
        clearTimeout(this.autoscrollId)
        this.autoscrollId = null
    }

    // Find Methods

    async findPosition(step, condition) {
        if (isNaN(step)) step = 1
        else step = step >= 0 ? 1 : -1

        this.setBusy(true)
        await helper.wait(setting.get('find.delay'))

        let {gameTrees, gameIndex, treePosition} = this.state
        let tree = gameTrees[gameIndex]
        let node = tree.get(treePosition)

        function* listNodes() {
            let iterator = tree.listNodesHorizontally(treePosition, step)
            iterator.next()

            yield* iterator

            let node = step > 0
                ? tree.root
                : [...tree.getSection(tree.getHeight() - 1)].slice(-1)[0]

            yield* tree.listNodesHorizontally(node.id, step)
        }

        for (node of listNodes()) {
            if (node.id === treePosition || condition(node)) break
        }

        this.setCurrentTreePosition(tree, node.id)
        this.setBusy(false)
    }

    async findHotspot(step) {
        await this.findPosition(step, node => node.data.HO != null)
    }

    async findMove(step, {vertex = null, text = ''}) {
        if (vertex == null && text.trim() === '') return
        let point = vertex ? sgf.stringifyVertex(vertex) : null

        await this.findPosition(step, node => {
            let cond = (prop, value) => node.data[prop] != null
                && node.data[prop][0].toLowerCase().includes(value.toLowerCase())

            return (!point || ['B', 'W'].some(x => cond(x, point)))
                && (!text || cond('C', text) || cond('N', text))
        })
    }

    // Node Actions

    getGameInfo(tree) {
        let komi = gametree.getRootProperty(tree, 'KM')
        if (komi != null && !isNaN(komi)) komi = +komi
        else komi = null

        let size = gametree.getRootProperty(tree, 'SZ')
        if (size == null) {
            size = [19, 19]
        } else {
            let s = size.toString().split(':')
            size = [+s[0], +s[s.length - 1]]
        }

        let handicap = gametree.getRootProperty(tree, 'HA', 0)
        handicap = Math.max(1, Math.min(9, Math.round(handicap)))
        if (handicap === 1) handicap = 0

        let playerNames = ['B', 'W'].map(x =>
            gametree.getRootProperty(tree, `P${x}`) || gametree.getRootProperty(tree, `${x}T`)
        )

        let playerRanks = ['BR', 'WR'].map(x => gametree.getRootProperty(tree, x))

        return {
            playerNames,
            playerRanks,
            blackName: playerNames[0],
            blackRank: playerRanks[0],
            whiteName: playerNames[1],
            whiteRank: playerRanks[1],
            gameName: gametree.getRootProperty(tree, 'GN'),
            eventName: gametree.getRootProperty(tree, 'EV'),
            date: gametree.getRootProperty(tree, 'DT'),
            result: gametree.getRootProperty(tree, 'RE'),
            komi,
            handicap,
            size
        }
    }

    setGameInfo(tree, data) {
        let newTree = tree.mutate(draft => {
            if ('size' in data) {
                // Update board size

                if (data.size) {
                    let value = data.size
                    value = value.map(x => isNaN(x) || !x ? 19 : Math.min(25, Math.max(2, x)))

                    if (value[0] === value[1]) value = value[0].toString()
                    else value = value.join(':')

                    setting.set('game.default_board_size', value)
                    draft.updateProperty(draft.root.id, 'SZ', [value])
                } else {
                    draft.removeProperty(draft.root.id, 'SZ')
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
                if (data[key] == null) continue
                let value = data[key]

                if (value && value.toString().trim() !== '') {
                    if (key === 'komi') {
                        if (isNaN(value)) value = 0

                        setting.set('game.default_komi', value)
                    } else if (key === 'handicap') {
                        let board = gametree.getBoard(tree, tree.root.id)
                        let stones = board.getHandicapPlacement(+value)

                        value = stones.length
                        setting.set('game.default_handicap', value)

                        if (value <= 1) {
                            draft.removeProperty(draft.root.id, props[key])
                            draft.removeProperty(draft.root.id, 'AB')
                            continue
                        }

                        draft.updateProperty(draft.root.id, 'AB', stones.map(sgf.stringifyVertex))
                    }

                    draft.updateProperty(draft.root.id, props[key], [value.toString()])
                } else {
                    draft.removeProperty(draft.root.id, props[key])
                }
            }
        })

        this.setCurrentTreePosition(newTree, this.state.treePosition)
    }

    getPlayer(tree, treePosition) {
        let {data} = tree.get(treePosition)

        return data.PL != null ? (data.PL[0] === 'W' ? -1 : 1)
            : data.B != null || data.HA != null && +data.HA[0] >= 1 ? -1
            : 1
    }

    setPlayer(tree, treePosition, sign) {
        let newTree = tree.mutate(draft => {
            let node = draft.get(treePosition)
            let intendedSign = node.data.B != null || node.data.HA != null
                && +node.data.HA[0] >= 1 ? -1 : +(node.data.W != null)

            if (intendedSign === sign || sign === 0) {
                draft.removeProperty(treePosition, 'PL')
            } else {
                draft.updateProperty(treePosition, 'PL', [sign > 0 ? 'B' : 'W'])
            }
        })

        this.setCurrentTreePosition(newTree, treePosition)
    }

    getComment(tree, treePosition) {
        let {data} = tree.get(treePosition)

        return {
            title: data.N != null ? data.N[0].trim() : null,
            comment: data.C != null ? data.C[0] : null,
            hotspot: data.HO != null,
            moveAnnotation: data.BM != null ? 'BM'
                : data.TE != null ? 'TE'
                : data.DO != null ? 'DO'
                : data.IT != null ? 'IT'
                : null,
            positionAnnotation: data.UC != null ? 'UC'
                : data.GW != null ? 'GW'
                : data.DM != null ? 'DM'
                : data.GB != null ? 'GB'
                : null
        }
    }

    setComment(tree, treePosition, data) {
        let newTree = tree.mutate(draft => {
            for (let [key, prop] of [['title', 'N'], ['comment', 'C']]) {
                if (key in data) {
                    if (data[key] && data[key].trim() !== '') {
                        draft.updateProperty(treePosition, prop, [data[key]])
                    } else {
                        draft.removeProperty(treePosition, prop)
                    }
                }
            }

            if ('hotspot' in data) {
                if (data.hotspot) {
                    draft.updateProperty(treePosition, 'HO', ['1'])
                } else {
                    draft.removeProperty(treePosition, 'HO')
                }
            }

            let clearProperties = properties => properties.forEach(p => draft.removeProperty(treePosition, p))

            if ('moveAnnotation' in data) {
                let moveProps = {'BM': '1', 'DO': '', 'IT': '', 'TE': '1'}
                clearProperties(Object.keys(moveProps))

                if (data.moveAnnotation != null) {
                    draft.updateProperty(treePosition, data.moveAnnotation, [
                        moveProps[data.moveAnnotation]
                    ])
                }
            }

            if ('positionAnnotation' in data) {
                let positionProps = {'UC': '1', 'GW': '1', 'GB': '1', 'DM': '1'}
                clearProperties(Object.keys(positionProps))

                if (data.positionAnnotation != null) {
                    draft.updateProperty(treePosition, data.positionAnnotation, [
                        positionProps[data.positionAnnotation]
                    ])
                }
            }
        })

        this.setCurrentTreePosition(newTree, treePosition)
    }

    rotateBoard(anticlockwise) {
        let {treePosition, gameTrees, gameIndex} = this.state
        let tree = gameTrees[gameIndex]
        let {size} = this.getGameInfo(tree)
        let newTree = rotation.rotateTree(tree, size[0], size[1], anticlockwise)

        this.setCurrentTreePosition(newTree, treePosition, {clearCache: true})
    }

    copyVariation(tree, treePosition) {
        let node = tree.get(treePosition)
        let copy = {
            id: node.id,
            data: Object.assign({}, node.data),
            parentId: null,
            children: node.children
        }

        let stripProperties = setting.get('edit.copy_variation_strip_props')

        for (let prop of stripProperties) {
            delete copy.data[prop]
        }

        this.copyVariationData = copy
    }

    cutVariation(tree, treePosition) {
        this.copyVariation(tree, treePosition)
        this.removeNode(tree, treePosition, {suppressConfirmation: true})
    }

    pasteVariation(tree, treePosition) {
        if (this.copyVariationData == null) return

        this.closeDrawer()
        this.setMode('play')

        let newPosition
        let copied = this.copyVariationData
        let newTree = tree.mutate(draft => {
            let inner = (id, children) => {
                let childIds = []

                for (let child of children) {
                    let childId = draft.appendNode(id, child.data)
                    childIds.push(childId)

                    inner(childId, child.children)
                }

                return childIds
            }

            newPosition = inner(treePosition, [copied])[0]
        })

        this.setCurrentTreePosition(newTree, newPosition)
    }

    flattenVariation(tree, treePosition) {
        this.closeDrawer()
        this.setMode('play')

        let {gameTrees} = this.state
        let gameIndex = gameTrees.findIndex(t => t.root.id === tree.root.id)
        if (gameIndex < 0) return

        let board = gametree.getBoard(tree, treePosition)
        let inherit = setting.get('edit.flatten_inherit_root_props')

        let newTree = tree.mutate(draft => {
            draft.makeRoot(treePosition)

            for (let prop of ['AB', 'AW', 'AE', 'B', 'W']) {
                draft.removeProperty(treePosition, prop)
            }

            for (let prop of inherit) {
                draft.updateProperty(treePosition, prop, tree.root.data[prop])
            }

            for (let x = 0; x < board.width; x++) {
                for (let y = 0; y < board.height; y++) {
                    let sign = board.get([x, y])
                    if (sign == 0) continue

                    draft.addToProperty(treePosition, sign > 0 ? 'AB' : 'AW', sgf.stringifyVertex([x, y]))
                }
            }
        })

        this.setState({gameTrees: gameTrees.map((t, i) => i === gameIndex ? newTree : t)})
        this.setCurrentTreePosition(newTree, newTree.root.id)
    }

    makeMainVariation(tree, treePosition) {
        this.closeDrawer()
        this.setMode('play')

        let {gameCurrents, gameTrees} = this.state
        let gameIndex = gameTrees.findIndex(t => t.root.id === tree.root.id)
        if (gameIndex < 0) return

        let newTree = tree.mutate(draft => {
            let id = treePosition

            while (id != null) {
                draft.shiftNode(id, 'main')
                id = draft.get(id).parentId
            }
        })

        gameCurrents[gameIndex] = {}
        this.setState({gameCurrents})
        this.setCurrentTreePosition(newTree, treePosition)
    }

    shiftVariation(tree, treePosition, step) {
        this.closeDrawer()
        this.setMode('play')

        let shiftNode = null
        for (let node of tree.listNodesVertically(treePosition, -1, {})) {
            let parent = tree.get(node.parentId)

            if (parent.children.length >= 2) {
                shiftNode = node
                break
            }
        }

        if (shiftNode == null) return

        let newTree = tree.mutate(draft => {
            draft.shiftNode(shiftNode.id, step >= 0 ? 'right' : 'left')
        })

        this.setCurrentTreePosition(newTree, treePosition)
    }

    removeNode(tree, treePosition, {suppressConfirmation = false} = {}) {
        let node = tree.get(treePosition)

        if (node.parentId == null) {
            dialog.showMessageBox('The root node cannot be removed.', 'warning')
            return
        }

        if (
            suppressConfirmation !== true
            && setting.get('edit.show_removenode_warning')
            && dialog.showMessageBox(
                'Do you really want to remove this node?',
                'warning',
                ['Remove Node', 'Cancel'], 1
            ) === 1
        ) return

        this.closeDrawer()
        this.setMode('play')

        // Remove node

        let newTree = tree.mutate(draft => {
            draft.removeNode(treePosition)
        })

        this.setState(({gameCurrents, gameIndex}) => {
            if (gameCurrents[gameIndex][node.parentId] === node.id)  {
                delete gameCurrents[gameIndex][node.parentId]
            }

            return {gameCurrents}
        })

        this.setCurrentTreePosition(newTree, node.parentId)
    }

    removeOtherVariations(tree, treePosition, {suppressConfirmation = false} = {}) {
        if (
            suppressConfirmation !== true
            && setting.get('edit.show_removeothervariations_warning')
            && dialog.showMessageBox(
                'Do you really want to remove all other variations?',
                'warning',
                ['Remove Variations', 'Cancel'], 1
            ) == 1
        ) return

        this.closeDrawer()
        this.setMode('play')

        let {gameCurrents, gameTrees} = this.state
        let gameIndex = gameTrees.findIndex(t => t.root.id === tree.root.id)
        if (gameIndex < 0) return

        let newTree = tree.mutate(draft => {
            // Remove all subsequent variations

            for (let node of tree.listNodesVertically(treePosition, 1, gameCurrents[gameIndex])) {
                if (node.children.length <= 1) continue

                let next = tree.navigate(node.id, 1, gameCurrents[gameIndex])

                for (let child of node.children) {
                    if (child.id === next.id) continue
                    draft.removeNode(child.id)
                }
            }

            // Remove all precedent variations

            let prevId = treePosition

            for (let node of tree.listNodesVertically(treePosition, -1, {})) {
                if (node.id !== prevId && node.children.length > 1) {
                    gameCurrents[gameIndex][node.id] = prevId

                    for (let child of node.children) {
                        if (child.id === prevId) continue
                        draft.removeNode(child.id)
                    }
                }

                prevId = node.id
            }
        })

        this.setState({gameCurrents})
        this.setCurrentTreePosition(newTree, treePosition)
    }

    // Menus

    openNodeMenu(tree, treePosition, {x, y} = {}) {
        if (this.state.mode === 'scoring') return

        let template = [
            {
                label: 'C&opy Variation',
                click: () => this.copyVariation(tree, treePosition)
            },
            {
                label: 'C&ut Variation',
                click: () => this.cutVariation(tree, treePosition)
            },
            {
                label: '&Paste Variation',
                click: () => this.pasteVariation(tree, treePosition)
            },
            {type: 'separator'},
            {
                label: 'Make &Main Variation',
                click: () => this.makeMainVariation(tree, treePosition)
            },
            {
                label: 'Shift &Left',
                click: () => this.shiftVariation(tree, treePosition, -1)
            },
            {
                label: 'Shift Ri&ght',
                click: () => this.shiftVariation(tree, treePosition, 1)
            },
            {type: 'separator'},
            {
                label: '&Flatten',
                click: () => this.flattenVariation(tree, treePosition)
            },
            {
                label: '&Remove Node',
                click: () => this.removeNode(tree, treePosition)
            },
            {
                label: 'Remove &Other Variations',
                click: () => this.removeOtherVariations(tree, treePosition)
            }
        ]

        helper.popupMenu(template, x, y)
    }

    openCommentMenu(tree, treePosition, {x, y} = {}) {
        let node = tree.get(treePosition)

        let template = [
            {
                label: '&Clear Annotations',
                click: () => {
                    this.setComment(tree, treePosition, {positionAnnotation: null, moveAnnotation: null})
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

        if (node.data.B != null || node.data.W != null) {
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

            item.checked = node.data[prop] != null
            if (item.checked) item.data[key] = null

            item.click = () => this.setComment(tree, treePosition, item.data)
        }

        helper.popupMenu(template, x, y)
    }

    openVariationMenu(sign, variation, {x, y, appendSibling = false, startNodeProperties = {}} = {}) {
        let {gameTrees, gameIndex, treePosition} = this.state
        let tree = gameTrees[gameIndex]

        helper.popupMenu([{
            label: '&Add Variation',
            click: () => {
                let isRootNode = tree.get(treePosition).parentId == null

                if (appendSibling && isRootNode) {
                    dialog.showMessageBox('The root node cannot have sibling nodes.', 'warning', ['OK'])
                    return
                }

                let [color, opponent] = sign > 0 ? ['B', 'W'] : ['W', 'B']

                let newTree = tree.mutate(draft => {
                    let parentId = !appendSibling ? treePosition : tree.get(treePosition).parentId
                    let variationData = variation.map((vertex, i) => Object.assign({
                        [i % 2 === 0 ? color : opponent]: [sgf.stringifyVertex(vertex)]
                    }, i === 0 ? startNodeProperties : {}))

                    for (let data of variationData) {
                        parentId = draft.appendNode(parentId, data)
                    }
                })

                this.setCurrentTreePosition(newTree, treePosition)
            }
        }], x, y)
    }

    // GTP Engines

    attachEngines(...engines) {
    }

    detachEngines() {
    }

    suspendEngines() {
    }

    handleCommandSent({syncer, command, subscribe, getResponse}) {
    }

    async syncEngines({passPlayer = null} = {}) {
    }

    async startAnalysis({showWarning = true} = {}) {
    }

    stopAnalysis() {
    }

    async generateMove({passPlayer = null, firstMove = true, followUp = false} = {}) {
    }

    stopGeneratingMoves() {
    }

    // Render

    render(_, state) {
        // Calculate some inferred values

        let {gameTrees, gameIndex, treePosition} = state
        let tree = gameTrees[gameIndex]
        let scoreBoard, areaMap

        if (['scoring', 'estimator'].includes(state.mode)) {
            // Calculate area map

            scoreBoard = gametree.getBoard(tree, state.treePosition).clone()

            for (let vertex of state.deadStones) {
                let sign = scoreBoard.get(vertex)
                if (sign === 0) continue

                scoreBoard.captures[sign > 0 ? 1 : 0]++
                scoreBoard.set(vertex, 0)
            }

            areaMap = state.mode === 'estimator'
                ? influence.map(scoreBoard.arrangement, {discrete: true})
                : influence.areaMap(scoreBoard.arrangement)
        }

        this.inferredState = {
            gameTree: tree,
            showSidebar: state.showGameGraph || state.showCommentBox,
            showLeftSidebar: state.showConsole,
            gameInfo: this.getGameInfo(tree),
            currentPlayer: this.getPlayer(tree, treePosition),
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

            h(ThemeManager),
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

            h(BusyScreen, {show: state.busy > 0}),
            h(InfoOverlay, {text: state.infoOverlayText, show: state.showInfoOverlay})
        )
    }
}

// Render

render(h(App), document.body)
