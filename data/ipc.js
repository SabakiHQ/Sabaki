const {ipcRenderer, shell, clipboard} = require('electron')

const dialog = require('../modules/dialog')
const gametree = require('../modules/gametree')
const setting = require('../modules/setting')

let toggleSetting = key => setting.set(key, !setting.get(ey))

let menudata = {
    newFile: () => sabaki.newFile({playSound: true, showInfo: true}),
    newWindow: () => ipcRenderer.send('new-window'),
    loadFile: () => sabaki.loadFile(),
    saveFile: () => sabaki.saveFile(sabaki.state.representedFilename),
    saveAs: () => sabaki.saveFile(),
    loadClipboard: () => sabaki.loadContent(clipboard.readText(), 'sgf', {ignoreEncoding: true}),
    copyToClipboard: () => clipboard.writeText(sabaki.getSGF()),
    copyAscii: () => clipboard.writeText(gametree.getBoard(...sabaki.state.treePosition).generateAscii()),
    gameInfo: () => sabaki.openDrawer('info'),
    manageGames: () => sabaki.openDrawer('gamechooser'),
    preferences: () => sabaki.openDrawer('preferences'),

    selectPosition: () => dialog.showInputBox('Enter a coordinate to select a point', sabaki.clickVertex),
    pass: () => sabaki.makeMove([-1, -1]),
    resign: () => sabaki.makeResign(),
    togglePlayer: () => sabaki.setPlayer(...sabaki.state.treePosition, -sabaki.getPlayer(...sabaki.state.treePosition)),
    score: () => sabaki.setMode('scoring'),
    estimate: () => sabaki.setMode('estimator'),

    editMode: () => sabaki.setMode(sabaki.state.mode === 'edit' ? 'play' : 'edit'),
    cleanMarkup: () => sabaki.openDrawer('cleanmarkup'),
    stoneTool: () => (sabaki.setMode('edit'), sabaki.setState({selectedTool: 'stone_1'})),
    crossTool: () => (sabaki.setMode('edit'), sabaki.setState({selectedTool: 'cross'})),
    triangleTool: () => (sabaki.setMode('edit'), sabaki.setState({selectedTool: 'triangle'})),
    squareTool: () => (sabaki.setMode('edit'), sabaki.setState({selectedTool: 'square'})),
    circleTool: () => (sabaki.setMode('edit'), sabaki.setState({selectedTool: 'circle'})),
    lineTool: () => (sabaki.setMode('edit'), sabaki.setState({selectedTool: 'line'})),
    arrowTool: () => (sabaki.setMode('edit'), sabaki.setState({selectedTool: 'arrow'})),
    labelTool: () => (sabaki.setMode('edit'), sabaki.setState({selectedTool: 'label'})),
    numberTool: () => (sabaki.setMode('edit'), sabaki.setState({selectedTool: 'number'})),
    copyVariation: () => sabaki.copyVariation(...sabaki.state.treePosition),
    cutVariation: () => sabaki.cutVariation(...sabaki.state.treePosition),
    pasteVariation: () => sabaki.pasteVariation(...sabaki.state.treePosition),
    makemainVariation: () => sabaki.makeMainVariation(...sabaki.state.treePosition),
    shiftLeft: () => sabaki.shiftVariation(...sabaki.state.treePosition, -1),
    shiftRight: () => sabaki.shiftVariation(...sabaki.state.treePosition, 1),
    flatten: () => sabaki.flattenVariation(...sabaki.state.treePosition),
    removeNode: () => sabaki.removeNode(...sabaki.state.treePosition),
    removeOtherVariations: () => sabaki.removeOtherVariations(...sabaki.state.treePosition),

    findMode: () => sabaki.setMode(sabaki.state.mode === 'find' ? 'play' : 'find'),
    findNext: () => (sabaki.setMode('find'), sabaki.findMove(1, {
        vertex: sabaki.state.findVertex,
        text: sabaki.state.findText
    })),
    findPrevious: () => (sabaki.setMode('find'), sabaki.findMove(-1, {
        vertex: sabaki.state.findVertex,
        text: sabaki.state.findText
    })),
    toggleHotspot: () => sabaki.setComment(...sabaki.state.treePosition, {
        hotspot: !('HO' in sabaki.state.treePosition[0].nodes[sabaki.state.treePosition[1]])
    }),
    nextHotspot: () => sabaki.findHotspot(1),
    previousHotspot: () => sabaki.findHotspot(-1),

    goBack: () => sabaki.goStep(-1),
    goForward: () => sabaki.goStep(1),
    goToPreviousFork: () => sabaki.goToPreviousFork(),
    goToNextFork: () => sabaki.goToNextFork(),
    nextComment: () => sabaki.goToComment(1),
    previousComment: () => sabaki.goToComment(-1),
    goToBeginning: () => sabaki.goToBeginning(),
    goToEnd: () => sabaki.goToEnd(),
    goToNextVariation: () => sabaki.goToSiblingVariation(1),
    goToPreviousVariation: () => sabaki.goToSiblingVariation(-1),
    goToMainVariation: () => sabaki.goToMainVariation(),
    goToMoveNumber: () => dialog.showInputBox('Enter a move number to go to', ({value}) => {
        sabaki.closeDrawers()
        sabaki.goToMoveNumber(value)
    }),

    manageEngines: () => (sabaki.setState({preferencesTab: 'engines'}), sabaki.openDrawer('preferences')),
    detachEngine: () => null,
    generateMove: () => null,
    gtpConsole: () => null,
    clearConsole: () => null,

    toggleGuessMode: () => sabaki.setMode(sabaki.state.mode === 'guess' ? 'play' : 'guess'),
    toggleAutoplayMode: () => sabaki.setMode(sabaki.state.mode === 'autoplay' ? 'play' : 'autoplay'),
    toggleCoordinates: () => toggleSetting('view.show_coordinates'),
    toggleShowNextMoves: () => toggleSetting('view.show_next_moves'),
    toggleShowSiblings: () => toggleSetting('view.show_siblings'),
    toggleShowMoveColorization: () => toggleSetting('view.show_move_colorization'),
    toggleGameGraph: () => toggleSetting('view.show_graph'),
    toggleComments: () => toggleSetting('view.show_comments'),
    toggleFullScreen: () => sabaki.setState(({fullScreen}) => ({fullScreen: !fullScreen})),

    checkForUpdates: () => ipcRenderer.send('check-for-updates', true),
    github: () => shell.openExternal(`https://github.com/yishn/${sabaki.appName}`),
    reportIssue: () => shell.openExternal(`https://github.com/yishn/${sabaki.appName}/issues`)
}

ipcRenderer.on('menu-click', (evt, action) => {
    dialog.closeInputBox()
    menudata[action]()
})

ipcRenderer.on('load-file', (evt, ...args) => {
    setTimeout(() => sabaki.loadFile(...args), setting.get('app.loadgame_delay'))
})

ipcRenderer.on('window-focus', () => {
    if (setting.get('file.show_reload_warning')) {
        sabaki.askForReload()
    }
})
