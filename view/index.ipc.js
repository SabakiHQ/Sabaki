(function() {

var menudata = {
    "newfile": function() { newFile(true) },
    "newwindow": function() { ipcRenderer.send('new-window') },
    "loadfile": loadFile,
    "savefile": function() { saveFile(getRepresentedFilename()) },
    "saveas": saveFile,
    "loadclipboard": function() { loadFileFromSgf(clipboard.readText(), false, setRepresentedFilename.bind(null, null)) },
    "copytoclipboard": function() { clipboard.writeText(saveFileToSgf()) },
    "managegames": function() { showGameChooser() },
    "score": function() { setScoringMode(true) },
    "gameinfo": function() { showGameInfo() },
    "preferences": showPreferences,

    "editmode": function() { setEditMode(!getEditMode()) },
    "clearmarkups": clearMarkups,
    "stonetool": function() { setSelectedTool('stone') },
    "crosstool": function() { setSelectedTool('cross') },
    "triangletool": function() { setSelectedTool('triangle') },
    "squaretool": function() { setSelectedTool('square') },
    "circletool": function() { setSelectedTool('circle') },
    "linetool": function() { setSelectedTool('line') },
    "labeltool": function() { setSelectedTool('label') },
    "numbertool": function() { setSelectedTool('number') },
    "removenode": function() { removeNode.apply(null, getCurrentTreePosition()) },
    "makemainvariation": makeMainVariation,

    "findmode": function() { setFindMode(!getFindMode()) },
    "findnext": function() { setFindMode(true); findMove(getIndicatorVertex(), getFindText(), 1) },
    "findprevious": function() { setFindMode(true); findMove(getIndicatorVertex(), getFindText(), -1) },
    "togglehotspot": function() { setHotspot(!getHotspot()) },
    "nexthotspot": function() { findBookmark(1) },
    "previoushotspot": function() { findBookmark(-1) },

    "goback": goBack,
    "goforward": goForward,
    "gotopreviousfork": goToPreviousFork,
    "gotonextfork": goToNextFork,
    "nextcomment": function() { goToComment(1) },
    "previouscomment": function() { goToComment(-1) },
    "gotobeginning": goToBeginning,
    "gotoend": goToEnd,
    "gotonextvariation": goToNextVariation,
    "gotopreviousvariation": goToPreviousVariation,
    "gotomainvariation": goToMainVariation,

    "manageengines": function() { showPreferences(); setPreferencesTab('engines') },
    "detachengine": detachEngine,
    "generatemove": generateMove,
    "gtpconsole": function() { setShowLeftSidebar(!getShowLeftSidebar()) },
    "clearconsole": clearConsole,

    "togglecoordinates": function() { setShowCoordinates(!getShowCoordinates()) },
    "toggleguessmode": function() { setGuessMode(!getGuessMode()) },
    "toggleshownextmoves": function() { setShowNextMoves(!getShowNextMoves()) },
    "togglegamegraph": function() { setSidebarArrangement(!getShowGraph(), getShowComment()) },
    "togglecomments": function() { setSidebarArrangement(getShowGraph(), !getShowComment()) },
    "togglefullscreen": function() {
        var win = remote.getCurrentWindow()
        win.setFullScreen(!win.isFullScreen())
        win.setMenuBarVisibility(!win.isFullScreen())
        win.setAutoHideMenuBar(win.isFullScreen())
    },

    "checkforupdates": function() { ipcRenderer.send('check-for-updates', true) },
    "github": function() { shell.openExternal('https://github.com/yishn/' + app.getName()) },
    "reportissue": function() { shell.openExternal('https://github.com/yishn/' + app.getName() + '/issues') }
}

ipcRenderer.on('menu-click', function(e, action) { menudata[action]() })
ipcRenderer.on('load-file', function(e, path) { loadFile(path) })
ipcRenderer.on('attach-engine', function(e, path, args) { attachEngine(path, args) })

})()
