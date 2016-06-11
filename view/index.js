var fs = require('fs')
var process = require('process')
var remote = require('electron').remote
var ipcRenderer = require('electron').ipcRenderer
var clipboard = require('electron').clipboard
var shell = require('electron').shell
var app = remote.app
var dialog = remote.dialog

var $ = require('../modules/sprint')
var sgf = require('../modules/sgf')
var boardmatcher = require('../modules/boardmatcher')
var fuzzyfinder = require('../modules/fuzzyfinder')
var gametree = require('../modules/gametree')
var sound = require('../modules/sound')
var helper = require('../modules/helper')
var setting = require('../modules/setting')
var gtp = require('../modules/gtp')

var Pikaday = require('pikaday')
var GeminiScrollbar = require('gemini-scrollbar')
var Board = require('../modules/board')
var Menu = remote.Menu
var MenuItem = remote.MenuItem

/**
 * Getter & setter
 */

function getGameTrees() {
    var trees = $('body').data('gametrees')
    return trees ? trees : [getRootTree()]
}

function setGameTrees(trees) {
    trees.forEach(function(tree) { tree.parent = null })
    $('body').data('gametrees', trees)
}

function getGameIndex() {
    return getGameTrees().length == 1 ? 0 : $('body').data('gameindex')
}

function setGameIndex(index) {
    var trees = getGameTrees()
    $('body').data('gameindex', index)

    setGameTrees(trees)
    setRootTree(trees[index])
    updateTitle()
    setUndoable(false)
    if (setting.get('game.goto_end_after_loading')) goToEnd()
}

function getRootTree() {
    if (!getCurrentTreePosition()) return null
    return getGameTrees()[getGameIndex()]
}

function setRootTree(tree) {
    if (tree.nodes.length == 0) return

    var trees = getGameTrees()
    trees[getGameIndex()] = tree
    setGameTrees(trees)

    tree.parent = null
    setCurrentTreePosition(gametree.addBoard(tree), 0, true)

    setPlayerName(1,
        gametree.getPlayerName(1, tree, 'Black'),
        'BR' in tree.nodes[0] ? tree.nodes[0].BR[0] : ''
    )
    setPlayerName(-1,
        gametree.getPlayerName(-1, tree, 'White'),
        'WR' in tree.nodes[0] ? tree.nodes[0].WR[0] : ''
    )
}

function getFileHash() {
    return $('body').data('filehash')
}

function getGraphMatrixDict() {
    return $('#graph').data('graphmatrixdict')
}

function setGraphMatrixDict(matrixdict) {
    if (!getShowSidebar()) return

    var s, graph

    try {
        s = $('#graph').data('sigma')
        graph = gametree.matrixdict2graph(matrixdict)
    } catch(e) { }

    try {
        if (s && graph) {
            s.graph.clear()
            s.graph.read(graph)
        }
    } catch(e) {
        setGraphMatrixDict(matrixdict)
    }

    $('#graph').data('graphmatrixdict', matrixdict)
}

function getCurrentTreePosition() {
    return $('#goban').data('position')
}

function setCurrentTreePosition(tree, index, now, redraw) {
    if (!tree || getScoringMode() || getEstimatorMode()) return

    // Remove old graph node color

    var oldNode = getCurrentGraphNode()
    var oldPos = getCurrentTreePosition()
    var node = getGraphNode(tree, index)

    if (oldNode && oldNode != node)
        oldNode.color = oldNode.originalColor

    // Store new position

    $('#goban').data('position', [tree, index])
    redraw = !!redraw
        || !node
        || !gametree.onCurrentTrack(tree)
        || tree.collapsed

    var t = tree
    t.collapsed = false
    while (t.parent && t.parent.collapsed) {
        redraw = true
        t.parent.collapsed = false
        t = t.parent
    }

    // Update bookmark, graph, slider and comment text

    updateSidebar(redraw, now)
    setShowHotspot('HO' in tree.nodes[index])
    gametree.addBoard(tree, index)
    setBoard(tree.nodes[index].board)

    // Determine current player

    var currentplayer = 1

    if ('B' in tree.nodes[index]
    || 'PL' in tree.nodes[index] && tree.nodes[index].PL[0] == 'W'
    || 'HA' in tree.nodes[index] && +tree.nodes[index].HA[0] >= 1)
        currentplayer = -1

    setCurrentPlayer(currentplayer)
}

function getCurrentGraphNode() {
    var pos = getCurrentTreePosition()
    if (!pos) return null
    return getGraphNode(pos[0], pos[1])
}

function getGraphNode(tree, index) {
    var id = typeof tree === 'object' ? tree.id + '-' + index : tree
    var s = $('#graph').data('sigma')
    return s.graph.nodes(id)
}

function getSelectedTool() {
    var $li = $('#edit .selected')
    var tool = $li.attr('class').replace('selected', '').replace('-tool', '').trim()

    if (tool == 'stone') {
        return $li.find('img').attr('src').indexOf('_1') != -1 ? 'stone_1' : 'stone_-1'
    } else if (tool == 'line') {
        return $li.find('img').attr('src').indexOf('line') != -1 ? 'line' : 'arrow'
    } else {
        return tool
    }
}

function setSelectedTool(tool) {
    if (!getEditMode()) {
        setEditMode(true)
        if (getSelectedTool().indexOf(tool) != -1) return
    }

    $('#goban').data('edittool-data', null)
    $('#edit .' + tool + '-tool a').trigger('click')
}

function getBoard() {
    return $('#goban').data('board')
}

function setBoard(board) {
    if (!getBoard() || getBoard().width != board.width || getBoard().height != board.height) {
        $('#goban').data('board', board)
        buildBoard()
    }

    $('#goban').data('board', board)
    setCaptures(board.captures)

    for (var x = 0; x < board.width; x++) {
        for (var y = 0; y < board.height; y++) {
            var $li = $('#goban .pos_' + x + '-' + y)
            var $span = $li.find('.stone span')
            var sign = board.arrangement[[x, y]]
            var types = ['ghost_1', 'ghost_-1', 'siblingghost_1', 'siblingghost_-1',
                'circle', 'triangle', 'cross', 'square', 'label', 'point',
                'dimmed', 'paint_1', 'paint_-1']

            // Clean up

            types.forEach(function(x) {
                if ($li.hasClass(x)) $li.removeClass(x)
            })

            $span.attr('title', '')

            // Add markups

            if ([x, y] in board.markups) {
                var markup = board.markups[[x, y]]
                var type = markup[0], label = markup[1]

                if (type != '') $li.addClass(type)
                if (label != '') $span.attr('title', label)
                $li.toggleClass('smalllabel', label.length >= 3)
            }

            // Set stone image

            if ($li.hasClass('sign_' + sign)) continue

            for (var i = -1; i <= 1; i++) {
                if ($li.hasClass('sign_' + i)) $li.removeClass('sign_' + i)
            }

            $li.addClass('sign_' + sign)
        }
    }

    // Add ghosts

    board.ghosts.forEach(function(x) {
        var v = x[0], s = x[1], type = x[2]
        var $li = $('#goban .pos_' + v.join('-'))

        if (type == 'child') $li.addClass('ghost_' + s)
        else if (type == 'sibling') $li.addClass('siblingghost_' + s)
    })

    // Add lines

    $('#goban hr').remove()

    board.lines.forEach(function(line) {
        $('#goban').append(
            $('<hr/>')
            .addClass(line[2] ? 'arrow' : 'line')
            .data('v1', line[0])
            .data('v2', line[1])
        )
    })

    updateBoardLines()
}

function getScoringMethod() {
    return $('#score .tabs .territory').hasClass('current') ? 'territory' : 'area'
}

function setScoringMethod(method) {
    $('#score .tabs li').removeClass('current')
    $('#score .tabs .' + method).addClass('current')
    $('#score tr > *').addClass('disabled')
    $('#score table .' + method).removeClass('disabled')

    setting.set('scoring.method', method)

    // Update UI

    for (var sign = -1; sign <= 1; sign += 2) {
        var $tr = $('#score tbody tr' + (sign < 0 ? ':last-child' : ''))
        var $tds = $tr.find('td')

        $tds.eq(4).text(0)

        for (var i = 0; i <= 3; i++) {
            if ($tds.eq(i).hasClass('disabled') || isNaN(+$tds.eq(i).text())) continue
            $tds.eq(4).text(+$tds.eq(4).text() + +$tds.eq(i).text())
        }
    }

    var results = $('#score tbody td:last-child').get().map(function(td) { return $(td).text() })
    var diff = +results[0] - +results[1]
    var result = diff > 0 ? 'B+' :  diff < 0 ? 'W+' : 'Draw'
    if (diff != 0) result = result + Math.abs(diff)

    $('#score .result').text(result)
}

function getKomi() {
    var rootNode = getRootTree().nodes[0]
    return 'KM' in rootNode ? +rootNode.KM[0] : 0
}

function getEngineName() {
    return $('#console').data('enginename')
}

function getEngineController() {
    return $('#console').data('controller')
}

function getEngineCommands() {
    return $('#console').data('commands')
}

function setUndoable(undoable, tooltip) {
    if (undoable) {
        var rootTree = gametree.clone(getRootTree())
        var position = gametree.getLevel.apply(null, getCurrentTreePosition())
        if (!tooltip) tooltip = 'Undo'

        $('#bar header .undo').attr('title', tooltip)
        $('body')
        .addClass('undoable')
        .data('undodata-root', rootTree)
        .data('undodata-pos', position)
    } else {
        $('body')
        .removeClass('undoable')
        .data('undodata-root', null)
        .data('undodata-pos', null)
    }
}

function getHotspot() {
    var tp = getCurrentTreePosition()
    var node = tp[0].nodes[tp[1]]

    return 'HO' in node
}

function setHotspot(bookmark) {
    var tp = getCurrentTreePosition()
    var node = tp[0].nodes[tp[1]]

    if (bookmark) node.HO = [1]
    else delete node.HO

    updateGraph()
    setShowHotspot(bookmark)
}

function getEmptyGameTree() {
    var buffer = ';GM[1]FF[4]AP[' + app.getName() + ':' + app.getVersion() + ']'
    buffer += 'CA[UTF-8]KM[' + setting.get('game.default_komi')
        + ']SZ[' + setting.get('game.default_board_size') + ']'

    return sgf.parse(sgf.tokenize(buffer))
}

/**
 * Methods
 */

function loadSettings() {
    $('#head link.userstyle').attr('href', setting.stylesPath)

    $('#goban').toggleClass('fuzzy', setting.get('view.fuzzy_stone_placement'))
    $('#goban').toggleClass('animation', setting.get('view.animated_stone_placement'))
    $('#goban').toggleClass('coordinates', setting.get('view.show_coordinates'))
    $('#goban').toggleClass('variations', setting.get('view.show_next_moves'))
    $('#goban').toggleClass('siblings', setting.get('view.show_siblings'))

    if (setting.get('view.show_leftsidebar')) {
        $('body').addClass('leftsidebar')
        setLeftSidebarWidth(setting.get('view.leftsidebar_width'))
    }

    if (setting.get('view.show_graph') || setting.get('view.show_comments')) {
        $('body').addClass('sidebar')
        setSidebarArrangement(setting.get('view.show_graph'), setting.get('view.show_comments'))
        setSidebarWidth(setting.get('view.sidebar_width'))
    }
}

function prepareEditTools() {
    $('#edit ul a').on('click', function() {
        var $a = $(this)
        var $img = $a.find('img')

        if (!$a.parent().hasClass('selected')) {
            $('#edit .selected').removeClass('selected')
            $a.parent().addClass('selected')
        } else if ($a.parent().hasClass('stone-tool')) {
            var black = $img.attr('src').indexOf('_1') >= 0
            $img.attr('src', black ? '../img/edit/stone_-1.svg' : '../img/edit/stone_1.svg')
        } else if ($a.parent().hasClass('line-tool')) {
            var line = $img.attr('src').indexOf('line') >= 0
            $img.attr('src', line ? '../img/edit/arrow.svg' : '../img/edit/line.svg')
        }
    })
}

function prepareGameGraph() {
    var $container = $('#graph')
    var s = new sigma({
        renderer: {
            container: $container.get(0),
            type: 'canvas'
        },
        settings: {
            defaultNodeColor: setting.get('graph.node_inactive_color'),
            defaultEdgeColor: setting.get('graph.node_color'),
            defaultNodeBorderColor: 'rgba(255,255,255,.2)',
            edgeColor: 'default',
            borderSize: 2,
            zoomMax: 1,
            zoomMin: 1,
            autoResize: false,
            autoRescale: false
        }
    })

    var getTreePos = function(e) { return [e.data.node.data[0], e.data.node.data[1]] }

    s.bind('clickNode', function(e) {
        setCurrentTreePosition.apply(null, getTreePos(e).concat([true]))
    }).bind('rightClickNode', function(e) {
        openNodeMenu.apply(null, getTreePos(e).concat([e.data.captor]))
    })

    $container.data('sigma', s)
}

function prepareSlider() {
    var $slider = $('#sidebar .slider .inner')

    var changeSlider = function(percentage) {
        percentage = Math.min(1, Math.max(0, percentage))

        var level = Math.round((gametree.getHeight(getRootTree()) - 1) * percentage)
        var pos = gametree.navigate(getRootTree(), 0, level)
        if (!pos) pos = gametree.navigate(getRootTree(), 0, gametree.getCurrentHeight(getRootTree()) - 1)

        if (helper.equals(pos, getCurrentTreePosition())) return
        setCurrentTreePosition.apply(null, pos)
        updateSlider()
    }

    var mouseMoveHandler = function(e) {
        if (e.button != 0 || !$slider.data('mousedown'))
            return

        var percentage = (e.clientY - $slider.offset().top) / $slider.height()
        changeSlider(percentage)
        document.onselectstart = function() { return false }
    }

    $slider.on('mousedown', function(e) {
        if (e.button != 0) return

        $(this).data('mousedown', true).addClass('active')
        mouseMoveHandler(e)
    }).on('touchstart', function() {
        $(this).addClass('active')
    }).on('touchmove', function(e) {
        var percentage = (e.client.y - $slider.offset().top) / $slider.height()
        changeSlider(percentage)
    }).on('touchend', function() {
        $(this).removeClass('active')
    })

    $(document).on('mouseup', function() {
        $slider.data('mousedown', false)
            .removeClass('active')
        document.onselectstart = null
    }).on('mousemove', mouseMoveHandler)

    // Prepare previous/next buttons

    $('#sidebar .slider a').on('mousedown', function() {
        $(this).data('mousedown', true)
        startAutoScroll($(this).hasClass('next') ? 1 : -1)
    })

    $(document).on('mouseup', function() {
        $('#sidebar .slider a').data('mousedown', false)
    })
}

function prepareDragDropFiles() {
    $('body').on('dragover', function(e) {
        e.preventDefault()
    }).on('drop', function(e) {
        e.preventDefault()

        if (e.dataTransfer.files.length == 0) return
        loadFile(e.dataTransfer.files[0].path)
    })
}

function prepareConsole() {
    $('#console form').on('submit', function(e) {
        e.preventDefault()

        var $input = $(this).find('input')
        if ($input.val().trim() == '') return
        $input.get(0).blur()

        var command = gtp.parseCommand($input.val())
        sendGTPCommand(command)
    })

    $('#console form input').on('keydown', function(e) {
        if ([40, 38, 9].indexOf(e.keyCode) != -1) e.preventDefault()
        var $inputs = $('#console form input')

        if ($(this).data('index') == null) $(this).data('index', $inputs.get().indexOf(this))
        var i = $(this).data('index')
        var length = $inputs.length

        if ([38, 40].indexOf(e.keyCode) != -1) {
            if (e.keyCode == 38) {
                // Up
                i = Math.max(i - 1, 0)
            } else if (e.keyCode == 40) {
                // Down
                i = Math.min(i + 1, length - 1)
            }

            $(this)
            .val(i == length - 1 ? '' : $inputs.eq(i).val())
            .data('index', i)
        } else if (e.keyCode == 9) {
            // Tab
            var tokens = $(this).val().split(' ')
            var commands = getEngineCommands()
            if (!commands) return

            var i = 0
            var selection = this.selectionStart
            while (selection > tokens[i].length && selection.length != 0 && i < tokens.length - 1)
                selection -= tokens[i++].length + 1

            var result = fuzzyfinder.find(tokens[i], getEngineCommands())
            if (!result) return
            tokens[i] = result

            this.value = tokens.join(' ')
            this.selectionStart = this.selectionEnd = (function() {
                var sum = 0
                while (i >= 0) sum += tokens[i--].length + 1
                return sum - 1
            })()
        }
    })
}

function prepareGameInfo() {
    $('#info button[type="submit"]').on('click', function(e) {
        e.preventDefault()
        commitGameInfo()
        closeGameInfo()
    })

    $('#info button[type="reset"]').on('click', function(e) {
        e.preventDefault()
        closeGameInfo()
    })

    $('#info .currentplayer').on('click', function() {
        var data = $('#info section input[type="text"]').get().map(function(el) {
            return $(el).val()
        })

        $('#info section input[name="rank_1"]').val(data[3])
        $('#info section input[name="rank_-1"]').val(data[0])
        $('#info section input[name="name_1"]').val(data[2])
        $('#info section input[name="name_-1"]').val(data[1])

        data = $('#info section .menu').get().map(function(el) {
            return [$(el).hasClass('active'), $(el).data('engineindex')]
        })

        $('#info section .menu').eq(0)
        .toggleClass('active', data[1][0])
        .data('engineindex', data[1][1])

        $('#info section .menu').eq(1)
        .toggleClass('active', data[0][0])
        .data('engineindex', data[0][1])
    })

    $('#info section img.menu').on('click', function() {
        var $el = $(this)

        function selectEngine(engine, i) {
            var currentIndex = $(this).data('engineindex')
            if (currentIndex == null) currentIndex = -1
            if (i == currentIndex) return

            $(this).parent().find('input[name^="name_"]').val(engine ? engine.name : '')
            $(this).data('engineindex', i)

            if (engine) {
                var els = $('#info section .menu').get()
                var other = els[0] == this ? els[1] : els[0]
                if (other) selectEngine.call(other, null, -1)

                $(this).addClass('active')
            } else {
                $('#info').find('section .menu')
                .removeClass('active')
            }
        }

        openEnginesMenu($el, selectEngine.bind($el.get(0)))
    })

    // Prepare date input

    var $dateInput = $('#info input[name="date"]')
    var adjustPosition = function(pikaday) {
        $(pikaday.el)
        .css('position', 'absolute')
        .css('left', Math.round($dateInput.offset().left))
        .css('top', Math.round($dateInput.offset().top - $(pikaday.el).height()))
    }
    var markDates = function(pikaday) {
        var dates = (sgf.string2dates($dateInput.val()) || []).filter(function(x) {
            return x.length == 3
        })

        $(pikaday.el).find('.pika-button').get().forEach(function(el) {
            var year = +$(el).attr('data-pika-year')
            var month = +$(el).attr('data-pika-month')
            var day = +$(el).attr('data-pika-day')

            $(el).parent().toggleClass('is-multi-selected', dates.some(function(d) {
                return helper.equals(d, [year, month + 1, day])
            }))
        })
    }
    var pikaday = new Pikaday({
        position: 'top left',
        firstDay: 1,
        yearRange: 6,
        onOpen: function() {
            if (!pikaday) return

            var dates = (sgf.string2dates($dateInput.val()) || []).filter(function(x) {
                return x.length == 3
            })

            if (dates.length > 0) {
                pikaday.setDate(dates[0].join('-'), true)
            } else {
                pikaday.gotoToday()
            }

            adjustPosition(pikaday)
        },
        onDraw: function() {
            if (!pikaday.isVisible()) return

            adjustPosition(pikaday)
            markDates(pikaday)

            $dateInput.get(0).focus()
        },
        onSelect: function() {
            var dates = sgf.string2dates($dateInput.val()) || []
            var date = pikaday.getDate()
            date = [date.getFullYear(), date.getMonth() + 1, date.getDate()]

            if (!dates.some(function(x) { return helper.equals(x, date) })) {
                dates.push(date)
            } else {
                dates = dates.filter(function(x) { return !helper.equals(x, date) })
            }

            $dateInput.val(sgf.dates2string(dates.sort(helper.lexicalCompare)))
        }
    })

    $dateInput.data('pikaday', pikaday)
    pikaday.hide()

    $('body').append(pikaday.el).on('click', function(e) {
        if (pikaday.isVisible()
        && document.activeElement != $dateInput.get(0)
        && e.target != $dateInput.get(0)
        && $(e.target).parents('.pika-lendar').length == 0)
            pikaday.hide()
    })

    $(window).on('resize', function() { adjustPosition(pikaday) })

    $dateInput
    .on('focus', function() {
        pikaday.show()
    })
    .on('blur', function() {
        setTimeout(function() {
            if ($(document.activeElement).parents('.pika-lendar').length == 0)
                pikaday.hide()
        }, 50)
    })
    .on('input', function() {
        markDates(pikaday)
    })

    // Handle size inputs

    $('#info input[name^="size-"]').attr('placeholder', setting.get('game.default_board_size'))

    $('#info input[name="size-width"]').on('focus', function() {
        $(this).data('link', this.value == $(this).parent().nextAll('input[name="size-height"]').val())
    }).on('input', function() {
        if (!$(this).data('link')) return
        $(this).parent().nextAll('input[name="size-height"]').val(this.value)
    })

    $('#info span.size-swap').on('click', function() {
        if ($('#info').hasClass('disabled')) return

        var $widthInput = $('#info input[name="size-width"]')
        var $heightInput = $('#info input[name="size-height"]')
        var data = [$widthInput.val(), $heightInput.val()]
        $widthInput.val(data[1])
        $heightInput.val(data[0])
    })
}

function generateFileHash() {
    var trees = getGameTrees()
    var hash = ''

    for (var i = 0; i < trees.length; i++) {
        hash += gametree.getHash(trees[i])
    }

    return hash
}

function updateFileHash() {
    $('body').data('filehash', generateFileHash())
}

function loadEngines() {
    // Load engines list

    $('#preferences .engines-list ul').empty()

    setting.getEngines().forEach(function(engine) {
        addEngineItem(engine.name, engine.path, engine.args)
    })
}

function attachEngine(exec, args, genMove) {
    detachEngine()
    setIsBusy(true)

    setTimeout(function() {
        var split = require('argv-split')
        var controller = new gtp.Controller(exec, split(args))

        if (controller.error) {
            showMessageBox('There was an error attaching the engine.', 'error')
            return
        }

        controller.on('quit', function() {
            $('#console').data('controller', null)
            setIsBusy(false)
        })

        $('#console').data('controller', controller)

        sendGTPCommand(new gtp.Command(null, 'name'), true, function(response) {
            $('#console').data('enginename', response.content)
        })
        sendGTPCommand(new gtp.Command(null, 'version'))
        sendGTPCommand(new gtp.Command(null, 'protocol_version'))
        sendGTPCommand(new gtp.Command(null, 'list_commands'), true, function(response) {
            $('#console').data('commands', response.content.split('\n'))
        })

        syncEngine()
        setIsBusy(false)

        if (!!genMove) generateMove()
    }, setting.get('gtp.attach_delay'))
}

function detachEngine() {
    sendGTPCommand(new gtp.Command(null, 'quit'), true)

    $('#console')
    .data('controller', null)
    .data('boardhash', null)

    setIsBusy(false)
}

function syncEngine() {
    var board = getBoard()

    if (!getEngineController() || $('#console').data('boardhash') == board.getHash())
        return

    if (!board.isSquare()) {
        showMessageBox('GTP engines don’t support non-square boards.', 'warning')
        return detachEngine()
    } else if (!board.isValid()) {
        showMessageBox('GTP engines don’t support invalid board positions.', 'warning')
        return detachEngine()
    }

    setIsBusy(true)

    sendGTPCommand(new gtp.Command(null, 'clear_board'), true)
    sendGTPCommand(new gtp.Command(null, 'boardsize', [board.width]), true)
    sendGTPCommand(new gtp.Command(null, 'komi', [getKomi()]), true)

    // Replay
    for (var i = 0; i < board.width; i++) {
        for (var j = 0; j < board.height; j++) {
            var v = [i, j]
            var sign = board.arrangement[v]
            if (sign == 0) continue

            var color = sign > 0 ? 'B' : 'W'
            var point = board.vertex2coord(v)

            sendGTPCommand(new gtp.Command(null, 'play', [color, point]), true)
        }
    }

    $('#console').data('boardhash', board.getHash())
    setIsBusy(false)
}

function makeMove(vertex, sendCommand) {
    if (sendCommand == null) sendCommand = getEngineController() != null

    var pass = !getBoard().hasVertex(vertex)
    if (!pass && getBoard().arrangement[vertex] != 0) return

    var position = getCurrentTreePosition()
    var tree = position[0], index = position[1]
    var sign = getCurrentPlayer()
    var color = sign > 0 ? 'B' : 'W'
    var capture = false, suicide = false
    var createNode = true

    if (sendCommand) syncEngine()

    if (!pass) {
        // Check for ko
        if (setting.get('game.show_ko_warning')) {
            var tp = gametree.navigate(tree, index, -1)
            var ko = false

            if (tp) {
                var hash = getBoard().makeMove(sign, vertex).getHash()
                ko = tp[0].nodes[tp[1]].board.getHash() == hash
            }

            if (ko && showMessageBox(
                ['You are about to play a move which repeats a previous board position.',
                'This is invalid in some rulesets.'].join('\n'),
                'info',
                ['Play Anyway', 'Don’t Play'], 1
            ) != 0) return
        }

        // Check for suicide
        capture = getBoard().getNeighbors(vertex).some(function(v) {
            return getBoard().arrangement[v] == -sign && getBoard().getLiberties(v).length == 1
        })

        suicide = !capture && getBoard().getNeighbors(vertex).filter(function(v) {
            return getBoard().arrangement[v] == sign
        }).every(function(v) {
            return getBoard().getLiberties(v).length == 1
        }) && getBoard().getNeighbors(vertex).filter(function(v) {
            return getBoard().arrangement[v] == 0
        }).length == 0

        if (suicide && setting.get('game.show_suicide_warning')) {
            if (showMessageBox(
                ['You are about to play a suicide move.',
                'This is invalid in some rulesets.'].join('\n'),
                'info',
                ['Play Anyway', 'Don’t Play'], 1
            ) != 0) return
        }

        // Randomize shift and readjust
        var $li = $('#goban .pos_' + vertex.join('-'))
        var direction = Math.floor(Math.random() * 9)

        $li.addClass('animate')
        for (var i = 0; i < 9; i++) $li.removeClass('shift_' + i)
        $li.addClass('shift_' + direction)
        setTimeout(function() { $li.removeClass('animate') }, 200)

        readjustShifts(vertex)
    }

    if (tree.current == null && tree.nodes.length - 1 == index) {
        // Append move
        var node = {}
        node[color] = [sgf.vertex2point(vertex)]
        tree.nodes.push(node)

        setCurrentTreePosition(tree, tree.nodes.length - 1)
    } else {
        if (index != tree.nodes.length - 1) {
            // Search for next move

            var nextNode = tree.nodes[index + 1]
            var moveExists = color in nextNode
                && helper.equals(sgf.point2vertex(nextNode[color][0]), vertex)

            if (moveExists) {
                setCurrentTreePosition(tree, index + 1)
                createNode = false
            }
        } else {
            // Search for variation

            var variations = tree.subtrees.filter(function(subtree) {
                return subtree.nodes.length > 0
                    && color in subtree.nodes[0]
                    && helper.equals(sgf.point2vertex(subtree.nodes[0][color][0]), vertex)
            })

            if (variations.length > 0) {
                setCurrentTreePosition(gametree.addBoard(variations[0]), 0)
                createNode = false
            }
        }

        if (createNode) {
            // Create variation

            var updateRoot = tree == getRootTree()
            var splitted = gametree.splitTree(tree, index)
            var node = {}; node[color] = [sgf.vertex2point(vertex)]
            var newtree = gametree.new()
            newtree.nodes = [node]
            newtree.parent = splitted

            splitted.subtrees.push(newtree)
            splitted.current = splitted.subtrees.length - 1

            gametree.addBoard(newtree, newtree.nodes.length - 1)
            if (updateRoot) setRootTree(splitted)
            setCurrentTreePosition(newtree, 0)
        }
    }

    // Play sounds

    if (!pass) {
        var delay = setting.get('sound.capture_delay_min')
        delay += Math.floor(Math.random() * (setting.get('sound.capture_delay_max') - delay))

        if (capture || suicide) setTimeout(function() {
            sound.playCapture()
        }, delay)

        sound.playPachi()
    } else {
        sound.playPass()
    }

    // Remove undo information

    setUndoable(false)

    // Enter scoring mode when two consecutive passes

    var enterScoring = false

    if (pass && createNode) {
        var tp = getCurrentTreePosition()
        var ptp = gametree.navigate(tp[0], tp[1], -1)

        if (ptp) {
            var prevNode = ptp[0].nodes[ptp[1]]
            var prevColor = sign > 0 ? 'W' : 'B'
            var prevPass = prevColor in prevNode && prevNode[prevColor][0] == ''

            if (prevPass) {
                enterScoring = true
                setScoringMode(true)
            }
        }
    }

    // Handle GTP engine

    if (sendCommand && !enterScoring) {
        var command = new gtp.Command(null, 'play', [color, pass ? 'pass' : getBoard().vertex2coord(vertex)])
        sendGTPCommand(command, true)

        $('#console').data('boardhash', getBoard().getHash())

        setIsBusy(true)
        setTimeout(function() {
            generateMove(true)
        }, setting.get('gtp.move_delay'))
    }
}

function makeResign(sign) {
    if (!sign) sign = getCurrentPlayer()

    showGameInfo()
    var player = sign > 0 ? 'W' : 'B'
    $('#info input[name="result"]').val(player + '+Resign')
}

function useTool(vertex, event) {
    var tp = getCurrentTreePosition()
    var tree = tp[0], index = tp[1]
    var node = tree.nodes[index]
    var tool = getSelectedTool()
    var board = getBoard()
    var dictionary = {
        cross: 'MA',
        triangle: 'TR',
        circle: 'CR',
        square: 'SQ',
        number: 'LB',
        label: 'LB'
    }

    if (tool.indexOf('stone') != -1) {
        if ('B' in node || 'W' in node || gametree.navigate(tree, index, 1)) {
            // New variation needed

            var updateRoot = tree == getRootTree()
            var splitted = gametree.splitTree(tree, index)

            if (splitted != tree || splitted.subtrees.length != 0) {
                tree = gametree.new()
                tree.parent = splitted
                splitted.subtrees.push(tree)
            }

            node = { PL: getCurrentPlayer() > 0 ? ['B'] : ['W'] }
            index = tree.nodes.length
            tree.nodes.push(node)

            if (updateRoot) setRootTree(splitted)
        }

        var sign = tool.indexOf('_1') != -1 ? 1 : -1
        if (event.button == 2) sign = -sign

        var oldSign = board.arrangement[vertex]
        var ids = ['AW', 'AE', 'AB']
        var id = ids[sign + 1]
        var point = sgf.vertex2point(vertex)

        for (var i = 0; i <= 2; i++) {
            if (!(ids[i] in node)) continue

            // Resolve compressed lists

            if (node[ids[i]].some(function(x) { return x.indexOf(':') >= 0 })) {
                node[ids[i]] = node[ids[i]].map(function(value) {
                    return sgf.compressed2list(value).map(sgf.vertex2point)
                }).reduce(function(list, x) {
                    return list.concat(x)
                })
            }

            // Remove residue

            k = node[ids[i]].indexOf(point)
            if (k >= 0) {
                node[ids[i]].splice(k, 1)

                if (node[ids[i]].length == 0)
                    delete node[ids[i]]
            }
        }

        if (oldSign != sign) {
            if (id in node) node[id].push(point)
            else node[id] = [point]
        } else if (oldSign == sign) {
            if ('AE' in node) node.AE.push(point)
            else node.AE = [point]
        }
    } else if (tool == 'line' || tool == 'arrow') {
        // Check whether to remove a line

        var $hr = $('#goban').data('edittool-data')

        if ($hr) {
            var v1 = $hr.data('v1'), v2 = $hr.data('v2')
            var toDelete = $('#goban hr').get().filter(function(x) {
                var w1 = $(x).data('v1'), w2 = $(x).data('v2')
                var result = x != $hr.get(0)
                    && w1[0] == v1[0] && w1[1] == v1[1]
                    && w2[0] == v2[0] && w2[1] == v2[1]

                if (tool == 'line' || $(x).hasClass('line')) result = result || x != $hr.get(0)
                    && w1[0] == v2[0] && w1[1] == v2[1]
                    && w2[0] == v1[0] && w2[1] == v1[1]

                return result
            })

            if (toDelete.length != 0) $hr.remove()
            $(toDelete).remove()
        }

        $('#goban').data('edittool-data', null)

        // Update SGF & board

        node.LN = []
        node.AR = []
        board.lines = []

        $('#goban hr').get().forEach(function(hr) {
            var p1 = sgf.vertex2point($(hr).data('v1'))
            var p2 = sgf.vertex2point($(hr).data('v2'))

            if (p1 == p2) return

            node[$(hr).hasClass('arrow') ? 'AR' : 'LN'].push(p1 + ':' + p2)
            board.lines.push([$(hr).data('v1'), $(hr).data('v2'), $(hr).hasClass('arrow')])
        })

        if (node.LN.length == 0) delete node.LN
        if (node.AR.length == 0) delete node.AR
    } else {
        if (event.button != 0) return

        if (tool != 'label' && tool != 'number') {
            if (vertex in board.markups && board.markups[vertex][0] == tool) {
                delete board.markups[vertex]
            } else {
                board.markups[vertex] = [tool, '']
            }
        } else if (tool == 'number') {
            if (vertex in board.markups && board.markups[vertex][0] == 'label') {
                delete board.markups[vertex]
            } else {
                var number = 1

                if ('LB' in node) {
                    var list = node.LB.map(function(x) {
                        return parseFloat(x.substr(3))
                    }).filter(function(x) {
                        return !isNaN(x)
                    })
                    list.sort(function(a, b) { return a - b })

                    for (var i = 0; i <= list.length; i++) {
                        if (i < list.length && i + 1 == list[i]) continue
                        number = i + 1
                        break
                    }
                }

                board.markups[vertex] = [tool, number.toString()]
            }
        } else if (tool == 'label') {
            if (vertex in board.markups && board.markups[vertex][0] == 'label') {
                delete board.markups[vertex]
            } else {
                var alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
                var k = 0

                if ('LB' in node) {
                    var list = node.LB.filter(function(x) {
                        return x.length == 4
                    }).map(function(x) {
                        return alpha.indexOf(x[3])
                    }).filter(function(x) { return x >= 0 })
                    list.sort(function(a, b) { return a - b })

                    for (var i = 0; i <= list.length; i++) {
                        if (i < list.length && i == list[i]) continue
                        k = Math.min(i, alpha.length - 1)
                        break
                    }
                }

                board.markups[vertex] = [tool, alpha[k]]
            }
        }

        for (var id in dictionary) delete node[dictionary[id]]

        // Update SGF

        $('#goban .row li').get().forEach(function(li) {
            var v = $(li).data('vertex')
            if (!(v in board.markups)) return

            var id = dictionary[board.markups[v][0]]
            var pt = sgf.vertex2point(v)
            if (id == 'LB') pt += ':' + board.markups[v][1]

            if (id in node) node[id].push(pt)
            else node[id] = [pt]
        })
    }

    setUndoable(false)
    setCurrentTreePosition(tree, index)
}

function drawLine(vertex) {
    var tool = getSelectedTool()

    if (!vertex || !getEditMode() || tool != 'line' && tool != 'arrow') return

    if (!$('#goban').data('edittool-data')) {
        var $hr = $('<hr/>').addClass(tool).data('v1', vertex).data('v2', vertex)
        $('#goban').append($hr).data('edittool-data', $hr)
    } else {
        var $hr = $('#goban').data('edittool-data')
        $hr.data('v2', vertex)
    }

    updateBoardLines()
}

function findPosition(step, condition) {
    if (isNaN(step)) step = 1
    else step = step >= 0 ? 1 : -1

    setIsBusy(true)

    setTimeout(function() {
        var pos = getCurrentTreePosition()
        var iterator = gametree.makeNodeIterator.apply(null, pos)

        while (true) {
            pos = step >= 0 ? iterator.next() : iterator.prev()

            if (!pos) {
                var root = getRootTree()

                if (step == 1) {
                    pos = [root, 0]
                } else {
                    var sections = gametree.getSection(root, gametree.getHeight(root) - 1)
                    pos = sections[sections.length - 1]
                }

                iterator = gametree.makeNodeIterator.apply(null, pos)
            }

            if (helper.equals(pos, getCurrentTreePosition()) || condition.apply(null, pos)) break
        }

        setCurrentTreePosition.apply(null, pos)
        setIsBusy(false)
    }, setting.get('find.delay'))
}

function findBookmark(step) {
    findPosition(step, function(tree, index) {
        return 'HO' in tree.nodes[index]
    })
}

function findMove(vertex, text, step) {
    if (vertex == null && text.trim() == '') return
    var point = vertex ? sgf.vertex2point(vertex) : null

    findPosition(step, function(tree, index) {
        var node = tree.nodes[index]
        var cond = function(prop, value) {
            return prop in node && node[prop][0].toLowerCase().indexOf(value.toLowerCase()) >= 0
        }

        return (!point || ['B', 'W'].some(function(x) { return cond(x, point) }))
            && (!text || cond('C', text) || cond('N', text))
    })
}

function vertexClicked(vertex, event) {
    closeGameInfo()

    if (getScoringMode() || getEstimatorMode()) {
        if ($('#score').hasClass('show')) return
        if (event.button != 0) return
        if (getBoard().arrangement[vertex] == 0) return

        var dead = !$('#goban .pos_' + vertex.join('-')).hasClass('dead')
        var stones = getEstimatorMode() ? getBoard().getChain(vertex) : getBoard().getRelatedChains(vertex)

        stones.forEach(function(v) {
            $('#goban .pos_' + v.join('-')).toggleClass('dead', dead)
        })

        updateAreaMap(getEstimatorMode())
    } else if (getEditMode()) {
        useTool(vertex, event)
    } else if (getFindMode()) {
        if (event.button != 0) return

        setIndicatorVertex(vertex)
        findMove(getIndicatorVertex(), getFindText(), 1)
    } else if (getGuessMode()) {
        if (event.button != 0) return

        var tp = gametree.navigate.apply(null, getCurrentTreePosition().concat([1]))
        if (!tp) {
            setGuessMode(false)
            return
        }

        var nextNode = tp[0].nodes[tp[1]]

        if ('B' in nextNode) setCurrentPlayer(1)
        else if ('W' in nextNode) setCurrentPlayer(-1)
        else {
            setGuessMode(false)
            return
        }

        var color = getCurrentPlayer() > 0 ? 'B' : 'W'
        var nextVertex = sgf.point2vertex(nextNode[color][0])
        var board = getBoard()

        if (!board.hasVertex(nextVertex)) {
            setGuessMode(false)
            return
        }

        if (vertex[0] == nextVertex[0] && vertex[1] == nextVertex[1]) {
            makeMove(vertex)
        } else {
            if (board.arrangement[vertex] != 0) return
            if ($('#goban .pos_' + vertex.join('-')).hasClass('paint_1')) return

            var i = 0
            if (Math.abs(vertex[1] - nextVertex[1]) > Math.abs(vertex[0] - nextVertex[0]))
                i = 1

            for (var x = 0; x < board.width; x++) {
                for (var y = 0; y < board.height; y++) {
                    var z = i == 0 ? x : y
                    if (Math.abs(z - vertex[i]) < Math.abs(z - nextVertex[i]))
                        $('#goban .pos_' + x + '-' + y).addClass('paint_1')
                }
            }
        }
    } else {
        // Playing mode

        if (event.button != 0) return
        var board = getBoard()

        if (board.arrangement[vertex] == 0) {
            makeMove(vertex)
        } else if (vertex in board.markups
        && board.markups[vertex][0] == 'point'
        && setting.get('edit.click_currentvertex_to_remove')) {
            removeNode.apply(null, getCurrentTreePosition())
        }

        closeDrawers()
    }
}

function updateSidebar(redraw, now) {
    clearTimeout($('#sidebar').data('updatesidebarid'))

    var tp = getCurrentTreePosition()
    var tree = tp[0], index = tp[1]

    $('#sidebar').data('updatesidebarid', setTimeout(function() {
        if (!helper.equals(getCurrentTreePosition(), [tree, index]))
            return

        // Set current path

        var t = tree
        while (t.parent) {
            t.parent.current = t.parent.subtrees.indexOf(t)
            t = t.parent
        }

        // Update

        updateSlider()
        updateCommentText()
        if (redraw) updateGraph()
        else centerGraphCameraAt(getCurrentGraphNode())
    }, now ? 0 : setting.get('graph.delay')))
}

function updateGraph() {
    if (!getShowSidebar() || !getCurrentTreePosition()) return

    setGraphMatrixDict(gametree.tree2matrixdict(getRootTree()))
    centerGraphCameraAt(getCurrentGraphNode())
}

function updateSlider() {
    if (!getShowSidebar()) return

    var tp = getCurrentTreePosition()
    var tree = tp[0], index = tp[1]
    var total = gametree.getHeight(getRootTree()) - 1
    var relative = gametree.getLevel(tree, index)

    setSliderValue(total == 0 ? 0 : relative * 100 / total, relative)
}

function updateCommentText() {
    var tp = getCurrentTreePosition()
    var node = tp[0].nodes[tp[1]]

    setCommentText('C' in node ? node.C[0] : '')
    setCommentTitle('N' in node ? node.N[0] : '')

    setAnnotations.apply(null, (function() {
        if ('UC' in node) return [-2, node.UC[0]]
        if ('GW' in node) return [-1, node.GW[0]]
        if ('DM' in node) return [0, node.DM[0]]
        if ('GB' in node) return [1, node.GB[0]]
        return [null, null]
    })().concat((function() {
        if ('BM' in node) return [-1, node.BM[0]]
        if ('TE' in node) return [2, node.TE[0]]
        if ('DO' in node) return [0, 1]
        if ('IT' in node) return [1, 1]
        return [null, null]
    })()))

    $('#properties .gm-scroll-view').scrollTop(0)
    $('#properties').data('scrollbar').update()
}

function updateAreaMap(useEstimateMap) {
    var board = getBoard().clone()

    $('#goban .row li.dead').get().forEach(function(li) {
        if ($(li).hasClass('sign_1')) board.captures['-1']++
        else if ($(li).hasClass('sign_-1')) board.captures['1']++

        board.arrangement[$(li).data('vertex')] = 0
    })

    var map = useEstimateMap ? board.getAreaEstimateMap() : board.getAreaMap()

    $('#goban .row li').get().forEach(function(li) {
        $(li)
        .removeClass('area_-1').removeClass('area_0').removeClass('area_1')
        .addClass('area_' + map[$(li).data('vertex')])
    })

    if (!useEstimateMap) {
        var $falsedead = $('#goban .row li.area_-1.sign_-1.dead, #goban .row li.area_1.sign_1.dead')

        if ($falsedead.length > 0) {
            $falsedead.removeClass('dead')
            return updateAreaMap()
        }
    }

    $('#goban')
    .data('areamap', map)
    .data('finalboard', board)
}

function commitCommentText() {
    var tp = getCurrentTreePosition()
    var tree = tp[0], index = tp[1]
    var title = getCommentTitle()
    var comment = getCommentText()

    if (comment != '') tree.nodes[index].C = [comment]
    else delete tree.nodes[index].C

    if (title != '') tree.nodes[index].N = [title]
    else delete tree.nodes[index].N

    updateSidebar(true)
    setUndoable(false)
}

function commitGameInfo() {
    var rootNode = getRootTree().nodes[0]
    var $info = $('#info')

    var data = {
        'rank_1': 'BR',
        'rank_-1': 'WR',
        'name_1': 'PB',
        'name_-1': 'PW',
        'result': 'RE',
        'name': 'GN',
        'event': 'EV',
        'date': 'DT'
    }

    for (var name in data) {
        var value = $info.find('input[name="' + name + '"]').val().trim()
        rootNode[data[name]] = [value]
        if (value == '') delete rootNode[data[name]]
    }

    setPlayerName(1,
        gametree.getPlayerName(1, getRootTree(), 'Black'),
        'BR' in rootNode ? rootNode.BR[0] : ''
    )
    setPlayerName(-1,
        gametree.getPlayerName(-1, getRootTree(), 'White'),
        'WR' in rootNode ? rootNode.WR[0] : ''
    )

    // Handle komi

    var komi = +$info.find('input[name="komi"]').val()
    if (isNaN(komi)) komi = 0
    rootNode.KM = ['' + komi]

    // Handle size

    var size = ['width', 'height'].map(function(x) {
        var num = parseFloat($info.find('input[name="size-' + x + '"]').val())
        if (isNaN(num)) num = setting.get('game.default_board_size')
        return Math.min(Math.max(num, 3), 25)
    })

    if (size[0] == size[1]) rootNode.SZ = ['' + size[0]]
    else rootNode.SZ = [size.join(':')]

    // Handle handicap stones

    var $handicapInput = $info.find('select[name="handicap"]')
    var handicap = $handicapInput.get(0).selectedIndex

    if (!$handicapInput.get(0).disabled) {
        setCurrentTreePosition(getRootTree(), 0)

        if (handicap == 0) {
            delete rootNode.AB
            delete rootNode.HA
        } else {
            var board = getBoard()
            var stones = board.getHandicapPlacement(handicap + 1)

            rootNode.HA = ['' + stones.length]
            rootNode.AB = stones.map(sgf.vertex2point)
        }

        setCurrentTreePosition(getRootTree(), 0)
    }

    setUndoable(false)
    updateSidebar()

    // Update engine

    if (!$info.hasClass('disabled')) {
        // Attach/detach engine

        var engines = setting.getEngines()
        var indices = $('#info section .menu').get().map(function(x) { return $(x).data('engineindex') })
        var max = Math.max.apply(null, indices)
        var sign = indices.indexOf(max) == 0 ? 1 : -1

        if (max >= 0) {
            var engine = engines[max]
            attachEngine(engine.path, engine.args, getCurrentPlayer() == sign)
        } else {
            detachEngine()
        }
    } else {
        // Update komi

        var command = new gtp.Command(null, 'komi', [komi])
        sendGTPCommand(command, true)
    }
}

function commitScore() {
    var result = $('#score .result').text()

    showGameInfo()
    $('#info input[name="result"]').val(result)

    setUndoable(false)
}

function commitPreferences() {
    // Save general preferences

    $('#preferences input[type="checkbox"]').get().forEach(function(el) {
        setting.set(el.name, el.checked)
    })

    remote.getCurrentWindow().webContents.setAudioMuted(!setting.get('sound.enable'))
    setFuzzyStonePlacement(setting.get('view.fuzzy_stone_placement'))
    setAnimatedStonePlacement(setting.get('view.animated_stone_placement'))

    // Save engines

    setting.clearEngines()

    $('#preferences .engines-list li').get().forEach(function(li) {
        var $nameinput = $(li).find('h3 input')

        setting.addEngine(
            $nameinput.val().trim() == '' ? $nameinput.attr('placeholder') : $nameinput.val(),
            $(li).find('h3 + p input').val(),
            $(li).find('h3 + p + p input').val()
        )
    })

    setting.save()
    loadEngines()

    ipcRenderer.send('build-menu')
}

function sendGTPCommand(command, ignoreBlocked, callback) {
    if (!getEngineController()) {
        $('#console form:last-child input').val('')
        return
    }

    var controller = getEngineController()
    var $container = $('#console .inner')
    var $oldform = $container.find('form:last-child')
    var $form = $oldform.clone(true)
    var $pre = $('<pre/>').text(' ')

    $form.find('input').val('')
    $oldform.addClass('waiting').find('input').val(command.toString())
    $container.append($pre).append($form)
    if (getShowLeftSidebar()) $form.find('input').get(0).focus()

    // Cleanup
    var $forms = $('#console .inner form')
    if ($forms.length > setting.get('console.max_history_count')) {
        $forms.eq(0).siblings('pre').remove()
        $forms.eq(0).remove()
    }

    var listener = function(response, c) {
        $pre.html(response.toHtml())
        wireLinks($pre)
        $oldform.removeClass('waiting')
        if (callback) callback(response)

        // Update scrollbars
        var $view = $('#console .gm-scroll-view')
        var scrollbar = $('#console').data('scrollbar')

        $view.scrollTop($view.get(0).scrollHeight)
        if (scrollbar) scrollbar.update()
    }

    if (!ignoreBlocked && setting.get('console.blocked_commands').indexOf(command.name) != -1) {
        listener(new gtp.Response(null, 'blocked command', true, true), command)
    } else {
        controller.once('response-' + command.internalId, listener)
        controller.sendCommand(command)
    }
}

function generateMove(ignoreBusy) {
    if (!getEngineController() || !ignoreBusy && getIsBusy()) return

    closeDrawers()
    syncEngine()
    setIsBusy(true)

    var color = getCurrentPlayer() > 0 ? 'B' : 'W'
    var opponent = getCurrentPlayer() > 0 ? 'W' : 'B'

    sendGTPCommand(new gtp.Command(null, 'genmove', [color]), true, function(r) {
        setIsBusy(false)
        if (r.content.toLowerCase() == 'resign') {
            showMessageBox(getEngineName() + ' has resigned.')
            getRootTree().nodes[0].RE = [opponent + '+Resign']
            return
        }

        var v = [-1, -1]
        if (r.content.toLowerCase() != 'pass')
            v = getBoard().coord2vertex(r.content)

        $('#console').data('boardhash', getBoard().makeMove(getCurrentPlayer(), v).getHash())
        makeMove(v, false)
    })
}

function centerGraphCameraAt(node) {
    if (!getShowSidebar() || !node) return

    var s = $('#graph').data('sigma')
    s.renderers[0].resize().render()

    var matrixdict = getGraphMatrixDict()
    var y = matrixdict[1][node.id][1]

    var wp = gametree.getSectionWidth(y, matrixdict[0])
    var width = wp[0], padding = wp[1]
    var x = matrixdict[1][node.id][0] - padding
    var relX = width == 1 ? 0 : x / (width - 1)
    var diff = (width - 1) * setting.get('graph.grid_size') / 2
    diff = Math.min(diff, s.renderers[0].width / 2 - setting.get('graph.grid_size'))

    node.color = setting.get('graph.node_active_color')
    s.refresh()

    sigma.misc.animation.camera(
        s.camera,
        {
            x: node[s.camera.readPrefix + 'x'] + (1 - 2 * relX) * diff,
            y: node[s.camera.readPrefix + 'y']
        },
        { duration: setting.get('graph.delay') }
    )
}

function askForSave() {
    if (!getRootTree()) return true
    var hash = generateFileHash()

    if (hash != getFileHash()) {
        var answer = showMessageBox(
            'Your changes will be lost if you close this file without saving.',
            'warning',
            ['Save', 'Don’t Save', 'Cancel'], 2
        )

        if (answer == 0) saveFile(getRepresentedFilename())
        else if (answer == 2) return false
    }

    return true
}

function startAutoScroll(direction, delay) {
    if (direction > 0 && !$('#sidebar .slider a.next').data('mousedown')
    || direction < 0 && !$('#sidebar .slider a.prev').data('mousedown')) return

    if (delay == null) delay = setting.get('autoscroll.max_interval')
    delay = Math.max(setting.get('autoscroll.min_interval'), delay)

    var $slider = $('#sidebar .slider')
    clearTimeout($slider.data('autoscrollid'))

    if (direction > 0) goForward()
    else goBack()
    updateSlider()

    $slider.data('autoscrollid', setTimeout(function() {
        startAutoScroll(direction, delay - setting.get('autoscroll.diff'))
    }, delay))
}

/**
 * Menu
 */

function newFile(playSound) {
    if (getIsBusy() || !askForSave()) return

    closeDrawers()
    setGameTrees([getEmptyGameTree()])
    setRepresentedFilename(null)
    setGameIndex(0)
    updateFileHash()

    if (playSound) {
        sound.playNewGame()
        showGameInfo()
    }
}

function loadFile(filename) {
    if (getIsBusy() || !askForSave()) return

    if (!filename) {
        var result = dialog.showOpenDialog(remote.getCurrentWindow(), {
            filters: [sgf.meta, { name: 'All Files', extensions: ['*'] }]
        })

        if (result) filename = result[0]
    }

    if (filename) {
        loadFileFromSgf(fs.readFileSync(filename, { encoding: 'utf8' }), true, function(error) {
            if (!error) setRepresentedFilename(filename)
        })
    }
}

function loadFileFromSgf(content, dontask, callback) {
    if (getIsBusy() || !dontask && !askForSave()) return
    setIsBusy(true)
    closeDrawers()

    setTimeout(function() {
        var win = remote.getCurrentWindow()
        var lastprogress = -1
        var error = false
        var trees = []

        try {
            trees = sgf.parse(sgf.tokenize(content), function(progress) {
                if (progress - lastprogress < 0.05) return

                setProgressIndicator(progress, win)
                lastprogress = progress
            }).subtrees

            if (trees.length == 0) throw true
        } catch(e) {
            showMessageBox('This file is unreadable.', 'warning')
            error = true
        }

        if (trees.length != 0) {
            setGameTrees(trees)
            setGameIndex(0)
            updateFileHash()
        }

        if (trees.length > 1)
            setTimeout(showGameChooser, setting.get('gamechooser.show_delay'))

        setProgressIndicator(-1, win)
        setIsBusy(false)

        if (callback) callback(error)
    }, setting.get('app.loadgame_delay'))
}

function saveFile(filename) {
    if (getIsBusy()) return
    setIsBusy(true)

    if (!filename) {
        filename = dialog.showSaveDialog(remote.getCurrentWindow(), {
            filters: [sgf.meta, { name: 'All Files', extensions: ['*'] }]
        })
    }

    if (filename) {
        fs.writeFileSync(filename, saveFileToSgf())
        updateFileHash()
        setRepresentedFilename(filename)
    }

    setIsBusy(false)
}

function saveFileToSgf() {
    var trees = getGameTrees()
    var text = ''

    for (var i = 0; i < trees.length; i++) {
        trees[i].nodes[0].AP = [app.getName() + ':' + app.getVersion()]
        text += '(' + sgf.stringify(trees[i]) + ')\n\n'
    }

    return text
}

function clearMarkup() {
    closeDrawers()
    var markupIds = ['MA', 'TR', 'CR', 'SQ', 'LB', 'AR', 'LN']

    // Save undo information
    setUndoable(true, 'Restore Markup')

    var tp = getCurrentTreePosition()
    var tree = tp[0], index = tp[1]

    markupIds.forEach(function(id) {
        delete tree.nodes[index][id]
    })

    setCurrentTreePosition(tree, index)
}

function goBack() {
    if (getGuessMode()) return

    var tp = getCurrentTreePosition()
    var tree = tp[0], index = tp[1]
    setCurrentTreePosition.apply(null, gametree.navigate(tree, index, -1))
}

function goForward() {
    if (getGuessMode()) return

    var tp = getCurrentTreePosition()
    var tree = tp[0], index = tp[1]
    setCurrentTreePosition.apply(null, gametree.navigate(tree, index, 1))
}

function goToNextFork() {
    var tp = getCurrentTreePosition()
    var tree = tp[0], index = tp[1]

    if (index != tree.nodes.length - 1)
        setCurrentTreePosition(tree, tree.nodes.length - 1)
    else if (tree.current != null) {
        var subtree = tree.subtrees[tree.current]
        setCurrentTreePosition(subtree, subtree.nodes.length - 1)
    }
}

function goToPreviousFork() {
    var tp = getCurrentTreePosition()
    var tree = tp[0], index = tp[1]

    if (tree.parent == null || tree.parent.nodes.length == 0) {
        if (index != 0) setCurrentTreePosition(tree, 0)
    } else {
        setCurrentTreePosition(tree.parent, tree.parent.nodes.length - 1)
    }
}

function goToComment(step) {
    var tp = getCurrentTreePosition()

    while (true) {
        tp = gametree.navigate.apply(null, tp.concat([step]))
        if (!tp) break

        var node = tp[0].nodes[tp[1]]

        if (setting.get('sgf.comment_properties').some(function(p) {
            return p in node
        })) break
    }

    setCurrentTreePosition.apply(null, tp)
}

function goToBeginning() {
    var tree = getRootTree()
    if (tree.nodes.length == 0) return
    setCurrentTreePosition(tree, 0)
}

function goToEnd() {
    var tree = getRootTree()
    setCurrentTreePosition.apply(null, gametree.navigate(tree, 0, gametree.getCurrentHeight(tree) - 1))
}

function goToNextVariation() {
    var tp = getCurrentTreePosition()
    var tree = tp[0], index = tp[1]

    if (!tree.parent) return

    var mod = tree.parent.subtrees.length
    var i = (tree.parent.current + 1) % mod

    setCurrentTreePosition(tree.parent.subtrees[i], 0)
}

function goToPreviousVariation() {
    var tp = getCurrentTreePosition()
    var tree = tp[0]

    if (!tree.parent) return

    var mod = tree.parent.subtrees.length
    var i = (tree.parent.current + mod - 1) % mod

    setCurrentTreePosition(tree.parent.subtrees[i], 0)
}

function goToMainVariation() {
    var tp = getCurrentTreePosition()
    var tree = tp[0]
    var root = getRootTree()

    while (!gametree.onMainTrack(tree)) {
        tree = tree.parent
    }

    while (root.current != null) {
        root.current = 0
        root = root.subtrees[0]
    }

    if (gametree.onMainTrack(tp[0])) {
        setCurrentTreePosition(tree, tp[1], false, true)
    } else {
        setCurrentTreePosition(tree, tree.nodes.length - 1, false, true)
    }
}

function makeMainVariation(tree, index) {
    setUndoable(true, 'Restore Main Variation')
    closeDrawers()

    var root = getRootTree()
    var level = gametree.getLevel(tree, index)
    var t = tree

    while (t.parent != null) {
        t.parent.subtrees.splice(t.parent.subtrees.indexOf(t), 1)
        t.parent.subtrees.unshift(t)
        t.parent.current = 0

        t = t.parent
    }

    setCurrentTreePosition(tree, index, true, true)
}

function removeNode(tree, index) {
    if (!tree.parent && index == 0) {
        showMessageBox('The root node cannot be removed.', 'warning')
        return
    }

    if (setting.get('edit.show_removenode_warning') && showMessageBox(
        'Do you really want to remove this node?',
        'warning',
        ['Remove Node', 'Cancel'], 1
    ) == 1) return

    // Save undo information

    setUndoable(true, 'Undo Remove Node')

    // Remove node

    closeDrawers()
    var prev = gametree.navigate(tree, index, -1)

    if (index != 0) {
        tree.nodes.splice(index, tree.nodes.length)
        tree.current = null
        tree.subtrees.length = 0
    } else {
        var parent = tree.parent
        var i = parent.subtrees.indexOf(tree)

        parent.subtrees.splice(i, 1)
        if (parent.current >= i) parent.current--
        gametree.reduceTree(parent)
    }

    setGraphMatrixDict(gametree.tree2matrixdict(getRootTree()))
    if (getCurrentGraphNode()) prev = getCurrentTreePosition()
    setCurrentTreePosition.apply(null, prev)
}

function undoBoard() {
    if ($('body').data('undodata-root') == null
    || $('body').data('undodata-pos') == null)
        return

    setIsBusy(true)

    setTimeout(function() {
        setRootTree($('body').data('undodata-root'))

        var pos = gametree.navigate(getRootTree(), 0, $('body').data('undodata-pos'))
        setCurrentTreePosition.apply(null, pos.concat([true, true]))

        setUndoable(false)
        setIsBusy(false)
    }, setting.get('edit.undo_delay'))
}

/**
 * Main events
 */

$(document).on('keydown', function(e) {
    if (e.keyCode == 27) {
        // Escape key

        if (!closeDrawers() && remote.getCurrentWindow().isFullScreen())
            setFullScreen(false)
    }
}).ready(function() {
    loadSettings()
    loadEngines()
    prepareDragDropFiles()
    prepareEditTools()
    prepareGameGraph()
    prepareSlider()
    prepareConsole()
    prepareGameInfo()
    newFile()

    $('#main, #graph canvas:last-child, #graph .slider').on('mousewheel', function(e) {
        e.preventDefault()
        if (e.wheelDelta < 0) goForward()
        else if (e.wheelDelta > 0) goBack()
    })
})

$(window).on('resize', function() {
    resizeBoard()
}).on('beforeunload', function(e) {
    if (!askForSave()) e.returnValue = 'false'

    detachEngine()

    var win = remote.getCurrentWindow()
    if (win.isMaximized() || win.isMinimized() || win.isFullScreen()) return

    setting
    .set('window.width', Math.round($('body').width()))
    .set('window.height', Math.round($('body').height()))
})
