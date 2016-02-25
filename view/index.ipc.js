(function() {

var menudata = {
    "newgame": function() { newGame(true) },
    "loadgame": loadGame,
    "savegame": function() { saveGame(getRepresentedFilename()) },
    "saveas": saveGame,
    "score": function() { setScoringMode(true) },
    "gameinfo": showGameInfo,
    "preferences": showPreferences,

    "editmode": function() { setEditMode(!getEditMode()) },
    "clearoverlays": clearOverlays,
    "stonetool": function() { setSelectedTool('stone') },
    "crosstool": function() { setSelectedTool('cross') },
    "triangletool": function() { setSelectedTool('triangle') },
    "squaretool": function() { setSelectedTool('square') },
    "circletool": function() { setSelectedTool('circle') },
    "labeltool": function() { setSelectedTool('label') },
    "numbertool": function() { setSelectedTool('number') },
    "removenode": function() { removeNode.apply(null, getCurrentTreePosition()) },
    "makemaintrack": makeMainTrack,

    "findmode": function() { setFindMode(!getFindMode()) },
    "findnext": function() { findMove(getIndicatorVertex(), getFindText(), 1) },
    "findprevious": function() { findMove(getIndicatorVertex(), getFindText(), -1) },
    "togglehotspot": function() { setHotspot(!getHotspot()) },
    "nexthotspot": function() { findBookmark(1) },
    "previoushotspot": function() { findBookmark(-1) },

    "goback": goBack,
    "goforward": goForward,
    "gotopreviousfork": goToPreviousFork,
    "gotonextfork": goToNextFork,
    "gotobeginning": goToBeginning,
    "gotoend": goToEnd,
    "gotonextvariation": goToNextVariation,
    "gotopreviousvariation": goToPreviousVariation,

    "manageengines": function() { showPreferences(); setPreferencesTab('engines') },
    "detachengine": detachEngine,
    "generatemove": generateMove,
    "gtpconsole": function() { setShowLeftSidebar(!getShowLeftSidebar()) },
    "clearconsole": clearConsole,

    "togglecoordinates": function() { setShowCoordinates(!getShowCoordinates()); resizeBoard() },
    "toggleshownextmoves": function() { setShowNextMoves(!getShowNextMoves()) },
    "togglegamegraph": function() { setSidebarArrangement(!getShowGraph(), getShowComment()) },
    "togglecomments": function() { setSidebarArrangement(getShowGraph(), !getShowComment()) },
    "togglefullscreen": function() {
        var win = remote.getCurrentWindow()
        win.setFullScreen(!win.isFullScreen())
        win.setMenuBarVisibility(!win.isFullScreen())
        win.setAutoHideMenuBar(win.isFullScreen())
    },

    "checkforupdates": function() {
        checkForUpdates(function(hasUpdates) {
            if (hasUpdates) return
            showMessageBox('There are no updates available.')
        })
    },
    "github": function() { shell.openExternal('https://github.com/yishn/' + app.getName()) },
    "reportissue": function() { shell.openExternal('https://github.com/yishn/' + app.getName() + '/issues') }
}

ipcRenderer.on('menu-click', function(e, action) { menudata[action]() })
ipcRenderer.on('load-game', function(e, path) { loadGame(path) })
ipcRenderer.on('attach-engine', function(e, path, args) { attachEngine(path, args) })

})()
