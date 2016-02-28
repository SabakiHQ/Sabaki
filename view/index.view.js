/**
 * Getter & setter
 */

function getIsBusy() {
    return document.body.retrieve('busy')
}

function setIsBusy(busy) {
    document.body.store('busy', busy)

    if (busy) {
        document.body.addClass('busy')
        return
    }

    setTimeout(function() {
        document.body.removeClass('busy')
    }, setting.get('app.hide_busy_delay'))
}

function setProgressIndicator(progress, win) {
    if (win) win.setProgressBar(progress)
}

function getShowNextMoves() {
    return $('goban').hasClass('variations')
}

function setShowNextMoves(show) {
    if (show) $('goban').addClass('variations')
    else $('goban').removeClass('variations')

    setting.set('view.show_next_moves', show)
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

    // Resize window
    var win = remote.getCurrentWindow()
    if (win) {
        var size = win.getContentSize()

        if (!win.isMaximized())
            win.setContentSize(size[0] + (show ? 1 : -1) * setting.get('view.leftsidebar_width'), size[1])
    }

    if (show) document.body.addClass('leftsidebar')
    else document.body.removeClass('leftsidebar')

    $('leftsidebar').setStyle('width', setting.get('view.leftsidebar_width'))
    $('main').setStyle('left', show ? setting.get('view.leftsidebar_width') : 0)

    resizeBoard()
    setting.set('view.show_leftsidebar', show)

    // Update scrollbars
    var view = $$('#console .gm-scroll-view')[0]
    view.scrollTo(0, view.getScrollSize().y)
    view.getElement('form:last-child input').focus()
    $('console').retrieve('scrollbar').update()
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

    // Resize window
    var win = remote.getCurrentWindow()
    if (win) {
        var size = win.getContentSize()

        if (!win.isMaximized())
            win.setContentSize(size[0] + (show ? 1 : -1) * setting.get('view.sidebar_width'), size[1])
    }

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
        var s = $('graph').retrieve('sigma')

        if (s) {
            s.graph.clear()
            s.refresh()
        }
    }

    resizeBoard()
}

function getSidebarArrangement() {
    return [
        getShowSidebar() && getPropertiesHeight() != 100,
        getShowSidebar() && getPropertiesHeight() != 0
    ]
}

function setSidebarArrangement(graph, comment, updateLayout) {
    if (updateLayout == null || updateLayout) updateSidebarLayout()

    if (!graph && !comment) setShowSidebar(false)
    else {
        if (!graph && comment) setPropertiesHeight(100)
        else if (comment) setPropertiesHeight(setting.get('view.properties_height'))
        else if (!comment) setPropertiesHeight(0)
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

function getPropertiesHeight() {
    return $('properties').getSize().y * 100 / $('sidebar').getSize().y
}

function setPropertiesHeight(height) {
    $('graph').setStyle('height', (100 - height) + '%')
    $('properties').setStyle('height', height + '%')
    setSliderValue.apply(null, getSliderValue())
}

function getPlayerName(sign) {
    var el = $$('#player_' + sign + ' .name')[0]
    return [el.get('text'), el.get('title')]
}

function setPlayerName(sign, name, tooltip) {
    if (name.trim() == '') name = sign > 0 ? 'Black' : 'White'
    $$('#player_' + sign + ' .name')[0].set('text', name).set('title', tooltip)
}

function getShowHotspot() {
    return document.body.hasClass('bookmark')
}

function setShowHotspot(bookmark) {
    if (bookmark) document.body.addClass('bookmark')
    else document.body.removeClass('bookmark')
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
    var container = $$('#properties .inner .comment')[0]
    var textarea = $$('#properties textarea')[0]

    if (textarea.get('value') != text) textarea.set('value', text)
    container.set('html', html)
    helper.wireLinks(container)
}

function getCommentTitle() {
    return $$('#properties .edit .header input')[0].get('value')
}

function setCommentTitle(text) {
    var input = $$('#properties .edit .header input')[0]

    $$('#properties .inner .header span')[0].set('text', text.trim() != '' ? text : getCurrentMoveInterpretation())
    if (input.get('value') != text) input.set('value', text)
}

function setAnnotations(posstatus, posvalue, movestatus, movevalue) {
    var header = $$('#properties .inner .header')[0]
    var img = header.getElement('img:nth-child(2)')

    // Set move status

    if (movestatus == null) header.removeClass('movestatus')
    else header.addClass('movestatus')

    if (movestatus == -1)
        img.set('src', '../img/ui/badmove.svg')
            .set('alt', 'Bad move')
    else if (movestatus == 0)
        img.set('src', '../img/ui/doubtfulmove.svg')
            .set('alt', 'Doubtful move')
    else if (movestatus == 1)
        img.set('src', '../img/ui/interestingmove.svg')
            .set('alt', 'Interesting move')
    else if (movestatus == 2)
        img.set('src', '../img/ui/goodmove.svg')
            .set('alt', 'Good move')

    if (movevalue == 2) img.alt = 'Very ' + img.alt.toLowerCase()
    img.title = img.alt

    // Set positional status

    img = header.getElement('img:nth-child(1)')

    if (posstatus == null) header.removeClass('positionstatus')
    else header.addClass('positionstatus')

    if (posstatus == -1)
        img.set('src', '../img/ui/white.svg')
            .set('alt', 'Good for white')
    else if (posstatus == 0)
        img.set('src', '../img/ui/balance.svg')
            .set('alt', 'Even position')
    else if (posstatus == 1)
        img.set('src', '../img/ui/black.svg')
            .set('alt', 'Good for black')
    else if (posstatus == -2)
        img.set('src', '../img/ui/unclear.svg')
            .set('alt', 'Unclear position')

    if (posvalue == 2) img.alt = 'Very ' + img.alt.toLowerCase()
    img.title = img.alt
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
        $('find').getElement('input').focus()
    } else {
        hideIndicator()
        document.body.removeClass('find')
        setFindText('')
    }
}

function getFindText() {
    return $('find').getElement('input').value
}

function setFindText(text) {
    $('find').getElement('input').value = text
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
        // Clean board
        $$('#goban .row li')
        .removeClass('area_-1')
        .removeClass('area_0')
        .removeClass('area_1')
        .removeClass('dead')

        closeDrawers()
        document.body.addClass('scoring')

        var deadstones = getBoard().guessDeadStones()
        deadstones.forEach(function(v) {
            $$('#goban .pos_' + v[0] + '-' + v[1]).addClass('dead')
        })

        updateAreaMap()
    } else {
        document.body.removeClass('scoring')
    }
}

function getIndicatorVertex() {
    return $('indicator').retrieve('vertex')
}

function setIndicatorVertex(vertex) {
    if (vertex) showIndicator(vertex)
    else hideIndicator()
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
        $$('#preferences .engines-list')[0].retrieve('scrollbar').update()
}

function getRepresentedFilename() {
    return document.body.retrieve('representedfilename')
}

function setRepresentedFilename(filename) {
    var path = require('path')

    document.body.store('representedfilename', filename)
    remote.getCurrentWindow().setRepresentedFilename(filename ? filename : '')

    var title = app.getName()
    if (filename) title = path.basename(filename)
    if (filename && process.platform != 'darwin') title += ' — ' + app.getName()

    document.title = title
}

function getShapes() {
    var shapes = document.body.retrieve('shapes')

    if (!shapes) {
        shapes = boardmatcher.readShapes(__dirname + '/../data/shapes.sgf')
        document.body.store('shapes', shapes)
    }

    return shapes
}

function getCurrentMoveInterpretation() {
    var board = getBoard()
    var tp = getCurrentTreePosition()
    var node = tp[0].nodes[tp[1]]

    // Determine capture

    var ptp = gametree.navigate.apply(null, tp.concat([-1]))

    if (ptp[0]) {
        var prevBoard = ptp[0].nodes[ptp[1]].board

        if (!helper.equals(prevBoard.captures, board.captures))
            return 'Take'
    }

    // Get current vertex

    var vertex

    if ('B' in node && node.B[0] != '')
        vertex = sgf.point2vertex(node.B[0])
    else if ('W' in node && node.W[0] != '')
        vertex = sgf.point2vertex(node.W[0])
    else if ('W' in node || 'B' in node)
        return 'Pass'
    else
        return ''

    if (!board.hasVertex(vertex)) return 'Pass'

    var sign = board.arrangement[vertex]
    var neighbors = board.getNeighbors(vertex)

    // Check atari

    if (neighbors.some(function(v) {
        return board.arrangement[v] == -sign && board.getLiberties(v).length == 1
    })) return 'Atari'

    // Check connection

    var friendly = neighbors.filter(function(v) { return board.arrangement[v] == sign})
    if (friendly.length == neighbors.length) return 'Fill'
    if (friendly.length >= 2) return 'Connect'

    // Match shape

    var shapes = getShapes()

    for (var i = 0; i < shapes.length; i++) {
        if (boardmatcher.shapeMatch(shapes[i], board, vertex))
            return shapes[i].name
    }

    if (friendly.length == 1) return 'Stretch'

    // Determine position to edges

    if (vertex[0] == (board.size - 1) / 2 && vertex[1] == vertex[0])
        return 'Tengen'

    var diff = board.getCanonicalVertex(vertex).map(function(x) { return x + 1 })

    if ((diff[0] != 4 || diff[1] != 4) && board.getHandicapPlacement(9).some(function(v) {
        return v[0] == vertex[0] && v[1] == vertex[1]
    })) return 'Hoshi'

    if (diff[1] <= 6) return diff.join('-') + ' point'

    return ''
}

/**
 * Methods
 */

function prepareScrollbars() {
    $('properties').store('scrollbar', new GeminiScrollbar({
        element: $('properties'),
        createElements: false
    }).create())

    $('console').store('scrollbar', new GeminiScrollbar({
        element: $('console'),
        createElements: false
    }).create())

    var enginesList = $$('#preferences .engines-list')[0]
    enginesList.store('scrollbar', new GeminiScrollbar({
        element: enginesList,
        createElements: false
    }).create())

    var gamesList = $$('#gamechooser .games-list')[0]
    gamesList.store('scrollbar', new GeminiScrollbar({
        element: gamesList,
        createElements: false
    }).create())

    window.addEvent('resize', function() {
        if (!$('gamechooser').hasClass('show')) return

        var width = $$('#gamechooser .games-list')[0].getWidth() - 20
        var svgs = $$('#gamechooser svg')

        if (svgs.length == 0) return

        var liwidth = svgs[0].getWidth() + 12 + 20
        var count = Math.floor(width / liwidth)

        $$('#gamechooser li').setStyle('width', Math.floor(width / count) - 20)
        $$('#gamechooser .games-list')[0].retrieve('scrollbar').update()
    })
}

function prepareResizers() {
    $$('.verticalresizer').addEvent('mousedown', function(e) {
        if (e.event.button != 0) return
        this.getParent().store('initposx', [e.event.screenX, this.getParent().getStyle('width').toInt()])
    })

    $$('#sidebar .horizontalresizer').addEvent('mousedown', function(e) {
        if (e.event.button != 0) return
        $('sidebar').store('initposy', [e.event.screenY, getPropertiesHeight()])
        $('properties').setStyle('transition', 'none')
    })

    document.body.addEvent('mouseup', function() {
        var sidebarInitPosX = $('sidebar').retrieve('initposx')
        var leftSidebarInitPosX = $('leftsidebar').retrieve('initposx')
        var initPosY = $('sidebar').retrieve('initposy')

        if (!sidebarInitPosX && !leftSidebarInitPosX && !initPosY) return

        if (sidebarInitPosX) {
            $('sidebar').store('initposx', null)
            setting.set('view.sidebar_width', getSidebarWidth())
        } else if (leftSidebarInitPosX) {
            $('leftsidebar').store('initposx', null)
            setting.set('view.leftsidebar_width', getLeftSidebarWidth())
            return
        } else if (initPosY) {
            $('sidebar').store('initposy', null)
            $('properties').setStyle('transition', '')
            setting.set('view.properties_height', getPropertiesHeight())
            setSidebarArrangement(true, true, false)
        }

        if ($('graph').retrieve('sigma'))
            $('graph').retrieve('sigma').renderers[0].resize().render()
    }).addEvent('mousemove', function(e) {
        var sidebarInitPosX = $('sidebar').retrieve('initposx')
        var leftSidebarInitPosX = $('leftsidebar').retrieve('initposx')
        var initPosY = $('sidebar').retrieve('initposy')

        if (!sidebarInitPosX && !leftSidebarInitPosX && !initPosY) return

        if (sidebarInitPosX) {
            var initX = sidebarInitPosX[0], initWidth = sidebarInitPosX[1]
            var newwidth = Math.max(initWidth - e.event.screenX + initX, setting.get('view.sidebar_minwidth'))

            setSidebarWidth(newwidth)
            resizeBoard()
        } else if (leftSidebarInitPosX) {
            var initX = leftSidebarInitPosX[0], initWidth = leftSidebarInitPosX[1]
            var newwidth = Math.max(initWidth + e.event.screenX - initX, setting.get('view.leftsidebar_minwidth'))

            setLeftSidebarWidth(newwidth)
            resizeBoard()

            $('console').retrieve('scrollbar').update()
            return
        } else if (initPosY) {
            var initY = initPosY[0], initHeight = initPosY[1]
            var newheight = Math.min(Math.max(
                initHeight + (initY - e.event.screenY) * 100 / $('sidebar').getSize().y,
                setting.get('view.properties_minheight')
            ), 100 - setting.get('view.properties_minheight'))

            setPropertiesHeight(newheight)
        }

        $('properties').retrieve('scrollbar').update()
    })
}

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
                    $$('#preferences .engines-list')[0].retrieve('scrollbar').update()
                }
            }
        }).grab(new Element('img', {
            src: '../node_modules/octicons/svg/x.svg',
            height: 14
        }))
    )

    ul.grab(li)
    li.getElement('h3 input').focus()

    var enginesScrollbar = $$('#preferences .engines-list')[0].retrieve('scrollbar')
    if (enginesScrollbar) enginesScrollbar.update()
}

function showMessageBox(message, type, buttons, cancelId) {
    setIsBusy(true)

    if (!type) type = 'info'
    if (!buttons) buttons = ['OK']
    if (isNaN(cancelId)) cancelId = 0

    var result = dialog.showMessageBox(remote.getCurrentWindow(), {
        type: type,
        buttons: buttons,
        title: app.getName(),
        message: message,
        cancelId: cancelId,
        noLink: true
    })

    setIsBusy(false)
    return result
}

function readjustShifts(vertex) {
    var li = $$('#goban .pos_' + vertex[0] + '-' + vertex[1])[0]
    var direction = li.get('class').split(' ').filter(function(x) {
        return x.indexOf('shift_') == 0
    }).map(function(x) {
        return x.replace('shift_', '').toInt()
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
        $('graph').retrieve('sigma').renderers[0].resize().render()
        $('properties').retrieve('scrollbar').update()
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
                .store('tuple', vertex)
                .addClass('shift_' + Math.floor(Math.random() * 9))
            var img = new Element('img', { src: '../img/goban/stone_0.png' })

            if (hoshi.some(function(v) { return helper.equals(v, vertex) }))
                li.addClass('hoshi')

            ol.adopt(li.adopt(img)
                .addEvent('mouseup', function(e) {
                    if (!$('goban').retrieve('mousedown')) return
                    $('goban').store('mousedown', false)
                    vertexClicked(this, e.event)
                }.bind(vertex))
                .addEvent('mousedown', function() {
                    $('goban').store('mousedown', true)
                })
                .grab(new Element('div', { class: 'paint' }))
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
        readjustShifts(li.retrieve('tuple'))
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
        .store('vertex', vertex)
}

function hideIndicator() {
    $('indicator').setStyle('top', '')
        .setStyle('left', '')
        .store('vertex', null)
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

function openCommentMenu() {
    var tp = getCurrentTreePosition()
    var node = tp[0].nodes[tp[1]]

    var clearPosAnnotations = function() {
        ['UC', 'GW', 'DM', 'GB'].forEach(function(p) { delete node[p] })
    }
    var clearMoveAnnotations = function() {
        ['BM', 'TE', 'DO', 'IT'].forEach(function(p) { delete node[p] })
    }

    var template = [
        {
            label: '&Clear Annotations',
            click: function() {
                clearPosAnnotations()
                clearMoveAnnotations()
                commitCommentText()
            }
        },
        { type: 'separator' },
        {
            label: 'Good for &Black',
            type: 'checkbox',
            data: ['GB', clearPosAnnotations, 1]
        },
        {
            label: '&Unclear Position',
            type: 'checkbox',
            data: ['UC', clearPosAnnotations, 1]
        },
        {
            label: '&Even Position',
            type: 'checkbox',
            data: ['DM', clearPosAnnotations, 1]
        },
        {
            label: 'Good for &White',
            type: 'checkbox',
            data: ['GW', clearPosAnnotations, 1]
        }
    ]

    if ('B' in node || 'W' in node) {
        template.push.apply(template, [
            { type: 'separator' },
            {
                label: '&Good Move',
                type: 'checkbox',
                data: ['TE', clearMoveAnnotations, 1]
            },
            {
                label: '&Interesting Move',
                type: 'checkbox',
                data: ['IT', clearMoveAnnotations, '']
            },
            {
                label: '&Doubtful Move',
                type: 'checkbox',
                data: ['DO', clearMoveAnnotations, '']
            },
            {
                label: 'B&ad Move',
                type: 'checkbox',
                data: ['BM', clearMoveAnnotations, 1]
            }
        ])
    }

    template.forEach(function(item) {
        if (!('data' in item)) return

        var p = item.data[0], clear = item.data[1], value = item.data[2]

        delete item.data
        item.checked = p in node
        item.click = function() {
            if (p in node) {
                clear()
            } else {
                clear()
                node[p] = [value]
                commitCommentText()
            }
        }
    })

    var coord = $$('#properties .edit .header img')[0].getCoordinates()

    menu = Menu.buildFromTemplate(template)
    menu.popup(remote.getCurrentWindow(), Math.round(coord.left), Math.round(coord.bottom))
}

function openNodeMenu(tree, index) {
    if (getScoringMode()) return

    var template = [{
        label: '&Remove',
        click: function() { removeNode(tree, index) }
    }]

    menu = Menu.buildFromTemplate(template)
    menu.popup(remote.getCurrentWindow(), event.x, event.y)
}

function clearConsole() {
    $$('#console .inner pre, #console .inner form:not(:last-child)').dispose()
    $$('#console .inner form:last-child input')[0].set('value', '').focus()
    $('console').retrieve('scrollbar').update()
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

    info.getElement('input[name="name_1"]').set('value', 'PB' in rootNode ? rootNode.PB[0] : '')
    info.getElement('input[name="name_-1"]').set('value', 'PW' in rootNode ? rootNode.PW[0] : '')
    info.getElement('input[name="rank_1"]').set('value', 'BR' in rootNode ? rootNode.BR[0] : '')
    info.getElement('input[name="rank_-1"]').set('value', 'WR' in rootNode ? rootNode.WR[0] : '')
    info.getElement('input[name="result"]').set('value', 'RE' in rootNode ? rootNode.RE[0] : '')
    info.getElement('input[name="komi"]').set('value', 'KM' in rootNode ? rootNode.KM[0].toFloat() : '')

    var size = info.getElement('input[name="size"]')
    size.set('value', 'SZ' in rootNode ? rootNode.SZ[0] : '')

    var handicap = info.getElement('select[name="handicap"]')
    if ('HA' in rootNode) handicap.selectedIndex = Math.max(0, rootNode.HA[0].toInt() - 1)
    else handicap.selectedIndex = 0

    var disabled = tree.nodes.length > 1 || tree.subtrees.length > 0
    handicap.disabled = disabled
    size.disabled = disabled
}

function closeGameInfo() {
    $('info').removeClass('show')
}

function showScore() {
    var board = $('goban').retrieve('finalboard')
    var score = board.getScore($('goban').retrieve('areamap'))
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

function showGameChooser(trees) {
    closeDrawers()

    $$('#gamechooser ol')[0].empty()

    for (var i = 0; i < trees.length; i++) {
        var tree = trees[i]
        var li = new Element('li')
        var tp = gametree.navigate(tree, 0, 30)
        if (!tp[0]) tp = gametree.navigate(tree, 0, gametree.getCurrentHeight(tree) - 1)

        var board = sgf.addBoard.apply(null, tp).nodes[tp[1]].board
        var svg = board.getSvg(153)

        $$('#gamechooser ol')[0].grab(li.grab(
            new Element('div')
            .store('index', i)
            .grab(svg)
            .grab(new Element('span.black', { text: 'Black' }))
            .grab(new Element('span.white', { text: 'White' }))
        ))

        var node = tree.nodes[0]
        var black = li.getElement('.black')
        var white = li.getElement('.white')

        if ('PB' in node) black.set('text', node.PB[0])
        if ('BR' in node) black.set('title', node.BR[0])
        if ('PW' in node) white.set('text', node.PW[0])
        if ('WR' in node) white.set('title', node.WR[0])

        li.getElement('div').addEvent('click', function() {
            var link = this
            closeGameChooser()
            setTimeout(function() {
                setRootTree(trees[link.retrieve('index')], true)
                if (setting.get('game.goto_end_after_loading')) goToEnd()
            }, 500)
        })
    }

    $('gamechooser').addClass('show')
    window.fireEvent('resize')
}

function closeGameChooser() {
    $('gamechooser').removeClass('show')
}

function closeDrawers() {
    closeGameInfo()
    closeScore()
    closePreferences()
    closeGameChooser()
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
        $('goban').store('mousedown', false)
    })

    prepareScrollbars()
    prepareResizers()
})
