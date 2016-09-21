const {ipcRenderer, clipboard, shell} = require('electron')
const view = require('./view')
const setting = require('../modules/setting')

let menudata = {
    newfile: () => newFile(true),
    newwindow: () => ipcRenderer.send('new-window'),
    loadfile: () => loadFile(),
    savefile: () => saveFile(view.getRepresentedFilename()),
    saveas: () => saveFile(),
    loadclipboard: () => loadFileFromSgf(clipboard.readText(), false, () => view.setRepresentedFilename(null)),
    copytoclipboard: () => clipboard.writeText(saveFileToSgf()),
    copyascii: () => clipboard.writeText(getBoard().generateAscii()),
    managegames: () => view.showGameChooser(),
    score: () => view.setScoringMode(true),
    estimate: () => view.setEstimatorMode(true),
    gameinfo: () => view.showGameInfo(),
    preferences: () => view.showPreferences(),

    editmode: () => view.setEditMode(!view.getEditMode()),
    clearmarkup: () => clearMarkup(),
    stonetool: () => setSelectedTool('stone'),
    crosstool: () => setSelectedTool('cross'),
    triangletool: () => setSelectedTool('triangle'),
    squaretool: () => setSelectedTool('square'),
    circletool: () => setSelectedTool('circle'),
    linetool: () => setSelectedTool('line'),
    labeltool: () => setSelectedTool('label'),
    numbertool: () => setSelectedTool('number'),
    pass: () => makeMove([-1, -1]),
    resign: () => makeResign(),
    removenode: () => removeNode(...getCurrentTreePosition()),
    makemainvariation: () => makeMainVariation(...getCurrentTreePosition()),

    findmode: () => view.setFindMode(!view.getFindMode()),
    findnext: () => { view.setFindMode(true); findMove(view.getIndicatorVertex(), view.getFindText(), 1) },
    findprevious: () => { view.setFindMode(true); findMove(view.getIndicatorVertex(), view.getFindText(), -1) },
    togglehotspot: () => setHotspot(!getHotspot()),
    nexthotspot: () => findBookmark(1),
    previoushotspot: () => findBookmark(-1),

    goback: () => goBack(),
    goforward: () => goForward(),
    gotopreviousfork: () => goToPreviousFork(),
    gotonextfork: () => goToNextFork(),
    nextcomment: () => goToComment(1),
    previouscomment: () => goToComment(-1),
    gotobeginning: () => goToBeginning(),
    gotoend: () => goToEnd(),
    gotonextvariation: () => goToNextVariation(),
    gotopreviousvariation: () => goToPreviousVariation(),
    gotomainvariation: () => goToMainVariation(),

    manageengines: () => { view.showPreferences(); view.setPreferencesTab('engines') },
    detachengine: () => detachEngine(),
    generatemove: () => generateMove(),
    gtpconsole: () => view.setShowLeftSidebar(!view.getShowLeftSidebar()),
    clearconsole: () => view.clearConsole(),

    togglecoordinates: () => view.setShowCoordinates(!view.getShowCoordinates()),
    toggleguessmode: () => view.setGuessMode(!view.getGuessMode()),
    toggleautoplaymode: () => view.setAutoplayMode(!view.getAutoplayMode()),
    toggleshownextmoves: () => view.setShowNextMoves(!view.getShowNextMoves()),
    toggleshowsiblings: () => view.setShowSiblings(!view.getShowSiblings()),
    togglegamegraph: () => view.setSidebarArrangement(!view.getShowGraph(), view.getShowComment()),
    togglecomments: () => view.setSidebarArrangement(view.getShowGraph(), !view.getShowComment()),
    togglefullscreen: () => view.setFullScreen(!view.getFullScreen()),

    checkforupdates: () => ipcRenderer.send('check-for-updates', true),
    github: () => shell.openExternal('https://github.com/yishn/' + app.getName()),
    reportissue: () => shell.openExternal('https://github.com/yishn/' + app.getName() + '/issues')
}

ipcRenderer.on('menu-click', (e, action) => menudata[action]())
ipcRenderer.on('attach-engine', (e, path, args) => attachEngine(path, args))

ipcRenderer.on('load-file', (e, path) => {
    setTimeout(() => loadFile(path), setting.get('app.loadgame_delay'))
})
