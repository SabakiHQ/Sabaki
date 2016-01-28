/**
 * Getter & setter
 */

function getMainMenu() {
    return helper.retrieve('mainmenu')
}

function getIsBusy() {
    return document.body.hasClass('busy')
}

function setIsBusy(busy) {
    if (busy) document.body.addClass('busy')
    else document.body.removeClass('busy')
}

function setProgressIndicator(progress, win) {
    if (progress == 0) document.body.removeClass('progress')
    else document.body.addClass('progress')

    $$('#progress div').setStyle('width', (progress * 100) + '%')
    if (win) win.setProgressBar(progress)
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

function getShowLeftSidebar() {
    return document.body.hasClass('leftsidebar')
}

function setShowLeftSidebar(show) {
    if (getShowLeftSidebar() == show) return
    if (show) document.body.addClass('leftsidebar')
    else document.body.removeClass('leftsidebar')

    $('leftsidebar').setStyle('width', setting.get('view.leftsidebar_width'))
    $('main').setStyle('left', show ? setting.get('view.leftsidebar_width') : 0)

    // Resize window
    var win = remote.getCurrentWindow()
    var size = win.getContentSize()

    if (!win.isMaximized())
        win.setContentSize(size[0] + (show ? 1 : -1) * setting.get('view.leftsidebar_width'), size[1])

    resizeBoard()
    setting.set('view.show_leftsidebar', show)

    // Update scrollbars
    var view = $$('#console .gm-scroll-view')[0]
    view.scrollTo(0, view.getScrollSize().y)
    view.getElement('form:last-child input').focus()
    helper.retrieve('console-scrollbar').update()
}

function setLeftSidebarWidth(width) {
    if (!getShowLeftSidebar()) return
    $('leftsidebar').setStyle('width', width)
    $('main').setStyle('left', width)
}

function getLeftSidebarWidth() {
    return $('leftsidebar').getStyle('width').toInt()
}

function getShowSidebar() {
    return document.body.hasClass('sidebar')
}

function setShowSidebar(show) {
    if (getShowSidebar() == show) return
    if (show) document.body.addClass('sidebar')
    else document.body.removeClass('sidebar')

    $('sidebar').setStyle('width', setting.get('view.sidebar_width'))
    $('main').setStyle('right', show ? setting.get('view.sidebar_width') : 0)

    if (show) {
        updateGraph()
        updateSlider()
        updateCommentText();
    } else {
        // Clear game graph
        var s = helper.retrieve('sigma')

        if (s) {
            s.graph.clear()
            s.refresh()
        }
    }

    // Resize window
    var win = remote.getCurrentWindow()
    var size = win.getContentSize()

    if (!win.isMaximized())
        win.setContentSize(size[0] + (show ? 1 : -1) * setting.get('view.sidebar_width'), size[1])
    resizeBoard()
}

function getSidebarArrangement() {
    return [
        getShowSidebar() && getCommentHeight() != 100,
        getShowSidebar() && getCommentHeight() != 0
    ]
}

function setSidebarArrangement(graph, comment, updateLayout) {
    if (updateLayout == null || updateLayout) updateSidebarLayout()

    if (!graph && !comment) setShowSidebar(false)
    else {
        if (!graph && comment) setCommentHeight(100)
        else if (comment) setCommentHeight(setting.get('view.comments_height'))
        else if (!comment) setCommentHeight(0)
        setShowSidebar(true)
    }

    setting.set('view.show_graph', graph)
    setting.set('view.show_comments', comment)
}

function getShowGraph() {
    return getSidebarArrangement()[0]
}

function getShowComment() {
    return getSidebarArrangement()[1]
}

function getSidebarWidth() {
    return $('sidebar').getStyle('width').toInt()
}

function setSidebarWidth(width) {
    if (!getShowSidebar()) return
    $('sidebar').setStyle('width', width)
    $$('.sidebar #main').setStyle('right', width)
}

function getCommentHeight() {
    return $('properties').getSize().y * 100 / $('sidebar').getSize().y
}

function setCommentHeight(height) {
    $('graph').setStyle('height', (100 - height) + '%')
    $('properties').setStyle('height', height + '%')
    setSliderValue.apply(null, getSliderValue())
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
        '-1': +$$('#player_-1 .captures')[0].get('text'),
        '1': +$$('#player_1 .captures')[0].get('text')
    }
}

function setCaptures(captures) {
    $$('#player_-1 .captures')[0].set('text', captures['-1'])
        .setStyle('opacity', captures['-1'] == 0 ? 0 : .7)
    $$('#player_1 .captures')[0].set('text', captures['1'])
        .setStyle('opacity', captures['1'] == 0 ? 0 : .7)
}

function getCurrentPlayer() {
    return $$('.currentplayer')[0].get('src') == '../img/ui/blacktoplay.svg' ? 1 : -1
}

function setCurrentPlayer(sign) {
    $$('.currentplayer').set('src', sign > 0 ? '../img/ui/blacktoplay.svg' : '../img/ui/whitetoplay.svg')
}

function getCommentText() {
    return $$('#properties textarea').get('value')[0]
}

function setCommentText(text) {
    var html = helper.htmlify(text, true, true, true, true)
    var container = $$('#properties .inner')[0]

    $$('#properties textarea').set('value', text)
    container.set('html', html)
    helper.wireLinks(container)

    $$('#properties .gm-scroll-view')[0].scrollTo(0, 0)
    $$('#properties textarea')[0].scrollTo(0, 0)
    helper.retrieve('properties-scrollbar').update()
}

function getSliderValue() {
    var span = $$('#sidebar .slider .inner span')[0]
    var value = span.getStyle('top').toInt()
    var label = span.get('text')

    return [value, label]
}

function setSliderValue(value, label) {
    $$('#sidebar .slider .inner span').setStyle('top', value + '%').set('text', label)
}

function getFindMode() {
    return document.body.hasClass('find')
}

function setFindMode(pickMode) {
    if (pickMode) {
        closeDrawers()
        document.body.addClass('find')
    } else {
        document.body.removeClass('find')
        hideIndicator()
    }
}

function getEditMode() {
    return document.body.hasClass('edit')
}

function setEditMode(editMode) {
    if (editMode) {
        closeDrawers()
        document.body.addClass('edit')
    } else {
        document.body.removeClass('edit')
    }
}

function getScoringMode() {
    return document.body.hasClass('scoring')
}

function setScoringMode(scoringMode) {
    if (scoringMode) {
        closeDrawers()
        document.body.addClass('scoring')

        var deadstones = getBoard().guessDeadStones()
        deadstones.forEach(function(v) {
            $$('#goban .pos_' + v[0] + '-' + v[1]).addClass('dead')
        })

        updateAreaMap()
    } else {
        document.body.removeClass('scoring')
        $$('.dead').removeClass('dead')
    }
}

function getIndicatorVertex() {
    return $('indicator').retrieve('vertex')
}

function setPreferencesTab(tab) {
    $$('#preferences .tabs')[0]
        .getElement('.current')
        .removeClass('current')
        .getParent()
        .getElement('.' + tab)
        .getParent()
        .addClass('current')

    var form = $$('#preferences form')[0]
    form.className = tab

    if (tab == 'engines')
        helper.retrieve('engineslist-scrollbar').update()
}

/**
 * Methods
 */

function addEngineItem(name, path, args) {
    if (!name) name = ''
    if (!path) path = ''
    if (!args) args = ''

    var ul = $$('#preferences .engines-list ul')[0]
    var li = new Element('li').grab(new Element('h3').grab(
        new Element('input', {
            type: 'text',
            placeholder: '(Unnamed engine)',
            value: name
        })
    )).grab(
        new Element('p').grab(new Element('input', {
            type: 'text',
            placeholder: 'Path',
            value: path
        })).grab(new Element('a.browse', {
            events: {
                click: function() {
                    setIsBusy(true)

                    var result = dialog.showOpenDialog(remote.getCurrentWindow(), {
                        filters: [{ name: 'All Files', extensions: ['*'] }]
                    })

                    if (result) {
                        this.getParent('li')
                            .getElement('h3 + p input')
                            .set('value', result[0])
                            .focus()
                    }

                    setIsBusy(false)
                }
            }
        }).grab(new Element('img', {
            src: '../node_modules/octicons/svg/file-directory.svg',
            height: 14
        })))
    ).grab(
        new Element('p').grab(new Element('input', {
            type: 'text',
            placeholder: 'No arguments',
            value: args
        }))
    ).grab(
        new Element('a.remove', {
            events: {
                click: function() {
                    this.getParent('li').dispose()
                    helper.retrieve('engineslist-scrollbar').update()
                }
            }
        }).grab(new Element('img', {
            src: '../node_modules/octicons/svg/x.svg',
            height: 14
        }))
    )

    ul.grab(li)
    li.getElement('h3 input').focus()

    var enginesScrollbar = helper.retrieve('engineslist-scrollbar')
    if (enginesScrollbar) enginesScrollbar.update()
}

function showMessageBox(message, type, buttons, cancelId) {
    setIsBusy(true)

    if (!type) type = 'info'
    if (!buttons) buttons = ['OK']
    if (isNaN(cancelId)) cancelId = 0

    var result = dialog.showMessageBox(remote.getCurrentWindow(), {
        'type': type,
        'buttons': buttons,
        'title': app.getName(),
        'message': message,
        'cancelId': cancelId,
        'noLink': true
    })

    setIsBusy(false)
    return result
}

function readjustShifts(vertex) {
    var li = $$('#goban .pos_' + vertex[0] + '-' + vertex[1])[0]
    var direction = li.get('class').split(' ').filter(function(x) {
        return x.indexOf('shift_') == 0
    }).map(function(x) {
        return +x.replace('shift_', '')
    })

    if (direction.length == 0) return
    direction = direction[0]

    if (direction == 1 || direction == 5 || direction == 8) {
        // Left
        $$('#goban .pos_' + (vertex[0] - 1) + '-' + vertex[1])
            .removeClass('shift_3').removeClass('shift_7').removeClass('shift_6')
    } else if (direction == 2 || direction == 5 || direction == 6) {
        // Top
        $$('#goban .pos_' + vertex[0] + '-' + (vertex[1] - 1))
            .removeClass('shift_4').removeClass('shift_7').removeClass('shift_8')
    } else if (direction == 3 || direction == 7 || direction == 6) {
        // Right
        $$('#goban .pos_' + (vertex[0] + 1) + '-' + vertex[1])
            .removeClass('shift_1').removeClass('shift_5').removeClass('shift_8')
    } else if (direction == 4 || direction == 7 || direction == 8) {
        // Bottom
        $$('#goban .pos_' + vertex[0] + '-' + (vertex[1] + 1))
            .removeClass('shift_2').removeClass('shift_5').removeClass('shift_6')
    }
}

function updateSidebarLayout() {
    var container = $$('#properties .gm-scroll-view')[0]
    container.setStyle('opacity', 0)

    setTimeout(function() {
        helper.retrieve('sigma').renderers[0].resize().render()
        helper.retrieve('properties-scrollbar').update()
        container.setStyle('opacity', 1)
    }, 300)
}

function buildBoard() {
    var board = getBoard()
    var rows = []
    var hoshi = board.getHandicapPlacement(9)

    for (var y = 0; y < board.size; y++) {
        var ol = new Element('ol.row')

        for (var x = 0; x < board.size; x++) {
            var vertex = [x, y]
            var li = new Element('li.pos_' + x + '-' + y)
                .addClass('shift_' + Math.floor(Math.random() * 9))
            var img = new Element('img', { src: '../img/goban/stone_0.png' })

            if (hoshi.some(function(v) { return helper.equals(v, vertex) }))
                li.addClass('hoshi')

            ol.adopt(li.adopt(img)
                .addEvent('mouseup', function() {
                    if (!helper.retrieve('goban-mousedown')) return
                    helper.store('goban-mousedown', false)
                    vertexClicked(this)
                }.bind(vertex))
                .addEvent('mousedown', function() {
                    helper.store('goban-mousedown', true)
                })
                .grab(new Element('div', { class: 'area' }))
            )
        }

        rows.push(ol)
    }

    var alpha = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'
    var coordx = new Element('ol.coordx')
    var coordy = new Element('ol.coordy')

    for (var i = 0; i < board.size; i++) {
        coordx.adopt(new Element('li', { text: alpha[i] }))
        coordy.adopt(new Element('li', { text: board.size - i }))
    }

    var goban = $$('#goban div')[0]
    goban.empty().adopt(rows, coordx, coordy)
    goban.grab(coordx.clone(), 'top').grab(coordy.clone(), 'top')

    resizeBoard()

    // Readjust shifts

    $$('#goban .row li:not(.shift_0)').forEach(function(li) {
        readjustShifts(helper.li2vertex(li))
    })
}

function resizeBoard() {
    var board = getBoard()
    if (!board) return

    var width = $('goban').getStyle('width').toInt()
    var height = $('goban').getStyle('height').toInt()
    var min = Math.min(width, height)

    var size = !getShowCoordinates() ? board.size : board.size + 2
    var fieldsize = helper.roundEven(min / size)
    min = fieldsize * size

    $$('#goban > div').setStyle('width', min).setStyle('height', min)
        .setStyle('margin-left', -min / 2).setStyle('margin-top', -min / 2)

    $$('#goban .row, #goban .coordx').setStyle('height', fieldsize).setStyle('line-height', fieldsize)
    $$('#goban .row, #goban .coordx').setStyle('margin-left', getShowCoordinates() ? fieldsize : 0)

    $$('#goban .coordy').setStyle('width', fieldsize).setStyle('top', fieldsize).setStyle('line-height', fieldsize)
    $$('#goban .coordy:last-child').setStyle('left', fieldsize * (board.size + 1))

    $$('#goban li').setStyle('width', fieldsize).setStyle('height', fieldsize)

    setSliderValue.apply(null, getSliderValue())
    if (getIndicatorVertex()) showIndicator(getIndicatorVertex())
}

function showIndicator(vertex) {
    var x = vertex[0], y = vertex[1]
    var li = $$('#goban .pos_' + x + '-' + y)

    if (li.length == 0) return
    li = li[0]

    $('indicator').setStyle('top', li.getPosition().y)
        .setStyle('left', li.getPosition().x)
        .setStyle('height', li.getSize().y)
        .setStyle('width', li.getSize().x)

    helper.store('indicator-vertex', vertex)
}

function hideIndicator() {
    $('indicator').setStyle('top', '')
        .setStyle('left', '')

    helper.store('indicator-vertex', null)
}

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
                {
                    label: 'Save &As…',
                    accelerator: 'CmdOrCtrl+S',
                    click: function() { saveGame() }
                },
                { type: 'separator' },
                {
                    label: '&Score',
                    click: function() { setScoringMode(true) }
                },
                {
                    label: '&Info',
                    accelerator: 'CmdOrCtrl+I',
                    click: showGameInfo
                },
                { type: 'separator' },
                {
                    label: '&Preferences…',
                    accelerator: 'CmdOrCtrl+,',
                    click: showPreferences
                }
            ]
        },
        {
            label: '&Edit',
            submenu: [
                {
                    label: 'Toggle &Edit Mode',
                    accelerator: 'CmdOrCtrl+E',
                    click: function() { setEditMode(!getEditMode()) }
                },
                {
                    label: 'Clear &All Overlays',
                    click: clearAllOverlays
                },
                { type: 'separator' },
                {
                    label: '&Stone Tool',
                    accelerator: 'CmdOrCtrl+1',
                    click: function() { setSelectedTool('stone') }
                },
                {
                    label: '&Cross Tool',
                    accelerator: 'CmdOrCtrl+2',
                    click: function() { setSelectedTool('cross') }
                },
                {
                    label: '&Triangle Tool',
                    accelerator: 'CmdOrCtrl+3',
                    click: function() { setSelectedTool('triangle') }
                },
                {
                    label: 'S&quare Tool',
                    accelerator: 'CmdOrCtrl+4',
                    click: function() { setSelectedTool('square') }
                },
                {
                    label: 'C&ircle Tool',
                    accelerator: 'CmdOrCtrl+5',
                    click: function() { setSelectedTool('circle') }
                },
                {
                    label: '&Label Tool',
                    accelerator: 'CmdOrCtrl+6',
                    click: function() { setSelectedTool('label') }
                },
                {
                    label: '&Number Tool',
                    accelerator: 'CmdOrCtrl+7',
                    click: function() { setSelectedTool('number') }
                },
                { type: 'separator' },
                {
                    label: '&Remove Node',
                    accelerator: 'CmdOrCtrl+Delete',
                    click: function() { removeNode.apply(null, getCurrentTreePosition()) }
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
                    label: 'Go To Be&ginning',
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
                    label: 'Go To Next Va&riation',
                    accelerator: 'Right',
                    click: goToNextVariation
                },
                {
                    label: 'Go To Previous &Variation',
                    accelerator: 'Left',
                    click: goToPreviousVariation
                },
                { type: 'separator' },
                {
                    label: 'Find &Move',
                    accelerator: 'CmdOrCtrl+F',
                    click: function() { setFindMode(true) }
                }
            ]
        },
        {
            label: 'Eng&ine',
            submenu: [
                {
                    label: '&Attach',
                    submenu: []
                },
                {
                    label: '&Detach',
                    click: detachEngine
                },
                { type: 'separator' },
                {
                    label: 'Generate &Move',
                    accelerator: 'F10',
                    click: generateMove
                },
                { type: 'separator' },
                {
                    label: 'Show &GTP Console',
                    type: 'checkbox',
                    checked: getShowLeftSidebar(),
                    accelerator: 'F12',
                    click: function() { setShowLeftSidebar(!getShowLeftSidebar()) }
                },
                {
                    label: '&Clear Console',
                    click: clearConsole
                }
            ]
        },
        {
            label: '&View',
            submenu: [
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
                    click: function() { setShowVariations(!getShowVariations()) }
                },
                { type: 'separator' },
                {
                    label: 'Show Game &Graph',
                    type: 'checkbox',
                    checked: getShowGraph(),
                    accelerator: 'CmdOrCtrl+G',
                    click: function() { setSidebarArrangement(!getShowGraph(), getShowComment()) }
                },
                {
                    label: 'Show Co&mments',
                    type: 'checkbox',
                    checked: getShowComment(),
                    accelerator: 'CmdOrCtrl+H',
                    click: function() { setSidebarArrangement(getShowGraph(), !getShowComment()) }
                },
                { type: 'separator' },
                {
                    label: 'Toggle Full &Screen',
                    type: 'checkbox',
                    checked: remote.getCurrentWindow().isFullScreen(),
                    accelerator: 'F11',
                    click: function() {
                        var win = remote.getCurrentWindow()
                        win.setFullScreen(!win.isFullScreen())
                        win.setMenuBarVisibility(!win.isFullScreen())
                        win.setAutoHideMenuBar(win.isFullScreen())
                    }
                }
            ]
        },
        {
            label: '&Help',
            submenu: [
                {
                    label: app.getName() + ' v' + app.getVersion(),
                    enabled: false
                },
                {
                    label: 'Check For &Updates',
                    click: function() {
                        checkForUpdates(function(hasUpdates) {
                            if (hasUpdates) return
                            showMessageBox('There are no updates available.')
                        })
                    }
                },
                { type: 'separator' },
                {
                    label: 'GitHub &Respository',
                    click: function() {
                        shell.openExternal('https://github.com/yishn/' + app.getName())
                    }
                },
                {
                    label: 'Report &Issue',
                    click: function() {
                        shell.openExternal('https://github.com/yishn/' + app.getName() + '/issues')
                    }
                }
            ]
        }
    ]

    var menu = Menu.buildFromTemplate(template)
    helper.store('mainmenu', menu)
    Menu.setApplicationMenu(menu)
}

function openHeaderMenu() {
    var template = [
        {
            label: '&Pass',
            click: function() { makeMove([-1, -1]) }
        },
        {
            label: '&Score',
            click: function() { setScoringMode(true) }
        },
        { type: 'separator' },
        {
            label: '&Edit',
            click: function() { setEditMode(true) }
        },
        {
            label: '&Find',
            click: function() { setFindMode(true) }
        },
        { type: 'separator' },
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

function clearConsole() {
    $$('#console .inner pre, #console .inner form:not(:last-child)').dispose()
    $$('#console .inner form:last-child input')[0].set('value', '').focus()
    helper.retrieve('console-scrollbar').update()
}

/**
 * Drawers
 */

function showGameInfo() {
    closeDrawers()

    var tree = getRootTree()
    var rootNode = tree.nodes[0]
    var info = $('info')

    info.addClass('show').getElement('input[name="name_1"]').focus()

    info.getElement('input[name="name_1"]').set('value', getPlayerName(1))
    info.getElement('input[name="name_-1"]').set('value', getPlayerName(-1))
    info.getElement('input[name="rank_1"]').set('value', 'BR' in rootNode ? rootNode.BR[0] : '')
    info.getElement('input[name="rank_-1"]').set('value', 'WR' in rootNode ? rootNode.WR[0] : '')
    info.getElement('input[name="result"]').set('value', 'RE' in rootNode ? rootNode.RE[0] : '')
    info.getElement('input[name="komi"]').set('value', 'KM' in rootNode ? rootNode.KM[0].toFloat() : '')

    var size = info.getElement('input[name="size"]')
    size.set('value', 'SZ' in rootNode ? rootNode.SZ[0] : '')

    var handicap = info.getElement('select[name="handicap"]')
    if ('HA' in rootNode) handicap.selectedIndex = Math.max(0, +rootNode.HA[0] - 1)
    else handicap.selectedIndex = 0

    var disabled = tree.nodes.length > 1 || tree.subtrees.length > 0
    handicap.disabled = disabled
    size.disabled = disabled
}

function closeGameInfo() {
    $('info').removeClass('show')
}

function showScore() {
    var board = helper.retrieve('goban-finalboard')
    var score = board.getScore(helper.retrieve('goban-areamap'))
    var rootNode = getRootTree().nodes[0]

    for (var sign = -1; sign <= 1; sign += 2) {
        var tr = $$('#score tbody tr' + (sign < 0 ? ':last-child' : ''))[0]
        var tds = tr.getElements('td')

        tds[0].set('text', score['area_' + sign])
        tds[1].set('text', score['territory_' + sign])
        tds[2].set('text', score['captures_' + sign])
        if (sign < 0) tds[3].set('text', getKomi())
        tds[4].set('text', 0)

        setScoringMethod(setting.get('scoring.method'))
    }

    $('score').addClass('show')
}

function closeScore() {
    $('score').removeClass('show')
    setScoringMode(false)
}

function showPreferences() {
    // Load preferences

    $$('#preferences input[type="checkbox"]').forEach(function(el) {
        el.checked = !!setting.get(el.name)
    })

    loadEngines()

    // Show preferences

    setPreferencesTab('general')
    closeDrawers()
    $('preferences').addClass('show')
}

function closePreferences() {
    $('preferences').removeClass('show')
}

function closeDrawers() {
    closeGameInfo()
    closeScore()
    closePreferences()
    setEditMode(false)
    setScoringMode(false)
    setFindMode(false)
}

/**
 * Main
 */

document.addEvent('domready', function() {
    document.title = app.getName()

    document.body.addEvent('mouseup', function() {
        helper.store('goban-mousedown', false)
    })

    // Find bar buttons

    $$('#find button').addEvent('click', function() {
        $$('#find button').removeClass('selected')
        this.addClass('selected')
    })

    // Preferences tabs

    $$('#preferences .tabs a').addEvent('click', function() {
        setPreferencesTab(this.className)
        return false
    })

    // Properties scrollbar

    helper.store('properties-scrollbar', new Scrollbar({
        element: $('properties'),
        createElements: false
    }).create())

    helper.store('console-scrollbar', new Scrollbar({
        element: $('console'),
        createElements: false
    }).create())

    // Engines list scrollbar

    var enginesList = $$('#preferences .engines-list')[0]
    helper.store('engineslist-scrollbar', new Scrollbar({
        element: enginesList,
        createElements: false
    }).create())

    // Resize sidebar

    $$('.verticalresizer').addEvent('mousedown', function() {
        if (event.button != 0) return
        helper.store(
            this.getParent().id + '-initposx',
            [event.x, this.getParent().getStyle('width').toInt()]
        )
    })

    $$('#sidebar .horizontalresizer').addEvent('mousedown', function() {
        if (event.button != 0) return
        helper.store('sidebar-initposy', [event.y, getCommentHeight()])
        $('properties').setStyle('transition', 'none')
    })

    document.body.addEvent('mouseup', function() {
        var sidebarInitPosX = helper.retrieve('sidebar-initposx')
        var sidebarInitPosY = helper.retrieve('sidebar-initposy')
        var leftSidebarInitPosX = helper.retrieve('leftsidebar-initposx')

        if (!sidebarInitPosX && !leftSidebarInitPosX && !sidebarInitPosY) return

        if (sidebarInitPosX) {
            helper.store('sidebar-initposx', null)
            setting.set('view.sidebar_width', getSidebarWidth())
        } else if (leftSidebarInitPosX) {
            helper.store('leftsidebar-initposx', null)
            setting.set('view.leftsidebar_width', getLeftSidebarWidth())
            return
        } else if (sidebarInitPosY) {
            helper.store('sidebar-initposy', null)
            $('properties').setStyle('transition', '')
            setting.set('view.comments_height', getCommentHeight())
            setSidebarArrangement(true, true, false)
        }

        if (helper.retrieve('sigma'))
            helper.retrieve('sigma').renderers[0].resize().render()
    }).addEvent('mousemove', function() {
        var sidebarInitPosX = helper.retrieve('sidebar-initposx')
        var sidebarInitPosY = helper.retrieve('sidebar-initposy')
        var leftSidebarInitPosX = helper.retrieve('leftsidebar-initposx')

        if (!sidebarInitPosX && !leftSidebarInitPosX && !sidebarInitPosY) return

        if (sidebarInitPosX) {
            var initX = sidebarInitPosX[0], initWidth = sidebarInitPosX[1]
            var newwidth = Math.max(initWidth - event.x + initX, setting.get('view.sidebar_minwidth'))

            setSidebarWidth(newwidth)
            resizeBoard()
        } else if (leftSidebarInitPosX) {
            var initX = leftSidebarInitPosX[0], initWidth = leftSidebarInitPosX[1]
            var newwidth = Math.max(initWidth + event.x - initX, setting.get('view.leftsidebar_minwidth'))

            setLeftSidebarWidth(newwidth)
            resizeBoard()

            helper.retrieve('console-scrollbar').update()
            return
        } else if (sidebarInitPosY) {
            var initY = sidebarInitPosY[0], initHeight = sidebarInitPosY[1]
            var newheight = Math.min(Math.max(
                initHeight + (initY - event.y) * 100 / $('sidebar').getSize().y,
                setting.get('view.comments_minheight')
            ), 100 - setting.get('view.comments_minheight'))

            setCommentHeight(newheight)
        }

        helper.retrieve('properties-scrollbar').update()
    })
})
