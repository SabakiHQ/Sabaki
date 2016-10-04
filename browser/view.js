const {shell, remote, ipcRenderer} = require('electron')
const {app, dialog, Menu} = remote
const GeminiScrollbar = require('gemini-scrollbar')

const $ = require('../modules/sprint')
const sgf = require('../modules/sgf')
const boardmatcher = require('../modules/boardmatcher')
const gametree = require('../modules/gametree')
const helper = require('../modules/helper')
const setting = require('../modules/setting')

/**
 * Getters & Setters
 */

let busyTimeout = null

exports.getIsBusy = function() {
    return $('body').data('busy')
}

exports.setIsBusy = function(busy) {
    $('body').data('busy', busy)
    clearTimeout(busyTimeout)

    if (busy) {
        $('body').addClass('busy')
        return
    }

    busyTimeout = setTimeout(() => {
        $('body').removeClass('busy')
    }, setting.get('app.hide_busy_delay'))
}

exports.getFullScreen = function() {
    return remote.getCurrentWindow().isFullScreen()
}

exports.setFullScreen = function(fullscreen) {
    let win = remote.getCurrentWindow()
    win.setFullScreen(fullscreen)
    win.setMenuBarVisibility(!fullscreen)
    win.setAutoHideMenuBar(fullscreen)
}

exports.setProgressIndicator = function(progress, win) {
    if (win) win.setProgressBar(progress)
}

exports.getShowNextMoves = function() {
    return $('#goban').hasClass('variations')
}

exports.setShowNextMoves = function(show) {
    $('#goban').toggleClass('variations', show)
    setting.set('view.show_next_moves', show)
}

exports.getShowSiblings = function() {
    return $('#goban').hasClass('siblings')
}

exports.setShowSiblings = function(show) {
    $('#goban').toggleClass('siblings', show)
    setting.set('view.show_siblings', show)
}

exports.getFuzzyStonePlacement = function() {
    return $('#goban').hasClass('fuzzy')
}

exports.setFuzzyStonePlacement = function(fuzzy) {
    $('#goban').toggleClass('fuzzy', fuzzy)
    setting.set('view.fuzzy_stone_placement', fuzzy)
}

exports.getAnimatedStonePlacement = function() {
    return $('#goban').hasClass('animation')
}

exports.setAnimatedStonePlacement = function(animate) {
    $('#goban').toggleClass('animation', animate)
    setting.set('view.animate_stone_placement', animate)
}

exports.getShowCoordinates = function() {
    return $('#goban').hasClass('coordinates')
}

exports.setShowCoordinates = function(show) {
    $('#goban').toggleClass('coordinates', show)
    setting.set('view.show_coordinates', show)
    exports.resizeBoard()
}

exports.getShowLeftSidebar = function() {
    return $('body').hasClass('leftsidebar')
}

exports.setShowLeftSidebar = function(show) {
    if (exports.getShowLeftSidebar() == show) return

    // Resize window
    let win = remote.getCurrentWindow()
    if (win) {
        let size = win.getContentSize()

        if (!win.isMaximized()) {
            size[0] += (show ? 1 : -1) * setting.get('view.leftsidebar_width')
            win.setContentSize(...size)
        }
    }

    $('body').toggleClass('leftsidebar', show)

    $('#leftsidebar').css('width', setting.get('view.leftsidebar_width'))
    $('#main').css('left', show ? setting.get('view.leftsidebar_width') : 0)

    exports.resizeBoard()
    setting.set('view.show_leftsidebar', show)

    // Update scrollbars

    let $view = $('#console.gm-prevented, #console.gm-scrollbar-container .gm-scroll-view')
    $view.scrollTop($view.get(0).scrollHeight)
    $view.find('form:last-child input').get(0).focus()
    $('#console').data('scrollbar').update()
}

exports.setLeftSidebarWidth = function(width) {
    if (!exports.getShowLeftSidebar()) return
    $('#leftsidebar').css('width', width)
    $('#main').css('left', width)
}

exports.getLeftSidebarWidth = function() {
    return parseFloat($('#leftsidebar').css('width'))
}

exports.getShowSidebar = function() {
    return $('body').hasClass('sidebar')
}

exports.setShowSidebar = function(show) {
    if (exports.getShowSidebar() == show) return

    // Resize window
    let win = remote.getCurrentWindow()
    if (win) {
        let size = win.getContentSize()

        if (!win.isMaximized()) {
            size[0] += (show ? 1 : -1) * setting.get('view.sidebar_width')
            win.setContentSize(...size)
        }
    }

    $('body').toggleClass('sidebar', show)

    $('#sidebar').css('width', setting.get('view.sidebar_width'))
    $('#main').css('right', show ? setting.get('view.sidebar_width') : 0)

    if (show) {
        sabaki.updateGraph()
        sabaki.updateSlider()
        sabaki.updateCommentText();
    } else {
        // Clear game graph
        let sigma = $('#graph').data('sigma')

        if (sigma) {
            sigma.graph.clear()
            sigma.refresh()
        }
    }

    exports.resizeBoard()
}

exports.getSidebarArrangement = function() {
    return [
        exports.getShowSidebar() && exports.getPropertiesHeight() != 100,
        exports.getShowSidebar() && exports.getPropertiesHeight() != 0
    ]
}

exports.setSidebarArrangement = function(graph, comment, redraw = true) {
    if (redraw) {
        let $container = $('#properties .gm-scroll-view')
        $container.css('opacity', 0)

        setTimeout(() => {
            $('#graph').data('sigma').renderers[0].resize().render()
            $('#properties').data('scrollbar').update()
            $container.css('opacity', 1)
        }, 300)
    }

    if (!graph && !comment) {
        exports.setShowSidebar(false)
    } else {
        if (!graph && comment) exports.setPropertiesHeight(100)
        else if (comment) exports.setPropertiesHeight(setting.get('view.properties_height'))
        else if (!comment) exports.setPropertiesHeight(0)
        exports.setShowSidebar(true)
    }

    setting.set('view.show_graph', graph)
    setting.set('view.show_comments', comment)
}

exports.getShowGraph = function() {
    return exports.getSidebarArrangement()[0]
}

exports.getShowComment = function() {
    return exports.getSidebarArrangement()[1]
}

exports.getSidebarWidth = function() {
    return parseFloat($('#sidebar').css('width'))
}

exports.setSidebarWidth = function(width) {
    if (!exports.getShowSidebar()) return
    $('#sidebar').css('width', width)
    $('.sidebar #main').css('right', width)
}

exports.getPropertiesHeight = function() {
    return $('#properties').height() * 100 / $('#sidebar').height()
}

exports.setPropertiesHeight = function(height) {
    $('#graph').css('height', (100 - height) + '%')
    $('#properties').css('height', height + '%')
    exports.setSliderValue(...exports.getSliderValue())
}

exports.getPlayerName = function(sign) {
    let $el = $('#player_' + sign + ' .name')
    return [$el.text(), $el.attr('title')]
}

exports.setPlayerName = function(sign, name, tooltip) {
    if (name.trim() == '') name = sign > 0 ? 'Black' : 'White'
    $('#player_' + sign + ' .name').text(name).attr('title', tooltip)
}

exports.getShowHotspot = function() {
    return $('body').hasClass('bookmark')
}

exports.setShowHotspot = function(bookmark) {
    $('body').toggleClass('bookmark', bookmark)
}

exports.getCaptures = function() {
    return {
        '-1': +$('#player_-1 .captures').text(),
        '1': +$('#player_1 .captures').text()
    }
}

exports.setCaptures = function(captures) {
    $('#player_-1 .captures')
        .text(captures['-1'])
        .css('opacity', captures['-1'] == 0 ? 0 : .7)
    $('#player_1 .captures')
        .text(captures['1'])
        .css('opacity', captures['1'] == 0 ? 0 : .7)
}

exports.getCurrentPlayer = function() {
    return $('.current-player').attr('src') == '../img/ui/blacktoplay.svg' ? 1 : -1
}

exports.setCurrentPlayer = function(sign) {
    $('.current-player')
    .attr('src', sign > 0 ? '../img/ui/blacktoplay.svg' : '../img/ui/whitetoplay.svg')
    .attr('title', sign > 0 ? 'Black to play' : 'White to play')
}

exports.getCommentText = function() {
    return $('#properties textarea').val()
}

exports.setCommentText = function(text) {
    let html = helper.markdown(text)
    let $container = $('#properties .inner .comment')
    let $textarea = $('#properties textarea')

    if ($textarea.val() != text) $textarea.val(text)
    $container.html(html)
    exports.wireLinks($container)
}

exports.getCommentTitle = function() {
    return $('#properties .edit .header input').val()
}

exports.setCommentTitle = function(text) {
    let $input = $('#properties .edit .header input')
    let $header = $('#properties .inner .header span')

    $header.text(text)
    if ($input.val() != text) $input.val(text)

    if (text.trim() == '' && !!setting.get('comments.show_move_interpretation'))
        $header.text(exports.getCurrentMoveInterpretation())
}

exports.setAnnotations = function(posstatus, posvalue, movestatus, movevalue) {
    let $header = $('#properties .inner .header')
    let $img = $header.find('img:nth-child(2)')

    // Set move status

    if (movestatus == null) $header.removeClass('movestatus')
    else $header.addClass('movestatus')

    if (movestatus == -1)
        $img.attr('src', '../img/ui/badmove.svg')
            .attr('alt', 'Bad move')
    else if (movestatus == 0)
        $img.attr('src', '../img/ui/doubtfulmove.svg')
            .attr('alt', 'Doubtful move')
    else if (movestatus == 1)
        $img.attr('src', '../img/ui/interestingmove.svg')
            .attr('alt', 'Interesting move')
    else if (movestatus == 2)
        $img.attr('src', '../img/ui/goodmove.svg')
            .attr('alt', 'Good move')

    if (movevalue == 2) $img.attr('alt', 'Very ' + $img.attr('alt').toLowerCase())
    $img.attr('title', $img.attr('alt'))

    // Set positional status

    $img = $header.find('img:nth-child(1)')

    if (posstatus == null) $header.removeClass('positionstatus')
    else $header.addClass('positionstatus')

    if (posstatus == -1)
        $img.attr('src', '../img/ui/white.svg')
            .attr('alt', 'Good for white')
    else if (posstatus == 0)
        $img.attr('src', '../img/ui/balance.svg')
            .attr('alt', 'Even position')
    else if (posstatus == 1)
        $img.attr('src', '../img/ui/black.svg')
            .attr('alt', 'Good for black')
    else if (posstatus == -2)
        $img.attr('src', '../img/ui/unclear.svg')
            .attr('alt', 'Unclear position')

    if (posvalue == 2) $img.attr('alt', 'Very ' + $img.attr('alt').toLowerCase())
    $img.attr('title', $img.attr('alt'))
}

exports.getSliderValue = function() {
    let $span = $('#sidebar .slider .inner span').eq(0)
    let value = parseFloat($span.get(0).style.top)
    let label = $span.text()

    return [value, label]
}

exports.setSliderValue = function(value, label) {
    $('#sidebar .slider .inner span').css('top', value + '%').text(label)
}

exports.getFindText = function() {
    return $('#find input').val()
}

exports.setFindText = function(text) {
    $('#find input').val(text)
}

exports.getIndicatorVertex = function() {
    return $('#indicator').data('vertex')
}

exports.setIndicatorVertex = function(vertex) {
    if (vertex) exports.showIndicator(vertex)
    else exports.hideIndicator()
}

exports.setPreferencesTab = function(tab) {
    $('#preferences .tabs')
        .find('.current')
        .removeClass('current')
        .parent()
        .find('.' + tab)
        .parent()
        .addClass('current')

    let $form = $('#preferences form')
    $form.attr('class', tab)

    if (tab == 'engines')
        $('#preferences .engines-list').data('scrollbar').update()
}

exports.getRepresentedFilename = function() {
    return $('body').data('representedfilename')
}

exports.setRepresentedFilename = function(filename) {
    $('body').data('representedfilename', filename)
    remote.getCurrentWindow().setRepresentedFilename(filename ? filename : '')
    exports.updateTitle()
}

exports.getShapes = function() {
    let shapes = $('body').data('shapes')

    if (!shapes) {
        shapes = boardmatcher.readShapes(__dirname + '/../data/shapes.sgf')
        $('body').data('shapes', shapes)
    }

    return shapes
}

exports.getCurrentMoveInterpretation = function() {
    let board = sabaki.getBoard()
    let [tree, index] = sabaki.getCurrentTreePosition()
    let node = tree.nodes[index]

    // Determine root node

    if (!tree.parent && index == 0) {
        let result = []

        if ('EV' in node) result.push(node.EV[0])
        if ('GN' in node) result.push(node.GN[0])

        result = result.filter(x => x.trim() != '').join(' — ')
        if (result != '')
            return result

        let today = new Date()
        if (today.getDate() == 25 && today.getMonth() == 3)
            return 'Happy Birthday, Sabaki!'
    }

    // Determine end of main variation

    if (gametree.onMainTrack(tree) && !gametree.navigate(tree, index, 1)) {
        let rootNode = sabaki.getRootTree().nodes[0]

        if ('RE' in rootNode && rootNode.RE[0].trim() != '')
            return 'Result: ' + rootNode.RE[0]
    }

    // Determine capture

    let ptp = gametree.navigate(tree, index, -1)

    if (ptp) {
        let prevBoard = ptp[0].nodes[ptp[1]].board

        if (!helper.equals(prevBoard.captures, board.captures))
            return 'Take'
    }

    // Get current vertex

    let vertex

    if ('B' in node && node.B[0] != '')
        vertex = sgf.point2vertex(node.B[0])
    else if ('W' in node && node.W[0] != '')
        vertex = sgf.point2vertex(node.W[0])
    else if ('W' in node || 'B' in node)
        return 'Pass'
    else
        return ''

    if (!board.hasVertex(vertex)) return 'Pass'

    let sign = board.arrangement[vertex]
    let neighbors = board.getNeighbors(vertex)

    // Check atari

    if (neighbors.some(v => board.arrangement[v] == -sign && board.getLiberties(v).length == 1))
        return 'Atari'

    // Check connection

    let friendly = neighbors.filter(v => board.arrangement[v] == sign)
    if (friendly.length == neighbors.length) return 'Fill'
    if (friendly.length >= 2) return 'Connect'

    // Match shape

    let shapes = exports.getShapes()

    for (let i = 0; i < shapes.length; i++) {
        if (boardmatcher.shapeMatch(shapes[i], board, vertex))
            return shapes[i].name
    }

    if (friendly.length == 1) return 'Stretch'

    // Determine position to edges

    if (vertex[0] == (board.width - 1) / 2 && vertex[1] == (board.height - 1) / 2)
        return 'Tengen'

    let diff = board.getCanonicalVertex(vertex).map(x => x + 1)

    if ((diff[0] != 4 || diff[1] != 4) && board.getHandicapPlacement(9).some(v => {
        return v[0] == vertex[0] && v[1] == vertex[1]
    })) return 'Hoshi'

    if (diff[1] <= 6)
        return diff.join('-') + ' point'

    return ''
}

/**
 * Preparation Methods
 */

exports.prepareScrollbars = function() {
    $('#properties').data('scrollbar', new GeminiScrollbar({
        element: $('#properties').get(0),
        createElements: false
    }).create())

    $('#console').data('scrollbar', new GeminiScrollbar({
        element: $('#console').get(0),
        createElements: false
    }).create())

    let $enginesList = $('#preferences .engines-list')
    $enginesList.data('scrollbar', new GeminiScrollbar({
        element: $enginesList.get(0),
        createElements: false
    }).create())

    let $gamesList = $('#gamechooser .games-list')
    $gamesList.data('scrollbar', new GeminiScrollbar({
        element: $gamesList.get(0),
        createElements: false
    }).create())

    $(window).on('resize', function() {
        if (!$('#gamechooser').hasClass('show')) return

        let width = $('#gamechooser .games-list').width() - 20
        let $svgs = $('#gamechooser ol li svg')

        if ($svgs.length == 0) $svgs = $('#gamechooser ol li')

        let svgWidth = $svgs.width() + 12 + 20
        let count = Math.floor(width / svgWidth)

        $('#gamechooser ol li').css('width', Math.floor(width / count) - 20)
        $('#gamechooser .games-list').data('scrollbar').update()
    })
}

exports.prepareResizers = function() {
    $('.verticalresizer').on('mousedown', function(evt) {
        if (evt.button != 0) return
        $(this).parent().data('initposx', [evt.screenX, parseFloat($(this).parent().css('width'))])
    })

    $('#sidebar .horizontalresizer').on('mousedown', function(evt) {
        if (evt.button != 0) return
        $('#sidebar').data('initposy', [evt.screenY, exports.getPropertiesHeight()])
        $('#properties').css('transition', 'none')
    })

    $('body').on('mouseup', function() {
        let sidebarInitPosX = $('#sidebar').data('initposx')
        let leftSidebarInitPosX = $('#leftsidebar').data('initposx')
        let initPosY = $('#sidebar').data('initposy')

        if (!sidebarInitPosX && !leftSidebarInitPosX && !initPosY) return

        if (sidebarInitPosX) {
            $('#sidebar').data('initposx', null)
            setting.set('view.sidebar_width', exports.getSidebarWidth())
        } else if (leftSidebarInitPosX) {
            $('#leftsidebar').data('initposx', null)
            setting.set('view.leftsidebar_width', exports.getLeftSidebarWidth())
            return
        } else if (initPosY) {
            $('#sidebar').data('initposy', null)
            $('#properties').css('transition', '')
            setting.set('view.properties_height', exports.getPropertiesHeight())
            exports.setSidebarArrangement(true, true, false)
        }

        if ($('#graph').data('sigma'))
            $('#graph').data('sigma').renderers[0].resize().render()
    }).on('mousemove', function(evt) {
        let sidebarInitPosX = $('#sidebar').data('initposx')
        let leftSidebarInitPosX = $('#leftsidebar').data('initposx')
        let initPosY = $('#sidebar').data('initposy')

        if (!sidebarInitPosX && !leftSidebarInitPosX && !initPosY) return

        if (sidebarInitPosX) {
            let [initX, initWidth] = sidebarInitPosX
            let newWidth = Math.max(initWidth - evt.screenX + initX, setting.get('view.sidebar_minwidth'))

            exports.setSidebarWidth(newWidth)
            exports.resizeBoard()
        } else if (leftSidebarInitPosX) {
            let [initX, initWidth] = leftSidebarInitPosX
            let newWidth = Math.max(initWidth + evt.screenX - initX, setting.get('view.leftsidebar_minwidth'))

            exports.setLeftSidebarWidth(newWidth)
            exports.resizeBoard()

            return
        } else if (initPosY) {
            let [initY, initHeight] = initPosY
            let newheight = Math.min(Math.max(
                initHeight + (initY - evt.screenY) * 100 / $('#sidebar').height(),
                setting.get('view.properties_minheight')
            ), 100 - setting.get('view.properties_minheight'))

            exports.setPropertiesHeight(newheight)
        }
    })
}

exports.prepareGameChooser = function() {
    let $scrollContainer = $([
        '#gamechooser .games-list.gm-prevented',
        '#gamechooser .games-list.gm-scrollbar-container .gm-scroll-view'
    ].join(', '))

    // Load SVG images on the fly

    let updateSVG = () => {
        let listBounds = $('#gamechooser').get(0).getBoundingClientRect()

        let updateElements = $('#gamechooser ol li').get().filter(el => {
            let bounds = el.getBoundingClientRect()

            return !$(el).find('svg').length
                && bounds.top < listBounds.bottom
                && bounds.top + $(el).height() > listBounds.top
        })

        updateElements.forEach(el => {
            let tree = $(el).data('gametree')
            let tp = gametree.navigate(tree, 0, 30)
            if (!tp) tp = gametree.navigate(tree, 0, gametree.getCurrentHeight(tree) - 1)

            let board = gametree.getBoard(...tp)
            let svg = board.getSvg(setting.get('gamechooser.thumbnail_size'))

            $(svg).insertAfter($(el).find('span').eq(0))
        })
    }

    $(window).on('resize', updateSVG)
    $scrollContainer.on('scroll', updateSVG)

    // Filtering

    $('#gamechooser > input').on('input', function() {
        let value = this.value

        $('#gamechooser .games-list li').get().forEach(li => {
            if ($(li).find('span').get().some(span => {
                return $(span).text().toLowerCase().indexOf(value.toLowerCase()) >= 0
            })) $(li).removeClass('hide')
            else $(li).addClass('hide')
        })

        let $gamesList = $('#gamechooser .games-list')
        $gamesList.data('scrollbar').update()
        $scrollContainer.scrollTop(0)

        updateSVG()
    })

    // Buttons

    $('#gamechooser button[name="add"]').on('click', () => exports.openAddGameMenu())
    $('#gamechooser button[name="close"]').on('click', () => exports.closeGameChooser())
}

exports.prepareIndicator = function() {
    $('#indicator').on('click', () => exports.hideIndicator())
}

/**
 * Methods
 */

exports.updateTitle = function() {
    let {basename} = require('path')
    let title = app.getName()
    let filename = exports.getRepresentedFilename()

    if (filename) title = basename(filename)
    if (sabaki.getGameTrees().length > 1) title += ' — Game ' + (sabaki.getGameIndex() + 1)
    if (filename && process.platform != 'darwin') title += ' — ' + app.getName()

    document.title = title
}

exports.addEngineItem = function(name = '', path = '', args = '') {
    let $ul = $('#preferences .engines-list ul').eq(0)
    let $li = $('<li/>').append(
        $('<h3/>')
        .append(
            $('<input/>')
            .attr('type', 'text')
            .attr('placeholder', '(Unnamed engine)')
            .val(name)
        )
    ).append(
        $('<p/>').append(
            $('<input/>')
            .attr('type', 'text')
            .attr('placeholder', 'Path')
            .val(path)
        ).append(
            $('<a class="browse"/>')
            .on('click', function() {
                let result = view.showOpenDialog({
                    properties: ['openFile'],
                    filters: [{name: 'All Files', extensions: ['*']}]
                })

                if (result) {
                    $(this).parents('li').eq(0)
                    .find('h3 + p input')
                    .val(result[0])
                    .get(0).focus()
                }
            })
            .append(
                $('<img/>')
                .attr('src', '../node_modules/octicons/build/svg/file-directory.svg')
                .attr('title', 'Browse…')
                .attr('height', 14)
            )
        )
    ).append(
        $('<p/>').append(
            $('<input/>')
            .attr('type', 'text')
            .attr('placeholder', 'No arguments')
            .val(args)
        )
    ).append(
        $('<a class="remove"/>').on('click', function() {
            $(this).parents('li').eq(0).remove()
            $('#preferences .engines-list').data('scrollbar').update()
        }).append(
            $('<img/>')
            .attr('src', '../node_modules/octicons/build/svg/x.svg')
            .attr('height', 14)
        )
    )

    $ul.append($li)
    $li.find('h3 input').get(0).focus()

    let enginesScrollbar = $('#preferences .engines-list').data('scrollbar')
    if (enginesScrollbar) enginesScrollbar.update()
}

exports.showMessageBox = function(message, type = 'info', buttons = ['OK'], cancelId = 0) {
    exports.setIsBusy(true)

    let result = dialog.showMessageBox(remote.getCurrentWindow(), {
        type,
        buttons,
        title: app.getName(),
        message,
        cancelId,
        noLink: true
    })

    exports.setIsBusy(false)
    return result
}

let showOpenSaveDialog = (type, options) => {
    exports.setIsBusy(true)
    ipcRenderer.send('build-menu', true)

    type = type[0].toUpperCase() + type.slice(1).toLowerCase()
    let result = dialog[`show${type}Dialog`](remote.getCurrentWindow(), options)

    ipcRenderer.send('build-menu')
    exports.setIsBusy(false)
    return result
}

exports.showOpenDialog = options => showOpenSaveDialog('open', options)

exports.showSaveDialog = options => showOpenSaveDialog('save', options)

exports.readjustShifts = function(vertex) {
    let $li = $('#goban .pos_' + vertex.join('-'))
    let direction = $li.attr('class').split(' ')
        .filter(x => x.indexOf('shift_') == 0)
        .map(x => +x.replace('shift_', ''))

    if (direction.length == 0) return
    direction = direction[0]

    let query, removeShifts

    if (direction == 1 || direction == 5 || direction == 8) {
        // Left
        query = (vertex[0] - 1) + '-' + vertex[1]
        removeShifts = [3, 7, 6]
    } else if (direction == 2 || direction == 5 || direction == 6) {
        // Top
        query = vertex[0] + '-' + (vertex[1] - 1)
        removeShifts = [4, 7, 8]
    } else if (direction == 3 || direction == 7 || direction == 6) {
        // Right
        query = (vertex[0] + 1) + '-' + vertex[1]
        removeShifts = [1, 5, 8]
    } else if (direction == 4 || direction == 7 || direction == 8) {
        // Bottom
        query = vertex[0] + '-' + (vertex[1] + 1)
        removeShifts = [2, 5, 6]
    }

    if (query && removeShifts) {
        let $el = $('#goban .pos_' + query)
        $el.addClass('animate')
        removeShifts.forEach(s => $el.removeClass('shift_' + s))
        setTimeout(() => $el.removeClass('animate'), 200)
    }
}

exports.buildBoard = function() {
    let board = sabaki.getBoard()
    let rows = []
    let hoshi = board.getHandicapPlacement(9)

    for (let y = 0; y < board.height; y++) {
        let $ol = $('<ol class="row"/>')

        for (let x = 0; x < board.width; x++) {
            let vertex = [x, y]
            let $img = $('<img/>').attr('src', '../img/goban/stone_0.svg')
            let $li = $('<li/>')
                .data('vertex', vertex)
                .addClass('pos_' + x + '-' + y)
                .addClass('shift_' + Math.floor(Math.random() * 9))
                .addClass('random_' + Math.floor(Math.random() * 5))

            if (hoshi.some(v => helper.equals(v, vertex)))
                $li.addClass('hoshi')

            let getEndTargetVertex = evt => {
                let endTarget = document.elementFromPoint(
                    evt.touches[0].pageX,
                    evt.touches[0].pageY
                )

                if (!endTarget) return null
                let v = $(endTarget).data('vertex')
                if (!v) endTarget = $(endTarget).parents('li').get(0)
                if (endTarget) v = $(endTarget).data('vertex')

                return v
            }

            $ol.append(
                $li.append(
                    $('<div class="stone"/>').append($img).append($('<span/>'))
                )
                .on('mouseup', function(evt) {
                    if (!$('#goban').data('mousedown')) return

                    $('#goban').data('mousedown', false)
                    sabaki.vertexClicked(this, evt.button, evt.ctrlKey)
                }.bind(vertex))
                .on('touchend', function(evt) {
                    if (!exports.getEditMode()
                    || ['line', 'arrow'].indexOf(sabaki.getSelectedTool()) < 0)
                        return

                    evt.preventDefault()
                    sabaki.vertexClicked(null, 0)
                })
                .on('mousemove', function(evt) {
                    if (!$('#goban').data('mousedown')) return
                    if (evt.button != 0) return

                    sabaki.drawLine(this)
                }.bind(vertex))
                .on('touchmove', function(evt) {
                    e.preventDefault()
                    sabaki.drawLine(getEndTargetVertex(evt))
                })
                .on('mousedown', function() {
                    $('#goban').data('mousedown', true)
                })
                .append($('<div class="paint"/>'))
            )
        }

        rows.push($ol)
    }

    let alpha = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'
    let $coordx = $('<ol class="coordx"/>')
    let $coordy = $('<ol class="coordy"/>')

    for (let i = 0; i < board.width; i++) {
        $coordx.append($('<li/>').text(alpha[i]))
    }

    for (let i = board.height; i > 0; i--) {
        $coordy.append($('<li/>').text(i))
    }

    let $goban = $('#goban div').eq(0)
    $goban.empty().append(rows).append($coordx).append($coordy)
    $goban.prepend($coordx.clone()).prepend($coordy.clone())

    $goban.off('mousemove').on('mousemove', function(evt) {
        $('#goban').toggleClass('crosshair', exports.getEditMode() && evt.ctrlKey)
    })

    exports.resizeBoard()

    // Readjust shifts

    $('#goban .row li:not(.shift_0)').get().forEach(li => exports.readjustShifts($(li).data('vertex')))
}

exports.updateBoardLines = function() {
    let tx = parseFloat($('#goban').css('border-left-width'))
    let ty = parseFloat($('#goban').css('border-top-width'))

    $('#goban hr').get().forEach(line => {
        let v1 = $(line).data('v1'), v2 = $(line).data('v2')
        let mirrored = v2[0] < v1[0]
        let $li1 = $('#goban .pos_' + v1.join('-'))
        let $li2 = $('#goban .pos_' + v2.join('-'))
        let pos1 = $li1.position(), pos2 = $li2.position()
        let dy = pos2.top - pos1.top, dx = pos2.left - pos1.left

        let angle = Math.atan2(dy, dx) * 180 / Math.PI
        if (mirrored) angle += 180
        let length = Math.sqrt(dx * dx + dy * dy)

        $(line).css({
            top: (pos1.top + $li1.height() / 2 + pos2.top + $li2.height() / 2) / 2 + ty + 'px',
            left: (pos1.left + $li1.width() / 2 + pos2.left + $li2.width() / 2) / 2 + tx + 'px',
            marginLeft: -length / 2 + 'px',
            width: length + 'px',
            transform: 'rotate(' + angle + 'deg)'
        })
    })
}

exports.resizeBoard = function() {
    let board = sabaki.getBoard()
    if (!board) return

    let $main = $('main')
    let $goban = $('#goban')

    $main.css('width', '').css('height', '')
    let outerWidth = Math.round($main.width())
    let outerHeight = Math.round($main.height())

    if (outerWidth % 2 != 0) outerWidth++
    if (outerHeight % 2 != 0) outerHeight++
    $main.css('width', outerWidth).css('height', outerHeight)

    let boardWidth = board.width
    let boardHeight = board.height
    let width = helper.floorEven(outerWidth - parseFloat($goban.css('padding-left'))
        - parseFloat($goban.css('padding-right'))
        - parseFloat($goban.css('border-left-width'))
        - parseFloat($goban.css('border-right-width')))
    let height = helper.floorEven(outerHeight - parseFloat($goban.css('padding-top'))
        - parseFloat($goban.css('padding-bottom'))
        - parseFloat($goban.css('border-top-width'))
        - parseFloat($goban.css('border-bottom-width')))

    if (exports.getShowCoordinates()) {
        boardWidth += 2
        boardHeight += 2
    }

    let fieldsize = helper.floorEven(Math.min(width / boardWidth, height / boardHeight, 150))
    let minX = fieldsize * boardWidth
    let minY = fieldsize * boardHeight

    $goban.css('width', minX + outerWidth - width)
        .css('height', minY + outerHeight - height)
        .css('margin-left', -(minX + outerWidth - width) / 2 + 'px')
        .css('margin-top', -(minY + outerHeight - height) / 2 + 'px')
    $goban.children('div').css('width', minX).css('height', minY)
        .css('margin-left', -minX / 2 + 'px').css('margin-top', -minY / 2 + 'px')

    $goban.find('.row, .coordx')
        .css('height', fieldsize).css('line-height', fieldsize + 'px')
        .css('margin-left', exports.getShowCoordinates() ? fieldsize : 0)

    $goban.find('.coordy')
        .css('width', fieldsize).css('top', fieldsize).css('line-height', fieldsize + 'px')
        .last()
        .css('left', fieldsize * (board.width + 1))

    $goban.find('li').css('width', fieldsize).css('height', fieldsize)
    $goban.css('font-size', fieldsize)

    exports.setSliderValue(...exports.getSliderValue())
    if (exports.getIndicatorVertex()) exports.showIndicator(exports.getIndicatorVertex())

    exports.updateBoardLines()
}

exports.showIndicator = function(vertex) {
    let $li = $('#goban .pos_' + vertex.join('-'))
    if ($li.length == 0) return

    $('#indicator').css('top', Math.round($li.offset().top))
    .css('left', Math.round($li.offset().left))
    .css('height', Math.round($li.height()))
    .css('width', Math.round($li.width()))
    .data('vertex', vertex)
}

exports.hideIndicator = function() {
    $('#indicator')
    .css('top', '')
    .css('left', '')
    .data('vertex', null)
}

exports.clearConsole = function() {
    $('#console .inner pre, #console .inner form:not(:last-child)').remove()
    $('#console .inner form:last-child input').eq(0).val('').get(0).focus()
    $('#console').data('scrollbar').update()
}

exports.wireLinks = function($container) {
    $container.find('a').on('click', function(evt) {
        if ($(this).hasClass('external'))  {
            if (!shell) {
                this.target = '_blank'
                return true
            }

            evt.preventDefault()
            shell.openExternal(this.href)
        } else if ($(this).hasClass('movenumber')) {
            evt.preventDefault()

            let movenumber = +$(this).text().slice(1)
            sabaki.setUndoable(true, 'Go Back')
            sabaki.goToMainVariation()

            let tp = gametree.navigate(sabaki.getRootTree(), 0, movenumber)
            if (tp) sabaki.setCurrentTreePosition(...tp, true, true)
        }
    })

    $container.find('.coord').on('mouseenter', function() {
        let v = sabaki.getBoard().coord2vertex($(this).text())
        exports.showIndicator(v)
    }).on('mouseleave', function() {
        if (!exports.getFindMode()) exports.hideIndicator()
    })
}

/**
 * Menu Methods
 */

exports.openHeaderMenu = function() {
    let template = [
        {
            label: '&Pass',
            click: () => sabaki.makeMove([-1, -1])
        },
        {
            label: '&Resign',
            click: () => sabaki.makeResign()
        },
        { type: 'separator' },
        {
            label: '&Score',
            click: () => exports.setScoringMode(true)
        },
        {
            label: 'Es&timate',
            click: () => exports.setEstimatorMode(true)
        },
        {
            label: '&Edit',
            click: () => exports.setEditMode(true)
        },
        {
            label: '&Find',
            click: () => exports.setFindMode(true)
        },
        { type: 'separator' },
        {
            label: '&Info',
            click: () => exports.showGameInfo()
        }
    ]

    let menu = Menu.buildFromTemplate(template)
    menu.popup(
        remote.getCurrentWindow(),
        Math.round($('#headermenu').offset().left),
        Math.round($('header').offset().top)
    )
}

exports.openCommentMenu = function() {
    let tp = sabaki.getCurrentTreePosition()
    let node = tp[0].nodes[tp[1]]

    let clearProperties = properties => properties.forEach(p => delete node[p])
    let clearPosAnnotations = () => clearProperties(['UC', 'GW', 'DM', 'GB'])
    let clearMoveAnnotations = () => clearProperties(['BM', 'TE', 'DO', 'IT'])
    let clearHotspot = () => clearProperties(['HO'])

    let template = [
        {
            label: '&Clear Annotations',
            click: () => {
                clearPosAnnotations()
                clearMoveAnnotations()
                sabaki.updateSidebar(true, true)
            }
        },
        {type: 'separator'},
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
        template.push(
            {type: 'separator'},
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
        )
    }

    template.push(
        {type: 'separator'},
        {
            label: '&Hotspot',
            type: 'checkbox',
            data: ['HO', clearHotspot, 1]
        }
    )

    template.forEach(item => {
        if (!('data' in item)) return

        let [p, clear, value] = item.data
        delete item.data

        item.checked = p in node
        item.click = () => {
            if (p in node) {
                clear()
            } else {
                clear()
                node[p] = [value]
            }

            sabaki.setCurrentTreePosition(...sabaki.getCurrentTreePosition(), true, true)
        }
    })

    let menu = Menu.buildFromTemplate(template)
    let $el = $('#properties .edit .header img')

    menu.popup(
        remote.getCurrentWindow(),
        Math.round($el.offset().left),
        Math.round($el.offset().top + $el.height())
    )
}

exports.openEnginesMenu = function($element, callback = () => {}) {
    let currentIndex = $element.data('engineindex')
    if (currentIndex == null) currentIndex = -1

    let template = [{
        label: '&Manual',
        type: 'checkbox',
        checked: currentIndex < 0,
        click: () => callback(null, -1)
    }]

    let engineItems = setting.getEngines().map((engine, i) => {
        return {
            label: engine.name,
            type: 'checkbox',
            checked: currentIndex == i,
            click: () => callback(engine, i)
        }
    })

    if (engineItems.length > 0) {
        template.push({type: 'separator'})
        template.push(...engineItems)
    }

    template.push({type: 'separator'})
    template.push({
        label: 'Manage &Engines…',
        click: () => {
            exports.showPreferences()
            exports.setPreferencesTab('engines')
        }
    })

    let menu = Menu.buildFromTemplate(template)
    menu.popup(
        remote.getCurrentWindow(),
        Math.round($element.offset().left),
        Math.round($element.offset().top + $element.height())
    )
}

exports.openNodeMenu = function(tree, index, position) {
    if (exports.getScoringMode()) return

    let template = [
        {
            label: 'Make &Main Variation',
            click: () => sabaki.makeMainVariation(tree, index)
        },
        {
            label: '&Remove',
            click: () => sabaki.removeNode(tree, index)
        }
    ]

    let menu = Menu.buildFromTemplate(template)
    menu.popup(remote.getCurrentWindow(), ...position)
}

exports.openGameMenu = function($element, position) {
    let template = [
        {
            label: '&Remove Game',
            click: () => {
                let trees = sabaki.getGameTrees()

                if (exports.showMessageBox(
                    'Do you really want to remove this game permanently?',
                    'warning',
                    ['Remove Game', 'Cancel'], 1
                ) == 1) return

                let index = $element.parents('ol').eq(0)
                    .find('li div').get()
                    .indexOf($element.get(0))

                trees.splice(index, 1)
                sabaki.setGameTrees(trees)

                if (trees.length == 0) {
                    trees.push(sabaki.getEmptyGameTree())
                    sabaki.setGameIndex(0)
                    exports.closeGameChooser()
                } else {
                    sabaki.setGameIndex(0)
                    exports.showGameChooser(true)
                }
            }
        },
        {
            label: 'Remove &Other Games',
            click: () => {
                if (exports.showMessageBox(
                    'Do you really want to remove all other games permanently?',
                    'warning',
                    ['Remove Games', 'Cancel'], 1
                ) == 1) return

                sabaki.setGameTrees([$element.parents('li').eq(0).data('gametree')])
                sabaki.setGameIndex(0)
                exports.showGameChooser(true)
            }
        }
    ]

    let menu = Menu.buildFromTemplate(template)
    menu.popup(remote.getCurrentWindow(), ...position)
}

exports.openAddGameMenu = function() {
    let template = [
        {
            label: 'Add &New Game',
            click: () => {
                let tree = sabaki.getEmptyGameTree()

                sabaki.setGameTrees([...sabaki.getGameTrees(), tree])
                sabaki.setGameIndex(sabaki.getGameTrees().length - 1)
                exports.showGameChooser('bottom')
            }
        },
        {
            label: 'Add &Existing File…',
            click: () => {
                exports.setIsBusy(true)

                let filenames = dialog.showOpenDialog(remote.getCurrentWindow(), {
                    properties: ['openFile', 'multiSelections'],
                    filters: [sgf.meta, {name: 'All Files', extensions: ['*']}]
                })

                if (filenames) {
                    filenames.forEach(filename => {
                        let trees = sgf.parseFile(filename).subtrees

                        sabaki.setGameTrees([...sabaki.getGameTrees(), ...trees])
                        sabaki.setGameIndex(sabaki.getGameIndex())
                        exports.showGameChooser('bottom')
                    })
                }

                exports.setIsBusy(false)
            }
        }
    ]

    let menu = Menu.buildFromTemplate(template)
    let $button = $('#gamechooser').find('button[name="add"]')
    menu.popup(
        remote.getCurrentWindow(),
        Math.round($button.offset().left),
        Math.round($button.offset().top + $button.height())
    )
}

/**
 * Bar Mode Methods
 */

exports.getPlayMode = function() {
    return !exports.getFindMode()
        && !exports.getEditMode()
        && !exports.getGuessMode()
        && !exports.getAutoplayMode()
        && !exports.getScoringMode()
        && !exports.getEstimatorMode()
}

exports.getFindMode = function() {
    return $('body').hasClass('find')
}

exports.setFindMode = function(mode) {
    if (mode) {
        if (mode != exports.getFindMode()) exports.closeDrawers()
        $('body').addClass('find')

        let input = $('#find input').get(0)
        input.focus()
        input.select()
    } else {
        exports.hideIndicator()
        $('body').removeClass('find')
        document.activeElement.blur()
    }
}

exports.getEditMode = function() {
    return $('body').hasClass('edit')
}

exports.setEditMode = function(mode) {
    if (mode) {
        exports.closeDrawers()
        $('body').addClass('edit')

        $('#properties textarea').eq(0).scrollTop(0)
    } else {
        $('#goban').data('edittool-data', null)
        $('body').removeClass('edit')
    }
}

exports.getGuessMode = function() {
    return $('body').hasClass('guess')
}

exports.setGuessMode = function(mode) {
    if (mode) {
        exports.closeDrawers()
        $('body').addClass('guess')
    } else {
        $('body').removeClass('guess')
    }
}

exports.getAutoplayMode = function() {
    return $('body').hasClass('autoplay')
}

exports.setAutoplayMode = function(mode) {
    if (mode) {
        exports.closeDrawers()
        $('#autoplay input').val(+setting.get('autoplay.sec_per_move'))
        $('body').addClass('autoplay')
    } else {
        $('body').removeClass('autoplay')
        sabaki.setAutoplaying(false)
    }
}

exports.getScoringMode = function() {
    return $('body').hasClass('scoring')
}

exports.setScoringMode = function(mode, estimator) {
    let type = estimator ? 'estimator' : 'scoring'

    if (mode) {
        // Clean board
        $('#goban .row li')
        .removeClass('area_-1')
        .removeClass('area_0')
        .removeClass('area_1')
        .removeClass('dead')

        exports.closeDrawers()
        $('body').addClass(type)

        let deadstones = estimator ? sabaki.getBoard().guessDeadStones() : sabaki.getBoard().determineDeadStones()
        deadstones.forEach(v => $('#goban .pos_' + v.join('-')).addClass('dead'))

        sabaki.updateAreaMap(estimator)
    } else {
        $('body').removeClass(type)
    }
}

exports.getEstimatorMode = function() {
    return $('body').hasClass('estimator')
}

exports.setEstimatorMode = function(mode) {
    exports.setScoringMode(mode, true)
}

/**
 * Drawers
 */

exports.showGameInfo = function() {
    exports.closeDrawers()

    let tree = sabaki.getRootTree()
    let rootNode = tree.nodes[0]
    let $info = $('#info')
    let data = {
        'rank_1': 'BR',
        'rank_-1': 'WR',
        'name': 'GN',
        'event': 'EV',
        'date': 'DT',
        'result': 'RE'
    }

    $info.addClass('show').find('input[name="name_1"]').get(0).focus()

    for (let key in data) {
        let value = data[key]
        $info.find('input[name="' + key + '"]').val(value in rootNode ? rootNode[value][0] : '')
    }

    $info.find('input[name="name_1"]').val(gametree.getPlayerName(tree, 1))
    $info.find('input[name="name_-1"]').val(gametree.getPlayerName(tree, -1))
    $info.find('input[name="komi"]').val('KM' in rootNode ? +rootNode.KM[0] : '')
    $info.find('input[name="size-width"]').val(sabaki.getBoard().width)
    $info.find('input[name="size-height"]').val(sabaki.getBoard().height)
    $info.find('section .menu').removeClass('active').data('engineindex', -1)

    let handicap = $info.find('select[name="handicap"]').get(0)
    if ('HA' in rootNode) handicap.selectedIndex = Math.max(0, +rootNode.HA[0] - 1)
    else handicap.selectedIndex = 0

    let disabled = tree.nodes.length > 1
        || tree.subtrees.length > 0
        || ['AB', 'AW', 'W', 'B'].some(x => x in rootNode)

    $info.find('input[name^="size-"]').add(handicap).prop('disabled', disabled)
    $info.toggleClass('disabled', disabled)
}

exports.closeGameInfo = function() {
    $('#info').removeClass('show')
    document.activeElement.blur()
}

exports.showScore = function() {
    let board = $('#goban').data('finalboard')
    let score = board.getScore($('#goban').data('areamap'))
    let rootNode = sabaki.getRootTree().nodes[0]

    for (let sign = -1; sign <= 1; sign += 2) {
        let $tr = $('#score tbody tr' + (sign < 0 ? ':last-child' : ''))
        let $tds = $tr.find('td')

        $tds.eq(0).text(score['area_' + sign])
        $tds.eq(1).text(score['territory_' + sign])
        $tds.eq(2).text(score['captures_' + sign])
        if (sign < 0) $tds.eq(3).text(sabaki.getKomi())
        $tds.eq(4).text(0)

        sabaki.setScoringMethod(setting.get('scoring.method'))
    }

    $('#score').addClass('show')
}

exports.closeScore = function() {
    $('#score').removeClass('show')
}

exports.showPreferences = function() {
    // Load preferences

    $('#preferences input[type="checkbox"]').get()
        .forEach(el => el.checked = !!setting.get(el.name))

    sabaki.loadEngines()

    // Show preferences

    exports.setPreferencesTab('general')
    exports.closeDrawers()
    $('#preferences').addClass('show')
}

exports.closePreferences = function() {
    $('#preferences').removeClass('show')
    document.activeElement.blur()
}

exports.showGameChooser = function(restoreScrollbarPos = true) {
    let $scrollContainer = $([
        '#gamechooser .games-list.gm-prevented',
        '#gamechooser .games-list.gm-scrollbar-container .gm-scroll-view'
    ].join(', '))

    let scrollbarPos = restoreScrollbarPos ? $scrollContainer.scrollTop() : 0

    if (!restoreScrollbarPos || restoreScrollbarPos == 'top')
        scrollbarPos = 0
    else if (restoreScrollbarPos == 'bottom')
        scrollbarPos = $scrollContainer.get(0).scrollHeight

    exports.closeDrawers()

    $('#gamechooser > input').eq(0).val('').get(0).focus()
    $('#gamechooser ol').eq(0).empty()

    let trees = sabaki.getGameTrees()
    let currentTree = sabaki.getRootTree()

    for (let i = 0; i < trees.length; i++) {
        let tree = trees[i]
        let $li = $('<li/>')
        let node = tree.nodes[0]

        $('#gamechooser ol').eq(0).append($li.append(
            $('<div/>')
            .attr('draggable', 'true')
            .append($('<span/>'))
            .append($('<span class="black"/>').text('Black'))
            .append($('<span class="white"/>').text('White'))
        ))

        let $gamename = $li.find('span').eq(0)
        let $black = $li.find('.black').text(gametree.getPlayerName(tree, 1, 'Black'))
        let $white = $li.find('.white').text(gametree.getPlayerName(tree, -1, 'White'))

        if ('BR' in node) $black.attr('title', node.BR[0])
        if ('WR' in node) $white.attr('title', node.WR[0])
        if ('GN' in node) $gamename.text(node.GN[0]).attr('title', node.GN[0])
        else if ('EV' in node) $gamename.text(node.EV[0]).attr('title', node.EV[0])

        $li.data('gametree', tree).find('div').on('click', function() {
            let link = this
            exports.closeGameChooser()
            setTimeout(() => {
                sabaki.setGameIndex($('#gamechooser ol li div').get().indexOf(link))
            }, 500)
        }).on('mouseup', function(evt) {
            if (evt.button != 2) return
            let pos = [evt.clientX, evt.clientY]
            exports.openGameMenu($(this), pos.map(x => Math.round(x)))
        }).on('dragstart', function() {
            $('#gamechooser').data('dragging', $(this).parents('li').get(0))
        })
    }

    $('#gamechooser ol li').off('dragover').on('dragover', function(evt) {
        evt.preventDefault()
        if (!$('#gamechooser').data('dragging')) return

        let x = evt.clientX
        let middle = $(this).offset().left + $(this).width() / 2

        if (x <= middle - 10 && !$(this).hasClass('insertleft')) {
            $('#gamechooser ol li').removeClass('insertleft').removeClass('insertright')
            $(this).addClass('insertleft')
        } else if (x > middle + 10 && !$(this).hasClass('insertright')) {
            $('#gamechooser ol li').removeClass('insertleft').removeClass('insertright')
            $(this).addClass('insertright')
        }
    })

    $('#gamechooser').off('dragover').off('drop').on('dragover', function(evt) {
        evt.preventDefault()
    }).on('drop', function() {
        let dragged = $(this).data('dragging')
        $(this).data('dragging', null)

        let $lis = $('#gamechooser ol li')
        let afterli = $lis.get().filter(x => $(x).hasClass('insertleft'))[0]
        let beforeli = $lis.get().filter(x => $(x).hasClass('insertright'))[0]
        $lis.removeClass('insertleft').removeClass('insertright')

        if (!dragged || !afterli && !beforeli) return

        if (afterli && afterli != dragged) $(afterli).before(dragged)
        if (beforeli && beforeli != dragged) $(beforeli).after(dragged)

        sabaki.setGameTrees($('#gamechooser ol > li').get().map(x => $(x).data('gametree')))

        let newindex = sabaki.getGameTrees().indexOf(currentTree)
        sabaki.setGameIndex(newindex)
    })

    $('#gamechooser').addClass('show')
    $(window).trigger('resize')
    $scrollContainer.scrollTop(scrollbarPos)
}

exports.closeGameChooser = function() {
    $('#gamechooser').removeClass('show')
    document.activeElement.blur()
}

exports.closeDrawers = function() {
    let drawersOpen = $('.drawer.show').length > 0
    let modeOpen = $('#bar .bar').get()
        .map(x => $(x).attr('id'))
        .some(x => $('body').hasClass(x))

    exports.closeGameInfo()
    exports.closeScore()
    exports.closePreferences()
    exports.closeGameChooser()
    exports.setEditMode(false)
    exports.setScoringMode(false)
    exports.setEstimatorMode(false)
    exports.setFindMode(false)
    exports.setGuessMode(false)
    exports.setAutoplayMode(false)

    return modeOpen || drawersOpen
}

/**
 * Main
 */

$(document).ready(function() {
    document.title = app.getName()

    $('body').on('mouseup', function() {
        $('#goban').data('mousedown', false)
    })

    exports.prepareScrollbars()
    exports.prepareResizers()
    exports.prepareGameChooser()
    exports.prepareIndicator()
})
