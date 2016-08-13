const {ipcRenderer, clipboard, shell} = require('electron')

let menudata = {
    newfile: () => newFile(true),
    newwindow: () => ipcRenderer.send('new-window'),
    loadfile: () => loadFile(),
    savefile: () => saveFile(getRepresentedFilename()),
    saveas: () => saveFile(),
    loadclipboard: () => loadFileFromSgf(clipboard.readText(), false, () => setRepresentedFilename(null)),
    copytoclipboard: () => clipboard.writeText(saveFileToSgf()),
    copyascii: () => clipboard.writeText(getBoard().generateAscii()),
    managegames: () => showGameChooser(),
    score: () => setScoringMode(true),
    estimate: () => setEstimatorMode(true),
    gameinfo: () => showGameInfo(),
    preferences: () => showPreferences(),

    editmode: () => setEditMode(!getEditMode()),
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

    findmode: () => setFindMode(!getFindMode()),
    findnext: () => { setFindMode(true); findMove(getIndicatorVertex(), getFindText(), 1) },
    findprevious: () => { setFindMode(true); findMove(getIndicatorVertex(), getFindText(), -1) },
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

    manageengines: () => { showPreferences(); setPreferencesTab('engines') },
    detachengine: () => detachEngine(),
    generatemove: () => generateMove(),
    gtpconsole: () => setShowLeftSidebar(!getShowLeftSidebar()),
    clearconsole: () => clearConsole(),

    togglecoordinates: () => setShowCoordinates(!getShowCoordinates()),
    toggleguessmode: () => setGuessMode(!getGuessMode()),
    toggleautoplaymode: () => setAutoplayMode(!getAutoplayMode()),
    toggleshownextmoves: () => setShowNextMoves(!getShowNextMoves()),
    toggleshowsiblings: () => setShowSiblings(!getShowSiblings()),
    togglegamegraph: () => setSidebarArrangement(!getShowGraph(), getShowComment()),
    togglecomments: () => setSidebarArrangement(getShowGraph(), !getShowComment()),
    togglefullscreen: () => setFullScreen(!getFullScreen()),

    checkforupdates: () => ipcRenderer.send('check-for-updates', true),
    github: () => shell.openExternal('https://github.com/yishn/' + app.getName()),
    reportissue: () => shell.openExternal('https://github.com/yishn/' + app.getName() + '/issues')
}

ipcRenderer.on('menu-click', (e, action) => menudata[action]())
ipcRenderer.on('attach-engine', (e, path, args) => attachEngine(path, args))

ipcRenderer.on('load-file', (e, path) => {
    setTimeout(() => loadFile(path), setting.get('app.loadgame_delay'))
})
