function setIsLoading(loading) {
    if (loading) document.body.addClass('loading')
    else $('loading').tween('opacity', 0).get('tween').addEvent('complete', function() {
        document.body.removeClass('loading')
        $('loading').setStyle('opacity', null)
    })
}

function getShowVariations() {
    return $('goban').hasClass('variations')
}

function setShowVariations(show) {
    if (show) $('goban').addClass('variations')
    else $('goban').removeClass('variations')
    setting.set('view.show_variations', show)
}

function getFuzzyStonePlacement() {
    return $('goban').hasClass('fuzzy')
}

function setFuzzyStonePlacement(fuzzy) {
    if (fuzzy) $('goban').addClass('fuzzy')
    else $('goban').removeClass('fuzzy')
    setting.set('view.fuzzy_stone_placement', fuzzy)
}

function getShowCoordinates() {
    return $('goban').hasClass('coordinates')
}

function setShowCoordinates(show) {
    if (show) $('goban').addClass('coordinates')
    else $('goban').removeClass('coordinates')
    setting.set('view.show_coordinates', show)
}

function getShowSidebar() {
    return document.body.hasClass('sidebar')
}

function setShowSidebar(show) {
    if (show) document.body.addClass('sidebar')
    else document.body.removeClass('sidebar')

    $('sidebar').setStyle('width', setting.get('view.sidebar_width'))
    $('main').setStyle('right', show ? setting.get('view.sidebar_width') : 0)
    setting.set('view.show_sidebar', show)

    if (show) {
        updateGraph()
        updateSlider()
    } else {
        // Clear game graph
        var s = $('graph').retrieve('sigma')

        if (s) {
            s.graph.clear()
            s.refresh()
        }
    }

    // Resize window
    var win  = remote.getCurrentWindow()
    var size = win.getContentSize()

    if (win.isMaximized()) return
    win.setContentSize(size[0] + (show ? 1 : -1) * setting.get('view.sidebar_width').toInt(), size[1])
}

function getSidebarWidth() {
    return $('sidebar').getStyle('width').toInt()
}

function setSidebarWidth(width) {
    $('sidebar').setStyle('width', width)
    $$('.sidebar #main').setStyle('right', width)
}

function getPlayerName(sign) {
    return $$('#player_' + sign + ' .name')[0].get('text')
}

function setPlayerName(sign, name) {
    if (name.trim() == '') name = sign > 0 ? 'Black' : 'White'
    $$('#player_' + sign + ' .name')[0].set('text', name)
}

function getCaptures() {
    return {
        '-1': $$('#player_-1 .captures')[0].get('text').toInt(),
        '1': $$('#player_1 .captures')[0].get('text').toInt()
    }
}

function setCaptures(captures) {
    $$('#player_-1 .captures')[0].set('text', captures['-1'])
        .setStyle('opacity', captures['-1'] == 0 ? 0 : .7)
    $$('#player_1 .captures')[0].set('text', captures['1'])
        .setStyle('opacity', captures['1'] == 0 ? 0 : .7)
}

function getCurrentPlayer() {
    return $$('.currentplayer')[0].get('src') == '../img/ui/blacktoplay.png' ? 1 : -1
}

function setCurrentPlayer(sign) {
    $$('.currentplayer').set('src', sign > 0 ? '../img/ui/blacktoplay.png' : '../img/ui/whitetoplay.png')
}

function getSliderValue() {
    return $$('#sidebar .slider div')[0].getStyle('height').toInt()
}

function setSliderValue(value) {
    $$('#sidebar .slider div')[0].setStyle('height', value + '%')
}

function getRootTree() {
    if (!getCurrentTreePosition()) return null

    return getCurrentTreePosition().unpack(function(tree, index) {
        while (tree.parent != null) tree = tree.parent
        return tree
    })
}

function setRootTree(tree) {
    if (tree.nodes.length == 0) return

    tree.parent = null
    setCurrentTreePosition(sgf.addBoard(tree), 0)

    // Update UI
    if (getShowSidebar()) {
        updateGraph()
        updateSlider()
    }

    if ('PB' in tree.nodes[0]) setPlayerName(1, tree.nodes[0].PB[0])
    if ('PW' in tree.nodes[0]) setPlayerName(-1, tree.nodes[0].PW[0])
}

function getGraphMatrixDict() {
    return $('graph').retrieve('graphmatrixdict')
}

function setGraphMatrixDict(matrixdict) {
    if (!getShowSidebar()) return

    var s = $('graph').retrieve('sigma')
    $('graph').store('graphmatrixdict', matrixdict)

    s.graph.clear()
    s.graph.read(gametree.matrix2graph(matrixdict))

    s.refresh()
}

function setCurrentTreePosition(tree, index) {
    if (!tree || getScoringMode()) return

    // Remove current graph node color
    var n = getCurrentGraphNode()
    if (n && n != getGraphNode(tree, index)) delete n.color

    $('goban').store('position', new Tuple(tree, index))

    // Set current path
    var t = tree
    while (t.parent) {
        t.parent.current = t.parent.subtrees.indexOf(t)
        t = t.parent
    }

    // Update graph and slider
    var n = getCurrentGraphNode()
    if (n) {
        setTimeout(function() {
            if (getCurrentGraphNode() != n) return
            centerGraphCameraAt(n)
            updateSlider()
        }, 300)
    }

    setBoard(sgf.addBoard(tree, index).nodes[index].board)

    // Determine current player
    setCurrentPlayer(1)

    if ('B' in tree.nodes[index]) setCurrentPlayer(-1)
    else if ('W' in tree.nodes[index]) setCurrentPlayer(1)
    else if ('PL' in tree.nodes[index])
        setCurrentPlayer(tree.nodes[index].PL[0] == 'W' ? -1 : 1)
    else if ('HA' in tree.nodes[index] && tree.nodes[index].HA[0].toInt() >= 1)
        setCurrentPlayer(-1)
}

function getCurrentTreePosition() {
    return $('goban').retrieve('position')
}

function getCurrentGraphNode() {
    if (!getCurrentTreePosition()) return null
    return getCurrentTreePosition().unpack(getGraphNode)
}

function getGraphNode(tree, index) {
    var s = $('graph').retrieve('sigma')
    return s.graph.nodes(tree.id + '-' + index)
}

function getSelectedTool() {
    var li = $$('#edit .selected')[0]
    var tool = li.get('class').replace('selected', '').replace('-tool', '').trim()

    if (tool == 'stone') {
        return li.getElement('img').get('src').contains('_1') ? 'stone_1' : 'stone_-1'
    } else {
        return tool
    }
}

function getBoard() {
    return $('goban').retrieve('board')
}

function setBoard(board) {
    if (!getBoard() || getBoard().size != board.size) {
        $('goban').store('board', board)
        buildBoard()
    }

    $('goban').store('board', board)
    setCaptures(board.captures)

    for (var x = 0; x < board.size; x++) {
        for (var y = 0; y < board.size; y++) {
            var li = $('goban').getElement('.pos_' + x + '-' + y)
            var sign = board.arrangement[li.retrieve('tuple')]
            var types = ['ghost_1', 'ghost_-1', 'circle', 'triangle',
                'cross', 'square', 'label', 'point']

            types.each(function(x) {
                if (li.hasClass(x)) li.removeClass(x)
            })

            if (li.retrieve('tuple') in board.overlays) {
                board.overlays[li.retrieve('tuple')].unpack(function(type, ghost, label) {
                    if (type != '') li.addClass(type)
                    if (ghost != 0) li.addClass('ghost_' + ghost)
                    if (label != '') li.set('data-label', label)
                })
            }

            if (li.hasClass('sign_' + sign)) continue

            for (var i = -1; i <= 1; i++) {
                if (li.hasClass('sign_' + i)) li.removeClass('sign_' + i)
            }

            li.addClass('sign_' + sign)
                .getElement('img').set('src', '../img/goban/stone_' + sign + '.png')
        }
    }
}

function getEditMode() {
    return $('bar').hasClass('edit')
}

function setEditMode(editMode) {
    if (editMode) {
        $('bar').addClass('edit')
        closeScore()
        closeGameInfo()
    } else {
        $('bar').removeClass('edit')
    }
}

function getScoringMode() {
    return $$('body')[0].hasClass('scoring')
}

function setScoringMode(scoringMode) {
    if (scoringMode) {
        $$('body').addClass('scoring')
        setEditMode(false)
        closeGameInfo()

        var deadstones = getBoard().guessDeadStones()
        deadstones.each(function(v) {
            $$('#goban .pos_' + v[0] + '-' + v[1]).addClass('dead')
        })

        updateAreaMap()
    } else {
        $$('body').removeClass('scoring')
        $$('.dead').removeClass('dead')
    }
}

function getScoringMethod() {
    return $$('#score .method .territory')[0].hasClass('current') ? 'territory' : 'area'
}

function setScoringMethod(method) {
    $$('#score .method li').removeClass('current')
    $$('#score .method .' + method).addClass('current')
    $$('#score tr > *').addClass('disabled')
    $$('#score table .' + method).removeClass('disabled')

    setting.set('scoring.method', method)

    // Update UI
    for (var sign = -1; sign <= 1; sign += 2) {
        var tr = $$('#score tbody tr' + (sign < 0 ? ':last-child' : ''))[0]
        var tds = tr.getElements('td')

        tds[4].set('text', 0)

        for (var i = 0; i <= 3; i++) {
            if (tds[i].hasClass('disabled') || isNaN(tds[i].get('text').toFloat())) continue
            tds[4].set('text', tds[4].get('text').toFloat() + tds[i].get('text').toFloat())
        }
    }
}

/**
 * Menu
 */

function buildMenu() {
    var template = [
        {
            label: '&Game',
            submenu: [
                {
                    label: '&New',
                    accelerator: 'CmdOrCtrl+N',
                    click: function() { newGame(true) }
                },
                {
                    label: '&Load…',
                    accelerator: 'CmdOrCtrl+O',
                    click: function() { loadGame() }
                },
                // { type: 'separator' },
                // {
                //     label: '&Save',
                //     accelerator: 'CmdOrCtrl+S'
                // },
                {
                    label: 'Save &As…',
                    accelerator: 'CmdOrCtrl+S',
                    click: function() { saveGame() }
                },
                { type: 'separator' },
                {
                    label: '&Info',
                    accelerator: 'CmdOrCtrl+I',
                    click: showGameInfo
                }
            ]
        },
        {
            label: '&Edit',
            submenu: [
                {
                    label: 'Toggle &Edit Mode',
                    accelerator: 'CmdOrCtrl+E',
                    click: function() {
                        setEditMode(!getEditMode())
                    }
                },
                { type: 'separator' },
                {
                    label: '&Stone Tool',
                    accelerator: 'CmdOrCtrl+1',
                    click: function() {
                        setEditMode(true)
                        selectTool('stone')
                    }
                },
                {
                    label: '&Cross Tool',
                    accelerator: 'CmdOrCtrl+2',
                    click: function() {
                        setEditMode(true)
                        selectTool('cross')
                    }
                },
                {
                    label: '&Triangle Tool',
                    accelerator: 'CmdOrCtrl+3',
                    click: function() {
                        setEditMode(true)
                        selectTool('triangle')
                    }
                },
                {
                    label: '&Square Tool',
                    accelerator: 'CmdOrCtrl+4',
                    click: function() {
                        setEditMode(true)
                        selectTool('square')
                    }
                },
                {
                    label: '&Circle Tool',
                    accelerator: 'CmdOrCtrl+5',
                    click: function() {
                        setEditMode(true)
                        selectTool('circle')
                    }
                },
                {
                    label: '&Label Tool',
                    accelerator: 'CmdOrCtrl+6',
                    click: function() {
                        setEditMode(true)
                        selectTool('label')
                    }
                },
                {
                    label: '&Number Tool',
                    accelerator: 'CmdOrCtrl+7',
                    click: function() {
                        setEditMode(true)
                        selectTool('number')
                    }
                }
            ]
        },
        {
            label: '&Navigation',
            submenu: [
                {
                    label: '&Back',
                    accelerator: 'Up',
                    click: goBack
                },
                {
                    label: '&Forward',
                    accelerator: 'Down',
                    click: goForward
                },
                { type: 'separator' },
                {
                    label: 'Go To &Previous Fork',
                    accelerator: 'CmdOrCtrl+Up',
                    click: goToPreviousFork
                },
                {
                    label: 'Go To &Next Fork',
                    accelerator: 'CmdOrCtrl+Down',
                    click: goToNextFork
                },
                { type: 'separator' },
                {
                    label: 'Go To &Beginning',
                    accelerator: 'CmdOrCtrl+Home',
                    click: goToBeginning
                },
                {
                    label: 'Go To &End',
                    accelerator: 'CmdOrCtrl+End',
                    click: goToEnd
                },
                { type: 'separator' },
                {
                    label: 'Go To Next Variatio&n',
                    accelerator: 'Right',
                    click: goToNextVariation
                },
                {
                    label: 'Go To Previous &Variation',
                    accelerator: 'Left',
                    click: goToPreviousVariation
                }
            ]
        },
        {
            label: '&View',
            submenu: [
                {
                    label: '&Fuzzy Stone Placement',
                    type: 'checkbox',
                    checked: getFuzzyStonePlacement(),
                    click: function() {
                        setFuzzyStonePlacement(!getFuzzyStonePlacement())
                    }
                },
                {
                    label: 'Show &Coordinates',
                    type: 'checkbox',
                    checked: getShowCoordinates(),
                    click: function() {
                        setShowCoordinates(!getShowCoordinates())
                        resizeBoard()
                    }
                },
                {
                    label: 'Show &Variations',
                    type: 'checkbox',
                    checked: getShowVariations(),
                    click: function() {
                        setShowVariations(!getShowVariations())
                    }
                },
                { type: 'separator' },
                {
                    label: 'Show Game &Graph',
                    type: 'checkbox',
                    checked: getShowSidebar(),
                    click: function() {
                        setShowSidebar(!getShowSidebar())
                        resizeBoard()
                    }
                }
            ]
        },
        {
            label: '&Help',
            submenu: [
                {
                    label: app.getName(),
                    enabled: false
                },
                {
                    label: 'Version ' + app.getVersion(),
                    enabled: false
                },
                { type: 'separator' },
                {
                    label: 'Issues',
                    click: function() {
                        shell.openExternal('https://github.com/yishn/Goban/issues')
                    }
                },
                {
                    label: 'GitHub Respository',
                    click: function() {
                        shell.openExternal('https://github.com/yishn/Goban')
                    }
                }
            ]
        }
    ]

    Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function openHeaderMenu() {
    var template = [
        {
            label: '&Pass',
            click: function() {
                makeMove(new Tuple(-1, -1))
            }
        },
        {
            label: '&Score',
            click: function() {
                setScoringMode(true)
            }
        },
        { type: 'separator' },
        {
            label: '&Edit',
            click: function() {
                setEditMode(true)
            }
        },
        {
            label: '&Info',
            click: showGameInfo
        }
    ]

    menu = Menu.buildFromTemplate(template)
    menu.popup(remote.getCurrentWindow(), $('headermenu').getPosition().x, $$('header')[0].getCoordinates().top)
}

function openNodeMenu(tree, index) {
    if (getScoringMode()) return

    var template = [
        {
            label: '&Remove',
            click: function() {
                removeNode(tree, index)
            }
        }
    ]

    menu = Menu.buildFromTemplate(template)
    menu.popup(remote.getCurrentWindow(), event.x, event.y)
}
