const fs = require('fs')
const EventEmitter = require('events')
const {extname} = require('path')
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

const i18n = require('../i18n')
const Board = require('../modules/board')
const EngineSyncer = require('../modules/enginesyncer')
const dialog = require('../modules/dialog')
const fileformats = require('../modules/fileformats')
const gametree = require('../modules/gametree')
const gtplogger = require('../modules/gtplogger')
const helper = require('../modules/helper')
const treetransformer = require('../modules/treetransformer')
const setting = remote.require('./setting')
const sound = require('../modules/sound')

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
            gametree, helper, i18n, setting, sound}

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

            this.buildMenu()
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

        // Handle main menu items

        let menuData = require('../menu').clone()

        let handleMenuClicks = menu => {
            for (let item of menu) {
                if ('click' in item) {
                    ipcRenderer.on(`menu-click-${item.id}`, () => {
                        if (!this.state.showMenuBar) this.window.setMenuBarVisibility(false)
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
            this.loadFile(evt.dataTransfer.files[0].path)
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

                evt.preventDefault()

                let step = evt.key.toLowerCase() === 'z' ? -1 : 1
                if (evt.shiftKey) step = -step

                let action = step < 0 ? 'undo' : 'redo'

                if (action != null) {
                    if (helper.isTextLikeElement(document.activeElement)) {
                        this.window.webContents[action]()
                    } else {
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

        // Handle window closing

        window.addEventListener('beforeunload', evt => {
            if (this.closeWindow) return

            evt.returnValue = ' '

            setTimeout(() => {
                if (this.askForSave()) {
                    this.detachEngines()
                    gtplogger.close()
                    this.closeWindow = true
                    this.window.close()
                }
            })
        })

        this.newFile()
    }

    componentDidUpdate(_, prevState = {}) {
        // Update title

        let {basename} = require('path')
        let title = this.appName
        let {representedFilename, gameIndex, gameTrees} = this.state
        let t = i18n.context('app')

        if (representedFilename)
            title = basename(representedFilename)
        if (gameTrees.length > 1)
            title += ' — ' + t(p => `Game ${p.gameNumber}`, {
                gameNumber: gameIndex + 1
            })
        if (representedFilename && process.platform != 'darwin')
            title += ' — ' + this.appName

        if (document.title !== title)
            document.title = title

        // Handle full screen & menu bar

        if (prevState.fullScreen !== this.state.fullScreen) {
            if (this.state.fullScreen) this.flashInfoOverlay(t('Press Esc to exit full screen mode'))
            this.window.setFullScreen(this.state.fullScreen)
        }

        if (prevState.showMenuBar !== this.state.showMenuBar) {
            if (!this.state.showMenuBar) this.flashInfoOverlay(t('Press Alt to show menu bar'))
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
            this.buildMenu()
            this.setState({[data[key]]: setting.get(key)})
        }
    }

    waitForRender() {
        return new Promise(resolve => this.setState({}, resolve))
    }

    // User Interface

    buildMenu(rebuild = false) {
        if (rebuild) remote.require('./menu').buildMenu()
        ipcRenderer.send('build-menu', this.state.busy > 0)
    }

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
        if (!suppressAskForSave && !this.askForSave()) return

        let emptyTree = this.getEmptyGameTree()

        await this.loadGameTrees([emptyTree], {suppressAskForSave: true})

        if (showInfo) this.openDrawer('info')
        if (playSound) sound.playNewGame()
    }

    async loadFile(filename = null, {suppressAskForSave = false, clearHistory = true} = {}) {
        if (!suppressAskForSave && !this.askForSave()) return

        let t = i18n.context('app.file')

        if (!filename) {
            dialog.showOpenDialog({
                properties: ['openFile'],
                filters: [
                    ...fileformats.meta,
                    {name: t('All Files'), extensions: ['*']}
                ]
            }, ({result}) => {
                if (result) filename = result[0]
                if (filename) this.loadFile(filename, {suppressAskForSave: true, clearHistory})
            })

            return
        }

        this.setBusy(true)

        let {extname} = require('path')
        let extension = extname(filename).slice(1)

        let gameTrees = []
        let success = true
        let lastProgress = -1

        try {
            let fileFormatModule = fileformats.getModuleByExtension(extension)

            gameTrees = fileFormatModule.parseFile(filename, evt => {
                if (evt.progress - lastProgress < 0.1) return
                this.window.setProgressBar(evt.progress)
                lastProgress = evt.progress
            })

            if (gameTrees.length == 0) throw true
        } catch (err) {
            dialog.showMessageBox(t('This file is unreadable.'), 'warning')
            success = false
        }

        if (success) {
            await this.loadGameTrees(gameTrees, {suppressAskForSave: true, clearHistory})

            this.setState({representedFilename: filename})
            this.fileHash = this.generateFileHash()

            if (setting.get('game.goto_end_after_loading')) {
                this.goToEnd()
            }
        }

        this.setBusy(false)
    }

    async loadContent(content, extension, options = {}) {
        this.setBusy(true)

        let t = i18n.context('app.file')
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
            dialog.showMessageBox(t('This file is unreadable.'), 'warning')
            success = false
        }

        if (success) {
            await this.loadGameTrees(gameTrees, options)
        }

        this.setBusy(false)
    }

    async loadGameTrees(gameTrees, {suppressAskForSave = false, clearHistory = true} = {}) {
        gtplogger.rotate()

        if (!suppressAskForSave && !this.askForSave()) return

        this.setBusy(true)
        if (this.state.openDrawer !== 'gamechooser') this.closeDrawer()
        this.setMode('play')

        await helper.wait(setting.get('app.loadgame_delay'))

        if (gameTrees.length > 0) {
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

            if (clearHistory) this.clearHistory()
        }

        this.setBusy(false)
        this.window.setProgressBar(-1)
        this.events.emit('fileLoad')

        if (gameTrees.length > 1) {
            await helper.wait(setting.get('gamechooser.show_delay'))
            this.openDrawer('gamechooser')
        }
    }

    saveFile(filename = null, confirmExtension = true) {
        let t = i18n.context('app.file')

        if (!filename || confirmExtension && extname(filename) !== '.sgf') {
            let cancel = false

            dialog.showSaveDialog({
                filters: [
                    fileformats.sgf.meta,
                    {name: t('All Files'), extensions: ['*']}
                ]
            }, ({result}) => {
                if (result) this.saveFile(result, false)
                cancel = !result
            })

            return !cancel
        }

        this.setBusy(true)
        fs.writeFileSync(filename, this.getSGF())

        this.setBusy(false)
        this.setState({representedFilename: filename})

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

        return sgf.stringify(gameTrees.map(tree => tree.root), {
            linebreak: setting.get('sgf.format_code') ? helper.linebreak : ''
        })
    }

    generateTreeHash() {
        return this.state.gameTrees.map(tree => gametree.getHash(tree)).join('-')
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
        let t = i18n.context('app.file')
        let hash = this.generateTreeHash()

        if (hash !== this.treeHash) {
            let answer = dialog.showMessageBox(
                t('Your changes will be lost if you close this file without saving.'),
                'warning',
                [t('Save'), t('Don’t Save'), t('Cancel')], 2
            )

            if (answer === 0) return this.saveFile(this.state.representedFilename)
            else if (answer === 2) return false
        }

        return true
    }

    askForReload() {
        let t = i18n.context('app.file')
        let hash = this.generateFileHash()

        if (hash != null && hash !== this.fileHash) {
            let answer = dialog.showMessageBox(
                t(p => [
                    `This file has been changed outside of ${p.appName}.`,
                    'Do you want to reload the file? Your changes will be lost.'
                ].join('\n'), {appName: this.appName}),
                'warning', [t('Reload'), t('Don’t Reload')], 1
            )

            if (answer === 0) {
                this.loadFile(this.state.representedFilename, {
                    suppressAskForSave: true,
                    clearHistory: false
                })
            } else {
                this.treeHash = null
            }

            this.fileHash = hash
        }
    }

    // Playing

    clickVertex(vertex, {button = 0, ctrlKey = false, x = 0, y = 0} = {}) {
        this.closeDrawer()

        let t = i18n.context('app.play')
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

                    let click = () => dialog.showInputBox(t('Enter label text'), ({value}) => {
                        this.useTool('label', vertex, value)
                    })

                    let template = [{label: t('&Edit Label'), click}]
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

        let t = i18n.context('app.play')
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
                    t([
                        'You are about to play a move which repeats a previous board position.',
                        'This is invalid in some rulesets.'
                    ].join('\n')),
                    'info',
                    [t('Play Anyway'), t('Don’t Play')], 1
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
                    t([
                        'You are about to play a suicide move.',
                        'This is invalid in some rulesets.'
                    ].join('\n')),
                    'info',
                    [t('Play Anyway'), t('Don’t Play')], 1
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

        this.closeDrawer()
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
            gameComment: gametree.getRootProperty(tree, 'GC'),
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
        })

        newTree = newTree.mutate(draft => {
            let props = {
                blackName: 'PB',
                blackRank: 'BR',
                whiteName: 'PW',
                whiteRank: 'WR',
                gameName: 'GN',
                eventName: 'EV',
                gameComment: 'GC',
                date: 'DT',
                result: 'RE',
                komi: 'KM',
                handicap: 'HA'
            }

            for (let key in props) {
                if (!(key in data)) continue
                let value = data[key]

                if (value && value.toString() !== '') {
                    if (key === 'komi') {
                        if (isNaN(value)) value = 0

                        setting.set('game.default_komi', value)
                    } else if (key === 'handicap') {
                        let board = gametree.getBoard(newTree, newTree.root.id)
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
                    if (data[key] && data[key] !== '') {
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
        let newTree = treetransformer.rotateTree(tree, size[0], size[1], anticlockwise)

        this.setCurrentTreePosition(newTree, treePosition, {clearCache: true})
    }

    flipBoard(horizontal) {
        let {treePosition, gameTrees, gameIndex} = this.state
        let tree = gameTrees[gameIndex]
        let {size} = this.getGameInfo(tree)
        let newTree = treetransformer.flipTree(tree, size[0], size[1], horizontal)

        this.setCurrentTreePosition(newTree, treePosition, {clearCache: true})
    }

    invertColors() {
        let {treePosition, gameTrees, gameIndex} = this.state
        let tree = gameTrees[gameIndex]
        let newTree = treetransformer.invertTreeColors(tree)

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
        let playerSign = this.getPlayer(tree, treePosition)
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
        this.setPlayer(newTree, treePosition, playerSign)
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
        let t = i18n.context('app.node')
        let node = tree.get(treePosition)

        if (node.parentId == null) {
            dialog.showMessageBox(t('The root node cannot be removed.'), 'warning')
            return
        }

        if (
            suppressConfirmation !== true
            && setting.get('edit.show_removenode_warning')
            && dialog.showMessageBox(
                t('Do you really want to remove this node?'),
                'warning',
                [t('Remove Node'), t('Cancel')], 1
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
        let t = i18n.context('app.node')

        if (
            suppressConfirmation !== true
            && setting.get('edit.show_removeothervariations_warning')
            && dialog.showMessageBox(
                t('Do you really want to remove all other variations?'),
                'warning',
                [t('Remove Variations'), t('Cancel')], 1
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

        let t = i18n.context('menu.edit')
        let template = [
            {
                label: t('&Copy Variation'),
                click: () => this.copyVariation(tree, treePosition)
            },
            {
                label: t('Cu&t Variation'),
                click: () => this.cutVariation(tree, treePosition)
            },
            {
                label: t('&Paste Variation'),
                click: () => this.pasteVariation(tree, treePosition)
            },
            {type: 'separator'},
            {
                label: t('Make Main &Variation'),
                click: () => this.makeMainVariation(tree, treePosition)
            },
            {
                label: t('Shift &Left'),
                click: () => this.shiftVariation(tree, treePosition, -1)
            },
            {
                label: t('Shift Ri&ght'),
                click: () => this.shiftVariation(tree, treePosition, 1)
            },
            {type: 'separator'},
            {
                label: t('&Flatten'),
                click: () => this.flattenVariation(tree, treePosition)
            },
            {
                label: t('&Remove Node'),
                click: () => this.removeNode(tree, treePosition)
            },
            {
                label: t('Remove &Other Variations'),
                click: () => this.removeOtherVariations(tree, treePosition)
            }
        ]

        helper.popupMenu(template, x, y)
    }

    openCommentMenu(tree, treePosition, {x, y} = {}) {
        let t = i18n.context('menu.comment')
        let node = tree.get(treePosition)

        let template = [
            {
                label: t('&Clear Annotations'),
                click: () => {
                    this.setComment(tree, treePosition, {positionAnnotation: null, moveAnnotation: null})
                }
            },
            {type: 'separator'},
            {
                label: t('Good for &Black'),
                type: 'checkbox',
                data: {positionAnnotation: 'GB'}
            },
            {
                label: t('&Unclear Position'),
                type: 'checkbox',
                data: {positionAnnotation: 'UC'}
            },
            {
                label: t('&Even Position'),
                type: 'checkbox',
                data: {positionAnnotation: 'DM'}
            },
            {
                label: t('Good for &White'),
                type: 'checkbox',
                data: {positionAnnotation: 'GW'}
            }
        ]

        if (node.data.B != null || node.data.W != null) {
            template.push(
                {type: 'separator'},
                {
                    label: t('&Good Move'),
                    type: 'checkbox',
                    data: {moveAnnotation: 'TE'}
                },
                {
                    label: t('&Interesting Move'),
                    type: 'checkbox',
                    data: {moveAnnotation: 'IT'}
                },
                {
                    label: t('&Doubtful Move'),
                    type: 'checkbox',
                    data: {moveAnnotation: 'DO'}
                },
                {
                    label: t('B&ad Move'),
                    type: 'checkbox',
                    data: {moveAnnotation: 'BM'}
                }
            )
        }

        template.push(
            {type: 'separator'},
            {
                label: t('&Hotspot'),
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
        let t = i18n.context('menu.variation')
        let {gameTrees, gameIndex, treePosition} = this.state
        let tree = gameTrees[gameIndex]

        helper.popupMenu([{
            label: t('&Add Variation'),
            click: () => {
                let isRootNode = tree.get(treePosition).parentId == null

                if (appendSibling && isRootNode) {
                    dialog.showMessageBox(t('The root node cannot have sibling nodes.'), 'warning')
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
        let {attachedEngines} = this.state

        if (helper.vertexEquals([...engines].reverse(), attachedEngines)) {
            // Just swap engines

            this.attachedEngineSyncers.reverse()

            this.setState(({engineBusy, engineCommands}) => ({
                engineCommands: engineCommands.reverse(),
                engineBusy: engineBusy.reverse(),
                attachedEngines: engines
            }))

            return
        }

        if (engines != null && engines.some(x => x != null)) {
            // Only load the logger when actually attaching engines (not detaching):
            // This is necessary since loadGameTrees() rotates to a new log, and
            // we need to wait for the previous engines to finish logging

            gtplogger.updatePath()
        }

        let quitTimeout = setting.get('gtp.engine_quit_timeout')

        for (let i = 0; i < attachedEngines.length; i++) {
            if (attachedEngines[i] === engines[i]) continue

            if (this.attachedEngineSyncers[i]) {
                this.attachedEngineSyncers[i].controller.stop(quitTimeout)
            }

            try {
                let engine = engines[i]
                let syncer = new EngineSyncer(engine)
                this.attachedEngineSyncers[i] = syncer

                syncer.on('busy-changed', () => {
                    this.setState(({engineBusy}) => {
                        let j = this.attachedEngineSyncers.indexOf(syncer)
                        engineBusy[j] = syncer.busy

                        return {engineBusy}
                    })
                })

                syncer.controller.on('command-sent', evt => {
                    gtplogger.write({
                        type: 'stdin',
                        message: gtp.Command.toString(evt.command),
                        sign: this.attachedEngineSyncers.indexOf(syncer) === 0 ? 1 : -1,
                        engine: engine.name
                    })

                    if (evt.command.name === 'list_commands') {
                        evt.getResponse().then(response =>
                            this.setState(({engineCommands}) => {
                                let j = this.attachedEngineSyncers.indexOf(syncer)
                                engineCommands[j] = response.content.split('\n')

                                return {engineCommands}
                            })
                        ).catch(helper.noop)
                    }

                    this.handleCommandSent(Object.assign({syncer}, evt))
                })

                syncer.controller.on('stderr', ({content}) => {
                    gtplogger.write({
                        type: 'stderr',
                        message: content,
                        sign: this.attachedEngineSyncers.indexOf(syncer) === 0 ? 1 : -1,
                        engine: engine.name
                    })

                    this.setState(({consoleLog}) => ({
                        consoleLog: [...consoleLog, {
                            sign: this.attachedEngineSyncers.indexOf(syncer) === 0 ? 1 : -1,
                            name: engine.name,
                            command: null,
                            response: {content, internal: true}
                        }]
                    }))
                })

                syncer.controller.on('started', () => {
                    gtplogger.write({
                        type: 'meta',
                        message: 'Engine Started',
                        sign: this.attachedEngineSyncers.indexOf(syncer) === 0 ? 1 : -1,
                        engine: engine.name
                    })
                })

                syncer.controller.on('stopped', () => this.setState(({engineCommands}) => {
                    gtplogger.write({
                        type: 'meta',
                        message: 'Engine Stopped',
                        sign: this.attachedEngineSyncers.indexOf(syncer) === 0 ? 1 : -1,
                        engine: engine.name
                    })

                    let j = this.attachedEngineSyncers.indexOf(syncer)
                    engineCommands[j] = []

                    return {engineCommands}
                }))

                syncer.controller.start()
            } catch (err) {
                this.attachedEngineSyncers[i] = null
                engines[i] = null
            }
        }

        this.setState({attachedEngines: engines})
    }

    detachEngines() {
        this.attachEngines(null, null)
    }

    suspendEngines() {
        for (let syncer of this.attachedEngineSyncers) {
            if (syncer != null) {
                gtplogger.write({
                    type: 'meta',
                    message: 'Engine Suspending',
                    sign: this.attachedEngineSyncers.indexOf(syncer) === 0 ? 1 : -1,
                    engine: syncer.engine.name
                })

                syncer.controller.kill()
            }
        }

        this.stopGeneratingMoves()
        this.hideInfoOverlay()
        this.setBusy(false)
    }

    handleCommandSent({syncer, command, subscribe, getResponse}) {
        let sign = 1 - this.attachedEngineSyncers.indexOf(syncer) * 2
        if (sign > 1) sign = 0

        let t = i18n.context('app.engine')
        let {treePosition} = this.state
        let entry = {sign, name: syncer.engine.name, command, waiting: true}
        let maxLength = setting.get('console.max_history_count')

        this.setState(({consoleLog}) => {
            let newLog = consoleLog.slice(Math.max(consoleLog.length - maxLength + 1, 0))
            newLog.push(entry)

            return {consoleLog: newLog}
        })

        let updateEntry = update => {
            Object.assign(entry, update)
            this.setState(({consoleLog}) => ({consoleLog}))
        }

        subscribe(({line, response, end}) => {
            updateEntry({
                response: Object.assign({}, response),
                waiting: !end
            })

            gtplogger.write({
                type: 'stdout',
                message: line,
                sign: this.attachedEngineSyncers.indexOf(syncer) === 0 ? 1 : -1,
                engine: syncer.engine.name
            })

            // Parse analysis info

            if (line.slice(0, 5) === 'info ' && this.state.treePosition === treePosition) {
                let tree = this.state.gameTrees[this.state.gameIndex]
                let sign = this.getPlayer(tree, treePosition)
                let board = gametree.getBoard(tree, treePosition)
                let analysis = line
                    .split(/\s*info\s+/).slice(1)
                    .map(x => x.trim())
                    .map(x => {
                        let matchPV = x.match(/(pass|[A-Za-z]\d+)(\s+(pass|[A-Za-z]\d+))*\s*$/)
                        if (matchPV == null)
                            return null
                        let matchPass = matchPV[0].match(/pass/)
                        if (matchPass == null) {
                            return [x.slice(0, matchPV.index), matchPV[0].split(/\s+/)]
                        } else {
                            return [x.slice(0, matchPV.index), matchPV[0].slice(0, matchPass.index).split(/\s+/)]
                        }
                    })
                    .filter(x => x != null)
                    .map(([x, y]) => [
                        x.trim().split(/\s+/).slice(0, -1),
                        y.filter(x => x.length >= 2)
                    ])
                    .map(([tokens, pv]) => {
                        let keys = tokens.filter((_, i) => i % 2 === 0)
                        let values = tokens.filter((_, i) => i % 2 === 1)

                        keys.push('pv')
                        values.push(pv)

                        return keys.reduce((acc, x, i) => (acc[x] = values[i], acc), {})
                    })
                    .filter(({move}) => move.match(/^[A-Za-z]\d+$/))
                    .map(({move, visits, winrate, pv}) => ({
                        sign,
                        vertex: board.coord2vertex(move),
                        visits: +visits,
                        win: +winrate / 100,
                        variation: pv.map(x => board.coord2vertex(x))
                    }))

                let winrate = Math.max(...analysis.map(({win}) => win))
                if (sign < 0) winrate = 100 - winrate

                let newTree = tree.mutate(draft => {
                    draft.updateProperty(treePosition, 'SBKV', [(Math.round(winrate * 100) / 100).toString()])
                })

                this.setState({analysis})
                this.setCurrentTreePosition(newTree, treePosition)
            }
        })

        getResponse()
        .catch(_ => {
            gtplogger.write({
                type: 'meta',
                message: 'Connection Failed',
                sign: this.attachedEngineSyncers.indexOf(syncer) === 0 ? 1 : -1,
                engine: syncer.engine.name
            })

            updateEntry({
                response: {internal: true, content: t('connection failed')},
                waiting: false
            })
        })
    }

    async syncEngines() {
        if (this.attachedEngineSyncers.every(x => x == null)) return

        if (this.engineBusySyncing) return
        this.engineBusySyncing = true

        try {
            while (true) {
                let {gameTrees, gameIndex, treePosition} = this.state
                let tree = gameTrees[gameIndex]

                await Promise.all(this.attachedEngineSyncers.map(syncer => {
                    if (syncer == null) return
                    return syncer.sync(tree, treePosition)
                }))

                if (treePosition === this.state.treePosition) break
            }
        } catch (err) {
            this.engineBusySyncing = false
            throw err
        }

        this.engineBusySyncing = false
    }

    async startAnalysis({showWarning = true} = {}) {
        if (
            this.state.analysisTreePosition != null
            && this.state.treePosition === this.state.analysisTreePosition
        ) return

        this.setState({analysis: null, analysisTreePosition: this.state.treePosition})

        if (this.state.generatingMoves) return

        let t = i18n.context('app.engine')
        let error = false
        let {currentPlayer} = this.inferredState
        let color = currentPlayer > 0 ? 'B' : 'W'
        let controllerIndices = currentPlayer > 0 ? [0, 1] : [1, 0]

        try {
            await this.syncEngines()

            let engineIndex = controllerIndices.find(i =>
                this.attachedEngineSyncers[i] != null
                && (
                    this.attachedEngineSyncers[i].commands.includes('lz-analyze')
                    || this.attachedEngineSyncers[i].commands.includes('analyze')
                )
            )

            if (engineIndex != null) {
                let {controller, commands} = this.attachedEngineSyncers[engineIndex]
                let name = commands.includes('analyze') ? 'analyze' : 'lz-analyze'

                let interval = setting.get('board.analysis_interval').toString()
                let response = await controller.sendCommand({name, args: [color, interval]})

                error = response.error
            } else {
                error = true
            }
        } catch (err) {
            error = true
        }

        if (showWarning && error) {
            dialog.showMessageBox(t('You haven’t attached any engines that supports analysis.'), 'warning')
            this.stopAnalysis()
        }
    }

    stopAnalysis({removeAnalysisData = true} = {}) {
        if (this.state.analysisTreePosition == null) return

        for (let syncer of this.attachedEngineSyncers) {
            if (syncer == null || syncer.controller.process == null) continue

            syncer.controller.process.stdin.write('\n')

            gtplogger.write({
                type: 'meta',
                message: 'Stopping Analysis',
                sign: this.attachedEngineSyncers.indexOf(syncer) === 0 ? 1 : -1,
                engine: syncer.engine.name
            })
        }

        if (removeAnalysisData) this.setState({analysisTreePosition: null, analysis: null})
    }

    async generateMove({firstMove = true, followUp = false} = {}) {
        this.closeDrawer()

        if (!firstMove && !this.state.generatingMoves) {
            this.hideInfoOverlay()
            return
        } else if (firstMove) {
            this.setState({generatingMoves: true})
        }

        let t = i18n.context('app.engine')
        let {gameTrees, gameIndex} = this.state
        let {currentPlayer} = this.inferredState
        let tree = gameTrees[gameIndex]
        let [color, opponent] = currentPlayer > 0 ? ['B', 'W'] : ['W', 'B']
        let [playerIndex, otherIndex] = currentPlayer > 0 ? [0, 1] : [1, 0]
        let playerSyncer = this.attachedEngineSyncers[playerIndex]
        let otherSyncer = this.attachedEngineSyncers[otherIndex]

        if (playerSyncer == null) {
            if (otherSyncer != null) {
                // Switch engines, so the attached engine can play

                let engines = [...this.state.attachedEngines].reverse()
                this.attachEngines(...engines)
                ;[playerSyncer, otherSyncer] = [otherSyncer, playerSyncer]
            } else {
                return
            }
        }

        this.setBusy(true)

        try {
            await this.syncEngines()
        } catch (err) {
            this.stopGeneratingMoves()
            this.hideInfoOverlay()
            this.setBusy(false)

            return
        }

        if (firstMove && followUp && otherSyncer != null) {
            this.flashInfoOverlay(t('Press Esc to stop playing'))
        }

        let {commands} = this.attachedEngineSyncers[playerIndex]
        let commandName = ['genmove_analyze', 'lz-genmove_analyze', 'genmove'].find(x => commands.includes(x))
        if (commandName == null) commandName = 'genmove'

        let responseContent = await (
            commandName === 'genmove'
            ? playerSyncer.controller.sendCommand({name: commandName, args: [color]})
                .then(res => res.content)
            : new Promise((resolve, reject) => {
                let interval = setting.get('board.analysis_interval').toString()

                playerSyncer.controller.sendCommand(
                    {name: commandName, args: [color, interval]},
                    ({line}) => {
                        if (line.indexOf('play ') !== 0) return
                        resolve(line.slice('play '.length).trim())
                    }
                )
                .then(() => resolve(null))
                .catch(reject)
            })
        ).catch(() => null)

        let sign = color === 'B' ? 1 : -1
        let pass = true
        let vertex = [-1, -1]
        let board = gametree.getBoard(tree, tree.root.id)

        if (responseContent == null) {
            this.stopGeneratingMoves()
            this.hideInfoOverlay()
            this.setBusy(false)

            return
        } else if (responseContent.toLowerCase() !== 'pass') {
            pass = false

            if (responseContent.toLowerCase() === 'resign') {
                dialog.showMessageBox(t(p => `${p.engineName} has resigned.`, {
                    engineName: playerSyncer.engine.name
                }))

                this.stopGeneratingMoves()
                this.hideInfoOverlay()
                this.makeResign()
                this.setBusy(false)

                return
            }

            vertex = board.coord2vertex(responseContent)
        }

        let previousNode = tree.get(this.state.treePosition)
        let previousPass = previousNode != null && ['W', 'B'].some(color =>
            previousNode.data[color] != null
            && !board.hasVertex(sgf.parseVertex(previousNode.data[color][0]))
        )
        let doublePass = previousPass && pass

        this.makeMove(vertex, {player: sign})

        if (followUp && otherSyncer != null && !doublePass) {
            await helper.wait(setting.get('gtp.move_delay'))
            this.generateMove({passPlayer: pass ? sign : null, firstMove: false, followUp})
        } else {
            this.stopGeneratingMoves()
            this.hideInfoOverlay()
        }

        this.setBusy(false)
    }

    stopGeneratingMoves() {
        if (!this.state.generatingMoves) return

        let t = i18n.context('app.engine')

        this.showInfoOverlay(t('Please wait…'))
        this.setState({generatingMoves: false})
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
