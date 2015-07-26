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
    var win = remote.getCurrentWindow()
    var size = win.getContentSize()

    if (win.isMaximized()) return
    win.setContentSize(size[0] + (show ? 1 : -1) * setting.get('view.sidebar_width'), size[1])
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
    var value = $$('#sidebar .slider div')[0].getStyle('height').toInt()
    var label = $$('#sidebar .slider span')[0].get('text')

    return new Tuple(value, label)
}

function setSliderValue(value, label) {
    var handle = $$('#sidebar .slider div')[0]
    var labelel = $$('#sidebar .slider span')[0]

    var top = value * $('sidebar').getSize().y / 100 - labelel.getSize().y / 2
    top = Math.min(Math.max(top, 10), $('sidebar').getSize().y - 10 - labelel.getSize().y)

    handle.setStyle('height', value + '%')
    labelel.set('text', label).setStyle('top', top)
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
                    accelerator: 'CmdOrCtrl+G',
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

/**
 * Main
 */

document.addEvent('domready', function() {
    buildMenu()

    $('goban').addEvent('mousewheel', function(e) {
        if (e.wheel < 0) goForward()
        else if (e.wheel > 0) goBack()
    })

    document.body.addEvent('mouseup', function() {
        $('goban').store('mousedown', false)
    })

    // Resize sidebar

    $$('#sidebar .verticalresizer').addEvent('mousedown', function() {
        if (event.button != 0) return
        $('sidebar').store('initpos', new Tuple(event.x, getSidebarWidth()))
    })
    document.body.addEvent('mouseup', function() {
        if (!$('sidebar').retrieve('initpos')) return

        $('sidebar').store('initpos', null)
        if ($('graph').retrieve('sigma'))
            $('graph').retrieve('sigma').renderers[0].resize().render()

        setting.set('view.sidebar_width', getSidebarWidth())
    }).addEvent('mousemove', function() {
        var initPos = $('sidebar').retrieve('initpos')

        if (!initPos) return
        initPos.unpack(function(initX, initWidth) {
            var newwidth = Math.max(initWidth - event.x + initX, setting.get('view.sidebar_minwidth'))

            setSidebarWidth(newwidth)
            resizeBoard()
        })
    })
})
