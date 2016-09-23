let view

const fs = null
const remote = {getCurrentWindow: () => null}
const ipcRenderer = {send: () => {}}
const app = {getName: () => 'Sabaki', getVersion: () => 'web'}
const dialog = {showMessageBox: () => {}}
const Pikaday = require('pikaday')
const Menu = require('../modules/menu')

const $ = require('../modules/sprint')
const sgf = require('../modules/sgf')
const fuzzyfinder = require('../modules/fuzzyfinder')
const gametree = require('../modules/gametree')
const sound = require('../modules/sound')
const helper = require('../modules/helper')
const setting = require('../modules/setting')

/**
 * Getter & setter
 */

function getGameTrees() {
    let trees = $('body').data('gametrees')
    return trees ? trees : [getRootTree()]
}

function setGameTrees(trees) {
    trees.forEach(tree => { tree.parent = null })
    $('body').data('gametrees', trees)
}

function getGameIndex() {
    return getGameTrees().length == 1 ? 0 : $('body').data('gameindex')
}

function setGameIndex(index) {
    let trees = getGameTrees()
    $('body').data('gameindex', index)

    setGameTrees(trees)
    setRootTree(trees[index])
    view.updateTitle()
    setUndoable(false)
    if (setting.get('game.goto_end_after_loading')) goToEnd()
}

function getRootTree() {
    if (!getCurrentTreePosition()) return null
    return getGameTrees()[getGameIndex()]
}

function setRootTree(tree) {
    if (tree.nodes.length == 0) return

    let trees = getGameTrees()
    trees[getGameIndex()] = tree
    setGameTrees(trees)

    tree.parent = null
    setCurrentTreePosition(gametree.addBoard(tree), 0, true)

    view.setPlayerName(1,
        gametree.getPlayerName(1, tree, 'Black'),
        'BR' in tree.nodes[0] ? tree.nodes[0].BR[0] : ''
    )
    view.setPlayerName(-1,
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
    if (!view.getShowSidebar()) return

    let s, graph

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

function setCurrentTreePosition(tree, index, now, redraw, ignoreAutoplay) {
    if (!tree || view.getScoringMode() || view.getEstimatorMode()) return
    if (!ignoreAutoplay && getAutoplaying()) setAutoplaying(false)

    // Remove old graph node color

    let oldGraphNode = getCurrentGraphNode()
    let oldPos = getCurrentTreePosition()
    let graphNode = getGraphNode(tree, index)

    if (oldGraphNode && oldGraphNode != graphNode)
        oldGraphNode.color = oldGraphNode.originalColor

    // Store new position

    $('#goban').data('position', [tree, index])
    redraw = !!redraw
        || !graphNode
        || !gametree.onCurrentTrack(tree)
        || tree.collapsed

    let t = tree
    t.collapsed = false
    while (t.parent && t.parent.collapsed) {
        redraw = true
        t.parent.collapsed = false
        t = t.parent
    }

    // Update bookmark, graph, slider and comment text

    let node = tree.nodes[index]

    updateSidebar(redraw, now)
    view.setShowHotspot('HO' in node)
    gametree.addBoard(tree, index)
    setBoard(node.board)

    // Determine current player

    let currentplayer = 1

    if ('B' in node || 'HA' in node && +node.HA[0] >= 1)
        currentplayer = -1

    if ('PL' in node)
        currentplayer = node.PL[0] == 'W' ? -1 : 1

    view.setCurrentPlayer(currentplayer)
}

function getCurrentGraphNode() {
    let pos = getCurrentTreePosition()
    if (!pos) return null
    return getGraphNode(pos[0], pos[1])
}

function getGraphNode(tree, index) {
    let id = typeof tree === 'object' ? tree.id + '-' + index : tree
    let s = $('#graph').data('sigma')
    return s.graph.nodes(id)
}

function getSelectedTool() {
    let $li = $('#edit .selected')
    let tool = $li.attr('class').replace('selected', '').replace('-tool', '').trim()

    if (tool == 'stone') {
        return $li.find('img').attr('src').indexOf('_1') != -1 ? 'stone_1' : 'stone_-1'
    } else if (tool == 'line') {
        return $li.find('img').attr('src').indexOf('line') != -1 ? 'line' : 'arrow'
    } else {
        return tool
    }
}

function setSelectedTool(tool) {
    if (!view.getEditMode()) {
        view.setEditMode(true)
        if (getSelectedTool().indexOf(tool) >= 0) return
    }

    $('#goban').data('edittool-data', null)
    $('#edit .' + tool + '-tool a').trigger('click')
}

function getBoard() {
    return $('#goban').data('board')
}

function setBoard(board) {
    let $goban = $('#goban')

    if (!getBoard() || getBoard().width != board.width || getBoard().height != board.height) {
        $goban.data('board', board)
        view.buildBoard()
    }

    $goban.data('board', board)
    view.setCaptures(board.captures)

    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            let $li = $goban.find('.pos_' + x + '-' + y)
            let $span = $li.find('.stone span')
            let sign = board.arrangement[[x, y]]
            let types = ['ghost_1', 'ghost_-1', 'siblingghost_1', 'siblingghost_-1',
                'circle', 'triangle', 'cross', 'square', 'label', 'point',
                'dimmed', 'paint_1', 'paint_-1']

            // Clean up

            types.forEach(x => $li.hasClass(x) ? $li.removeClass(x) : null)
            $span.attr('title', '')

            // Add markups

            if ([x, y] in board.markups) {
                let markup = board.markups[[x, y]]
                let type = markup[0], label = markup[1]

                if (type != '') $li.addClass(type)
                if (label != '') $span.attr('title', label)
                $li.toggleClass('smalllabel', label.length >= 3)
            }

            // Set stone image

            if ($li.hasClass('sign_' + sign)) continue

            for (let i = -1; i <= 1; i++) {
                if ($li.hasClass('sign_' + i)) $li.removeClass('sign_' + i)
            }

            $li.addClass('sign_' + sign)
        }
    }

    // Add ghosts

    board.ghosts.forEach(x => {
        let [v, s, type] = x
        let $li = $('#goban .pos_' + v.join('-'))

        if (type == 'child') $li.addClass('ghost_' + s)
        else if (type == 'sibling') $li.addClass('siblingghost_' + s)
    })

    // Add lines

    $('#goban hr').remove()

    board.lines.forEach(line => {
        $goban.append(
            $('<hr/>')
            .addClass(line[2] ? 'arrow' : 'line')
            .data('v1', line[0])
            .data('v2', line[1])
        )
    })

    view.updateBoardLines()
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

    for (let sign = -1; sign <= 1; sign += 2) {
        let $tr = $('#score tbody tr' + (sign < 0 ? ':last-child' : ''))
        let $tds = $tr.find('td')

        $tds.eq(4).text(0)

        for (let i = 0; i <= 3; i++) {
            if ($tds.eq(i).hasClass('disabled') || isNaN(+$tds.eq(i).text())) continue
            $tds.eq(4).text(+$tds.eq(4).text() + +$tds.eq(i).text())
        }
    }

    let results = $('#score tbody td:last-child').get().map(td => $(td).text())
    let diff = +results[0] - +results[1]
    let result = diff > 0 ? 'B+' :  diff < 0 ? 'W+' : 'Draw'
    if (diff != 0) result = result + Math.abs(diff)

    $('#score .result').text(result)
}

function getKomi() {
    let rootNode = getRootTree().nodes[0]
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
        let rootTree = gametree.clone(getRootTree())
        let position = gametree.getLevel(...getCurrentTreePosition())
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
    let [tree, index] = getCurrentTreePosition()
    let node = tree.nodes[index]

    return 'HO' in node
}

function setHotspot(bookmark) {
    let [tree, index] = getCurrentTreePosition()
    let node = tree.nodes[index]

    if (bookmark) node.HO = [1]
    else delete node.HO

    updateGraph()
    view.setShowHotspot(bookmark)
}

function getEmptyGameTree() {
    let buffer = ';GM[1]FF[4]AP[' + app.getName() + ':' + app.getVersion() + ']'
        + 'CA[UTF-8]KM[' + setting.get('game.default_komi')
        + ']SZ[' + setting.get('game.default_board_size') + ']'

    return sgf.parse(sgf.tokenize(buffer))
}

function getAutoplaying() {
    return view.getAutoplayMode() && $('#autoplay').hasClass('playing')
}

function setAutoplaying(playing) {
    let autoplay = () => {
        if (!getAutoplaying()) return

        let ntp = gametree.navigate(...getCurrentTreePosition(), 1)
        if (!ntp) {
            setAutoplaying(false)
            return
        }

        let node = ntp[0].nodes[ntp[1]]

        if (!node.B && !node.W) {
            setCurrentTreePosition(...ntp, false, false, true)
        } else {
            let vertex = sgf.point2vertex(node.B ? node.B[0] : node.W[0])
            view.setCurrentPlayer(node.B ? 1 : -1)
            makeMove(vertex, false, true)
        }

        let id = setTimeout(autoplay, setting.get('autoplay.sec_per_move') * 1000)
        $('#autoplay').data('timeoutid', id)
    }

    if (playing) {
        view.setAutoplayMode(playing)
        $('#autoplay').addClass('playing')
        autoplay()
    } else {
        clearTimeout($('#autoplay').data('timeoutid'))
        $('#autoplay').removeClass('playing')
    }
}

/**
 * Methods
 */

function loadSettings() {
    $('head link.userstyle').attr('href', setting.stylesPath)

    $('#goban').toggleClass('fuzzy', setting.get('view.fuzzy_stone_placement'))
    $('#goban').toggleClass('animation', setting.get('view.animated_stone_placement'))
    $('#goban').toggleClass('coordinates', setting.get('view.show_coordinates'))
    $('#goban').toggleClass('variations', setting.get('view.show_next_moves'))
    $('#goban').toggleClass('siblings', setting.get('view.show_siblings'))

    if (setting.get('view.show_leftsidebar')) {
        $('body').addClass('leftsidebar')
        view.setLeftSidebarWidth(setting.get('view.leftsidebar_width'))
    }

    if (setting.get('view.show_graph') || setting.get('view.show_comments')) {
        $('body').addClass('sidebar')
        view.setSidebarArrangement(setting.get('view.show_graph'), setting.get('view.show_comments'))
        view.setSidebarWidth(setting.get('view.sidebar_width'))
    }
}

function prepareBars() {
    // Handle close buttons

    let bars = ['edit', 'guess', 'autoplay', 'scoring', 'estimator', 'find']

    bars.forEach(id => {
        let funcName = 'set' + id[0].toUpperCase() + id.slice(1) + 'Mode'
        $(`#${id} > .close`).on('click', () => view[funcName](false))
    })

    // Handle header bar

    $('header .undo').on('click', () => undoBoard())
    $('#headermenu').on('click', () => view.openHeaderMenu())

    // Handle autoplay bar

    $('#autoplay .play').on('click', () => setAutoplaying(!getAutoplaying()))

    // Handle scoring/estimator bar and drawer

    $('#scoring button, #estimator button').on('click', evt => {
        evt.preventDefault()
        view.showScore()
    })

    $('#score .tabs .area a').on('click', () => setScoringMethod('area'))
    $('#score .tabs .territory a').on('click', () => setScoringMethod('territory'))
    $('#score button[type="reset"]').on('click', () => view.closeScore())
    $('#score button[type="submit"]').on('click', evt => {
        evt.preventDefault()
        commitScore()
        view.closeScore()
    })

    // Handle find bar

    $('#find button').get().forEach((el, i) => {
        $(el).on('click', evt => {
            evt.preventDefault()
            findMove(view.getIndicatorVertex(), view.getFindText(), 1 - i * 2)
        })
    })

    // Handle current player toggler

    $('.current-player').on('click', function() {
        let [tree, index] = getCurrentTreePosition()
        let node = tree.nodes[index]
        let intendedSign = 'B' in node ? -1 : +('W' in node)
        let sign = -view.getCurrentPlayer()

        if (intendedSign == sign) {
            delete node.PL
        } else {
            node.PL = [sign > 0 ? 'B' : 'W']
        }

        view.setCurrentPlayer(sign)
    })
}

function prepareEditTools() {
    $('#edit ul a').on('click', function() {
        let $a = $(this)
        let $img = $a.find('img')

        if (!$a.parent().hasClass('selected')) {
            $('#edit .selected').removeClass('selected')
            $a.parent().addClass('selected')
        } else if ($a.parent().hasClass('stone-tool')) {
            let black = $img.attr('src').indexOf('_1') >= 0
            $img.attr('src', black ? '../img/edit/stone_-1.svg' : '../img/edit/stone_1.svg')
        } else if ($a.parent().hasClass('line-tool')) {
            let line = $img.attr('src').indexOf('line') >= 0
            $img.attr('src', line ? '../img/edit/arrow.svg' : '../img/edit/line.svg')
        }
    })
}

function prepareAutoplay() {
    $('#autoplay input').on('input', function() {
        let value = Math.min(10, Math.max(1, +$(this).val()))
        value = Math.floor(value * 10) / 10
        setting.set('autoplay.sec_per_move', value)
    }).on('blur', function() {
        $(this).val(setting.get('autoplay.sec_per_move'))
    })
}

function prepareSidebar() {
    // Prepare comments section

    $('#properties .header .edit-button').on('click', () => view.setEditMode(true))
    $('#properties .edit .header img').on('click', () => view.openCommentMenu())

    $('#properties .edit .header input, #properties .edit textarea').on('input', () => commitCommentText())

    // Prepare game graph

    let $container = $('#graph')
    let s = new sigma({
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

    let getTreePos = evt => [evt.data.node.data[0], evt.data.node.data[1]]

    s.bind('clickNode', function(evt) {
        setCurrentTreePosition(...getTreePos(evt), true)
    }).bind('rightClickNode', function(evt) {
        let pos = [evt.data.captor.clientX, evt.data.captor.clientY]
        view.openNodeMenu(...getTreePos(evt), pos.map(x => Math.round(x)))
    })

    $container.data('sigma', s)
}

function prepareSlider() {
    let $slider = $('#sidebar .slider .inner')

    let changeSlider = percentage => {
        percentage = Math.min(1, Math.max(0, percentage))

        let level = Math.round((gametree.getHeight(getRootTree()) - 1) * percentage)
        let tp = gametree.navigate(getRootTree(), 0, level)
        if (!tp) tp = gametree.navigate(getRootTree(), 0, gametree.getCurrentHeight(getRootTree()) - 1)

        if (helper.equals(tp, getCurrentTreePosition())) return
        setCurrentTreePosition(...tp)
        updateSlider()
    }

    let mouseMoveHandler = evt => {
        if (evt.button != 0 || !$slider.data('mousedown'))
            return

        let percentage = (evt.clientY - $slider.offset().top) / $slider.height()
        changeSlider(percentage)
        document.onselectstart = function() { return false }
    }

    $slider.on('mousedown', function(evt) {
        if (evt.button != 0) return

        $(this).data('mousedown', true).addClass('active')
        mouseMoveHandler(evt)
    }).on('touchstart', function() {
        $(this).addClass('active')
    }).on('touchmove', function(evt) {
        let percentage = (evt.client.y - $slider.offset().top) / $slider.height()
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
    $('body').on('dragover', function(evt) {
        evt.preventDefault()
    }).on('drop', function(evt) {
        evt.preventDefault()

        if (evt.dataTransfer.files.length == 0) return
        loadFile(evt.dataTransfer.files[0].path)
    })
}

function prepareConsole() {}

function prepareGameInfo() {
    $('#info button[type="submit"]').on('click', function(evt) {
        evt.preventDefault()
        commitGameInfo()
        view.closeGameInfo()
    })

    $('#info button[type="reset"]').on('click', function(evt) {
        evt.preventDefault()
        view.closeGameInfo()
    })

    $('#info .current-player').on('click', function() {
        let data = $('#info section input[type="text"]').get().map(el => $(el).val())

        $('#info section input[name="rank_1"]').val(data[3])
        $('#info section input[name="rank_-1"]').val(data[0])
        $('#info section input[name="name_1"]').val(data[2])
        $('#info section input[name="name_-1"]').val(data[1])

        data = $('#info section .menu').get().map(el => {
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
        let $el = $(this)

        let selectEngine = (el, engine, i) => {
            let currentIndex = $(this).data('engineindex')
            if (currentIndex == null) currentIndex = -1
            if (i == currentIndex) return

            $(el).parent().find('input[name^="name_"]').val(engine ? engine.name : '')
            $(el).data('engineindex', i)

            if (engine) {
                let els = $('#info section .menu').get()
                let other = els[0] == el ? els[1] : els[0]
                if (other) selectEngine(other, null, -1)

                $(el).addClass('active')
            } else {
                $('#info').find('section .menu')
                .removeClass('active')
            }
        }

        view.openEnginesMenu($el, (engine, i) => selectEngine($el.get(0), engine, i))
    })

    // Prepare date input

    let $dateInput = $('#info input[name="date"]')

    let adjustPosition = pikaday => {
        $(pikaday.el)
        .css('position', 'absolute')
        .css('left', Math.round($dateInput.offset().left))
        .css('top', Math.round($dateInput.offset().top - $(pikaday.el).height()))
    }

    let markDates = pikaday => {
        let dates = (sgf.string2dates($dateInput.val()) || []).filter(x => x.length == 3)

        $(pikaday.el).find('.pika-button').get().forEach(el => {
            let year = +$(el).attr('data-pika-year')
            let month = +$(el).attr('data-pika-month')
            let day = +$(el).attr('data-pika-day')

            $(el).parent().toggleClass('is-multi-selected', dates.some(d => {
                return helper.equals(d, [year, month + 1, day])
            }))
        })
    }

    let pikaday = new Pikaday({
        position: 'top left',
        firstDay: 1,
        yearRange: 6,
        onOpen() {
            let dates = (sgf.string2dates($dateInput.val()) || []).filter(x => x.length == 3)

            if (dates.length > 0) {
                this.setDate(dates[0].join('-'), true)
            } else {
                this.gotoToday()
            }

            adjustPosition(this)
        },
        onDraw() {
            if (!this.isVisible()) return

            adjustPosition(this)
            markDates(this)

            $dateInput.get(0).focus()
        },
        onSelect() {
            let dates = sgf.string2dates($dateInput.val()) || []
            let date = this.getDate()
            date = [date.getFullYear(), date.getMonth() + 1, date.getDate()]

            if (!dates.some(x => helper.equals(x, date))) {
                dates.push(date)
            } else {
                dates = dates.filter(x => !helper.equals(x, date))
            }

            $dateInput.val(sgf.dates2string(dates.sort(helper.lexicalCompare)))
        }
    })

    $dateInput.data('pikaday', pikaday)
    pikaday.hide()

    $('body').append(pikaday.el).on('click', function(evt) {
        if (pikaday.isVisible()
        && document.activeElement != $dateInput.get(0)
        && evt.target != $dateInput.get(0)
        && $(evt.target).parents('.pika-lendar').length == 0)
            pikaday.hide()
    })

    $(window).on('resize', function() { adjustPosition(pikaday) })

    $dateInput.on('focus', function() {
        pikaday.show()
    }).on('blur', function() {
        setTimeout(() => {
            if ($(document.activeElement).parents('.pika-lendar').length == 0)
                pikaday.hide()
        }, 50)
    }).on('input', function() {
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

        let $widthInput = $('#info input[name="size-width"]')
        let $heightInput = $('#info input[name="size-height"]')
        let data = [$widthInput.val(), $heightInput.val()]
        $widthInput.val(data[1])
        $heightInput.val(data[0])
    })
}

function preparePreferences() {
    $('#preferences .tabs .general').on('click', () => view.setPreferencesTab('general'))
    $('#preferences .tabs .engines').on('click', () => view.setPreferencesTab('engines'))

    $('#preferences form .engines button').on('click', evt => {
        evt.preventDefault()
        view.addEngineItem()
    })

    $('#preferences button[type="submit"]').on('click', evt => {
        evt.preventDefault()
        commitPreferences()
        view.closePreferences()
    })

    $('#preferences button[type="reset"]').on('click', () => view.closePreferences())
}

function generateFileHash() {
    let trees = getGameTrees()
    let hash = ''

    for (let i = 0; i < trees.length; i++) {
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

    setting.getEngines().forEach(engine => {
        view.addEngineItem(engine.name, engine.path, engine.args)
    })
}

function attachEngine(exec, args, genMove) {}

function detachEngine() {}

function syncEngine() {}

function makeMove(vertex, sendCommand = null, ignoreAutoplay = false) {
    if (!view.getPlayMode() && !view.getAutoplayMode() && !view.getGuessMode()) return
    if (sendCommand == null) sendCommand = getEngineController() != null

    let pass = !getBoard().hasVertex(vertex)
    if (!pass && getBoard().arrangement[vertex] != 0) return

    let position = getCurrentTreePosition()
    let tree = position[0], index = position[1]
    let sign = view.getCurrentPlayer()
    let color = sign > 0 ? 'B' : 'W'
    let capture = false, suicide = false
    let createNode = true

    if (sendCommand) syncEngine()

    if (!pass) {
        // Check for ko
        if (setting.get('game.show_ko_warning')) {
            let tp = gametree.navigate(tree, index, -1)
            let ko = false

            if (tp) {
                let hash = getBoard().makeMove(sign, vertex).getHash()
                ko = tp[0].nodes[tp[1]].board.getHash() == hash
            }

            if (ko && view.showMessageBox(
                ['You are about to play a move which repeats a previous board position.',
                'This is invalid in some rulesets.'].join('\n'),
                'info',
                ['Play Anyway', 'Don’t Play'], 1
            ) != 0) return
        }

        let vertexNeighbors = getBoard().getNeighbors(vertex)

        // Check for suicide
        capture = vertexNeighbors
            .some(v => getBoard().arrangement[v] == -sign && getBoard().getLiberties(v).length == 1)

        suicide = !capture
        && vertexNeighbors.filter(v => getBoard().arrangement[v] == sign)
            .every(v =>getBoard().getLiberties(v).length == 1)
        && vertexNeighbors.filter(v => getBoard().arrangement[v] == 0).length == 0

        if (suicide && setting.get('game.show_suicide_warning')) {
            if (view.showMessageBox(
                ['You are about to play a suicide move.',
                'This is invalid in some rulesets.'].join('\n'),
                'info',
                ['Play Anyway', 'Don’t Play'], 1
            ) != 0) return
        }

        // Randomize shift and readjust
        let $li = $('#goban .pos_' + vertex.join('-'))
        let direction = Math.floor(Math.random() * 9)

        $li.addClass('animate')
        for (let i = 0; i < 9; i++) $li.removeClass('shift_' + i)
        $li.addClass('shift_' + direction)
        setTimeout(() => $li.removeClass('animate'), 200)

        view.readjustShifts(vertex)
    }

    if (tree.current == null && tree.nodes.length - 1 == index) {
        // Append move
        let node = {}
        node[color] = [sgf.vertex2point(vertex)]
        tree.nodes.push(node)

        setCurrentTreePosition(tree, tree.nodes.length - 1, null, null, ignoreAutoplay)
    } else {
        if (index != tree.nodes.length - 1) {
            // Search for next move

            let nextNode = tree.nodes[index + 1]
            let moveExists = color in nextNode
                && helper.equals(sgf.point2vertex(nextNode[color][0]), vertex)

            if (moveExists) {
                setCurrentTreePosition(tree, index + 1, null, null, ignoreAutoplay)
                createNode = false
            }
        } else {
            // Search for variation

            let variations = tree.subtrees.filter(subtree => {
                return subtree.nodes.length > 0
                    && color in subtree.nodes[0]
                    && helper.equals(sgf.point2vertex(subtree.nodes[0][color][0]), vertex)
            })

            if (variations.length > 0) {
                setCurrentTreePosition(gametree.addBoard(variations[0]), 0, null, null, ignoreAutoplay)
                createNode = false
            }
        }

        if (createNode) {
            // Create variation

            let updateRoot = tree == getRootTree()
            let splitted = gametree.splitTree(tree, index)
            let newtree = gametree.new()
            let node = {}

            node[color] = [sgf.vertex2point(vertex)]
            newtree.nodes = [node]
            newtree.parent = splitted

            splitted.subtrees.push(newtree)
            splitted.current = splitted.subtrees.length - 1

            gametree.addBoard(newtree, newtree.nodes.length - 1)
            if (updateRoot) setRootTree(splitted)
            setCurrentTreePosition(newtree, 0, null, null, ignoreAutoplay)
        }
    }

    // Play sounds

    if (!pass) {
        let delay = setting.get('sound.capture_delay_min')
        delay += Math.floor(Math.random() * (setting.get('sound.capture_delay_max') - delay))

        if (capture || suicide)
            setTimeout(() => sound.playCapture(), delay)

        sound.playPachi()
    } else {
        sound.playPass()
    }

    // Remove undo information

    setUndoable(false)

    // Enter scoring mode when two consecutive passes

    let enterScoring = false

    if (pass && createNode) {
        let tp = getCurrentTreePosition()
        let ptp = gametree.navigate(...tp, -1)

        if (ptp) {
            let prevNode = ptp[0].nodes[ptp[1]]
            let prevColor = sign > 0 ? 'W' : 'B'
            let prevPass = prevColor in prevNode && prevNode[prevColor][0] == ''

            if (prevPass) {
                enterScoring = true
                view.setScoringMode(true)
            }
        }
    }

    // Handle GTP engine

    if (sendCommand && !enterScoring) {
        let command = new gtp.Command(null, 'play', [color, pass ? 'pass' : getBoard().vertex2coord(vertex)])
        sendGTPCommand(command, true)

        $('#console').data('boardhash', getBoard().getHash())

        view.setIsBusy(true)
        setTimeout(() => generateMove(true), setting.get('gtp.move_delay'))
    }
}

function makeResign(sign) {
    if (!sign) sign = view.getCurrentPlayer()

    view.showGameInfo()
    let player = sign > 0 ? 'W' : 'B'
    $('#info input[name="result"]').val(player + '+Resign')
}

function useTool(vertex, evt) {
    let [tree, index] = getCurrentTreePosition()
    let node = tree.nodes[index]
    let tool = getSelectedTool()
    let board = getBoard()
    let dictionary = {
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

            let updateRoot = tree == getRootTree()
            let splitted = gametree.splitTree(tree, index)

            if (splitted != tree || splitted.subtrees.length != 0) {
                tree = gametree.new()
                tree.parent = splitted
                splitted.subtrees.push(tree)
            }

            node = {PL: view.getCurrentPlayer() > 0 ? ['B'] : ['W']}
            index = tree.nodes.length
            tree.nodes.push(node)

            if (updateRoot) setRootTree(splitted)
        }

        let sign = tool.indexOf('_1') != -1 ? 1 : -1
        if (evt.button == 2) sign = -sign

        let oldSign = board.arrangement[vertex]
        let ids = ['AW', 'AE', 'AB']
        let id = ids[sign + 1]
        let point = sgf.vertex2point(vertex)

        for (let i = 0; i <= 2; i++) {
            if (!(ids[i] in node)) continue

            // Resolve compressed lists

            if (node[ids[i]].some(x => x.indexOf(':') >= 0)) {
                node[ids[i]] = node[ids[i]]
                .map(value => sgf.compressed2list(value).map(sgf.vertex2point))
                .reduce((list, x) => list.concat(x))
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

        let $hr = $('#goban').data('edittool-data')

        if ($hr) {
            let v1 = $hr.data('v1'), v2 = $hr.data('v2')
            let toDelete = $('#goban hr').get().filter(x => {
                let w1 = $(x).data('v1'), w2 = $(x).data('v2')
                let result = x != $hr.get(0)
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

        $('#goban hr').get().forEach(hr => {
            let p1 = sgf.vertex2point($(hr).data('v1'))
            let p2 = sgf.vertex2point($(hr).data('v2'))

            if (p1 == p2) return

            node[$(hr).hasClass('arrow') ? 'AR' : 'LN'].push(p1 + ':' + p2)
            board.lines.push([$(hr).data('v1'), $(hr).data('v2'), $(hr).hasClass('arrow')])
        })

        if (node.LN.length == 0) delete node.LN
        if (node.AR.length == 0) delete node.AR
    } else {
        if (evt.button != 0) return

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
                let number = 1

                if ('LB' in node) {
                    let list = node.LB
                        .map(x => parseFloat(x.substr(3)))
                        .filter(x => !isNaN(x))
                    list.sort((a, b) => a - b)

                    for (let i = 0; i <= list.length; i++) {
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
                let alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
                let k = 0

                if ('LB' in node) {
                    let list = node.LB
                        .filter(x => x.length == 4)
                        .map(x => alpha.indexOf(x[3]))
                        .filter(x => x >= 0)
                    list.sort((a, b) => a - b)

                    for (let i = 0; i <= list.length; i++) {
                        if (i < list.length && i == list[i]) continue
                        k = Math.min(i, alpha.length - 1)
                        break
                    }
                }

                board.markups[vertex] = [tool, alpha[k]]
            }
        }

        for (let id in dictionary) delete node[dictionary[id]]

        // Update SGF

        $('#goban .row li').get().forEach(li => {
            let v = $(li).data('vertex')
            if (!(v in board.markups)) return

            let id = dictionary[board.markups[v][0]]
            let pt = sgf.vertex2point(v)
            if (id == 'LB') pt += ':' + board.markups[v][1]

            if (id in node) node[id].push(pt)
            else node[id] = [pt]
        })
    }

    setUndoable(false)
    setCurrentTreePosition(tree, index)
}

function drawLine(vertex) {
    let tool = getSelectedTool()

    if (!vertex || !view.getEditMode() || tool != 'line' && tool != 'arrow') return

    if (!$('#goban').data('edittool-data')) {
        let $hr = $('<hr/>').addClass(tool).data('v1', vertex).data('v2', vertex)
        $('#goban').append($hr).data('edittool-data', $hr)
    } else {
        let $hr = $('#goban').data('edittool-data')
        $hr.data('v2', vertex)
    }

    view.updateBoardLines()
}

function findPosition(step, condition) {
    if (isNaN(step)) step = 1
    else step = step >= 0 ? 1 : -1

    view.setIsBusy(true)

    setTimeout(() => {
        let tp = getCurrentTreePosition()
        let iterator = gametree.makeNodeIterator(...tp)

        while (true) {
            tp = step >= 0 ? iterator.next() : iterator.prev()

            if (!tp) {
                let root = getRootTree()

                if (step == 1) {
                    tp = [root, 0]
                } else {
                    let sections = gametree.getSection(root, gametree.getHeight(root) - 1)
                    tp = sections[sections.length - 1]
                }

                iterator = gametree.makeNodeIterator(...tp)
            }

            if (helper.equals(tp, getCurrentTreePosition()) || condition(...tp)) break
        }

        setCurrentTreePosition(...tp)
        view.setIsBusy(false)
    }, setting.get('find.delay'))
}

function findBookmark(step) {
    findPosition(step, (tree, index) => 'HO' in tree.nodes[index])
}

function findMove(vertex, text, step) {
    if (vertex == null && text.trim() == '') return
    let point = vertex ? sgf.vertex2point(vertex) : null

    findPosition(step, (tree, index) => {
        let node = tree.nodes[index]
        let cond = (prop, value) => prop in node
            && node[prop][0].toLowerCase().indexOf(value.toLowerCase()) >= 0

        return (!point || ['B', 'W'].some(x => cond(x, point)))
            && (!text || cond('C', text) || cond('N', text))
    })
}

function vertexClicked(vertex, evt) {
    view.closeGameInfo()

    if (view.getScoringMode() || view.getEstimatorMode()) {
        if ($('#score').hasClass('show')) return
        if (evt.button != 0) return
        if (getBoard().arrangement[vertex] == 0) return

        let dead = !$('#goban .pos_' + vertex.join('-')).hasClass('dead')
        let stones = view.getEstimatorMode() ? getBoard().getChain(vertex) : getBoard().getRelatedChains(vertex)

        stones.forEach(v => {
            $('#goban .pos_' + v.join('-')).toggleClass('dead', dead)
        })

        updateAreaMap(view.getEstimatorMode())
    } else if (view.getEditMode()) {
        if (evt.ctrlKey) {
            let coord = getBoard().vertex2coord(vertex)

            view.setCommentText([view.getCommentText().trim(), coord].join(' ').trim())
            commitCommentText()
        } else {
            useTool(vertex, evt)
        }
    } else if (view.getFindMode()) {
        if (evt.button != 0) return

        view.setIndicatorVertex(vertex)
        findMove(view.getIndicatorVertex(), view.getFindText(), 1)
    } else if (view.getGuessMode()) {
        if (evt.button != 0) return

        let tp = gametree.navigate(...getCurrentTreePosition(), 1)
        if (!tp) {
            view.setGuessMode(false)
            return
        }

        let nextNode = tp[0].nodes[tp[1]]

        if ('B' in nextNode) view.setCurrentPlayer(1)
        else if ('W' in nextNode) view.setCurrentPlayer(-1)
        else {
            view.setGuessMode(false)
            return
        }

        let color = view.getCurrentPlayer() > 0 ? 'B' : 'W'
        let nextVertex = sgf.point2vertex(nextNode[color][0])
        let board = getBoard()

        if (!board.hasVertex(nextVertex)) {
            view.setGuessMode(false)
            return
        }

        if (vertex[0] == nextVertex[0] && vertex[1] == nextVertex[1]) {
            makeMove(vertex)
        } else {
            if (board.arrangement[vertex] != 0) return
            if ($('#goban .pos_' + vertex.join('-')).hasClass('paint_1')) return

            let i = 0
            if (Math.abs(vertex[1] - nextVertex[1]) > Math.abs(vertex[0] - nextVertex[0]))
                i = 1

            for (let x = 0; x < board.width; x++) {
                for (let y = 0; y < board.height; y++) {
                    let z = i == 0 ? x : y
                    if (Math.abs(z - vertex[i]) < Math.abs(z - nextVertex[i]))
                        $('#goban .pos_' + x + '-' + y).addClass('paint_1')
                }
            }
        }
    } else {
        // Playing mode

        if (evt.button != 0) return
        let board = getBoard()

        if (board.arrangement[vertex] == 0) {
            makeMove(vertex)
            view.closeDrawers()
        } else if (vertex in board.markups
        && board.markups[vertex][0] == 'point'
        && setting.get('edit.click_currentvertex_to_remove')) {
            removeNode(...getCurrentTreePosition())
        }
    }
}

function updateSidebar(redraw = false, now = false) {
    clearTimeout($('#sidebar').data('updatesidebarid'))

    let [tree, index] = getCurrentTreePosition()

    $('#sidebar').data('updatesidebarid', setTimeout(() => {
        if (!helper.equals(getCurrentTreePosition(), [tree, index]))
            return

        // Set current path

        let t = tree
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
    if (!view.getShowSidebar() || !getCurrentTreePosition()) return

    setGraphMatrixDict(gametree.tree2matrixdict(getRootTree()))
    centerGraphCameraAt(getCurrentGraphNode())
}

function updateSlider() {
    if (!view.getShowSidebar()) return

    let [tree, index] = getCurrentTreePosition()
    let total = gametree.getHeight(getRootTree()) - 1
    let relative = gametree.getLevel(tree, index)

    view.setSliderValue(total == 0 ? 0 : relative * 100 / total, relative)
}

function updateCommentText() {
    let [tree, index] = getCurrentTreePosition()
    let node = tree.nodes[index]

    view.setCommentText('C' in node ? node.C[0] : '')
    view.setCommentTitle('N' in node ? node.N[0] : '')

    view.setAnnotations(...(() => {
        if ('UC' in node) return [-2, node.UC[0]]
        if ('GW' in node) return [-1, node.GW[0]]
        if ('DM' in node) return [0, node.DM[0]]
        if ('GB' in node) return [1, node.GB[0]]
        return [null, null]
    })(), ...(() => {
        if ('BM' in node) return [-1, node.BM[0]]
        if ('TE' in node) return [2, node.TE[0]]
        if ('DO' in node) return [0, 1]
        if ('IT' in node) return [1, 1]
        return [null, null]
    })())

    $('#properties, #properties .gm-scroll-view').scrollTop(0)
    $('#properties').data('scrollbar').update()
}

function updateAreaMap(useEstimateMap) {
    let board = getBoard().clone()

    $('#goban .row li.dead').get().forEach(li => {
        if ($(li).hasClass('sign_1')) board.captures['-1']++
        else if ($(li).hasClass('sign_-1')) board.captures['1']++

        board.arrangement[$(li).data('vertex')] = 0
    })

    let map = useEstimateMap ? board.getAreaEstimateMap() : board.getAreaMap()

    $('#goban .row li').get().forEach(li => {
        $(li)
        .removeClass('area_-1').removeClass('area_0').removeClass('area_1')
        .addClass('area_' + map[$(li).data('vertex')])
    })

    if (!useEstimateMap) {
        let $falsedead = $('#goban .row li.area_-1.sign_-1.dead, #goban .row li.area_1.sign_1.dead')

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
    let [tree, index] = getCurrentTreePosition()
    let node = tree.nodes[index]
    let title = view.getCommentTitle()
    let comment = view.getCommentText()

    if (comment != '') node.C = [comment]
    else delete node.C

    if (title != '') node.N = [title]
    else delete node.N

    updateSidebar(true)
    setUndoable(false)
}

function commitGameInfo() {
    let rootNode = getRootTree().nodes[0]
    let $info = $('#info')

    let data = {
        'rank_1': 'BR',
        'rank_-1': 'WR',
        'name_1': 'PB',
        'name_-1': 'PW',
        'result': 'RE',
        'name': 'GN',
        'event': 'EV',
        'date': 'DT'
    }

    for (let name in data) {
        let value = $info.find('input[name="' + name + '"]').val().trim()
        rootNode[data[name]] = [value]
        if (value == '') delete rootNode[data[name]]
    }

    view.setPlayerName(1,
        gametree.getPlayerName(1, getRootTree(), 'Black'),
        'BR' in rootNode ? rootNode.BR[0] : ''
    )
    view.setPlayerName(-1,
        gametree.getPlayerName(-1, getRootTree(), 'White'),
        'WR' in rootNode ? rootNode.WR[0] : ''
    )

    // Handle komi

    let komi = +$info.find('input[name="komi"]').val()
    if (isNaN(komi)) komi = 0
    rootNode.KM = ['' + komi]

    // Handle size

    let size = ['width', 'height'].map(x => {
        let num = parseFloat($info.find('input[name="size-' + x + '"]').val())
        if (isNaN(num)) num = setting.get('game.default_board_size')
        return Math.min(Math.max(num, 3), 25)
    })

    if (size[0] == size[1]) rootNode.SZ = ['' + size[0]]
    else rootNode.SZ = [size.join(':')]

    // Handle handicap stones

    let $handicapInput = $info.find('select[name="handicap"]')
    let handicap = $handicapInput.get(0).selectedIndex

    if (!$handicapInput.get(0).disabled) {
        setCurrentTreePosition(getRootTree(), 0)

        if (handicap == 0) {
            delete rootNode.AB
            delete rootNode.HA
        } else {
            let board = getBoard()
            let stones = board.getHandicapPlacement(handicap + 1)

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

        let engines = setting.getEngines()
        let indices = $('#info section .menu').get().map(x => $(x).data('engineindex'))
        let max = Math.max(...indices)
        let sign = indices.indexOf(max) == 0 ? 1 : -1

        if (max >= 0) {
            let engine = engines[max]
            attachEngine(engine.path, engine.args, view.getCurrentPlayer() == sign)
        } else {
            detachEngine()
        }
    } else {
        // Update komi

        let command = new gtp.Command(null, 'komi', [komi])
        sendGTPCommand(command, true)
    }
}

function commitScore() {
    let result = $('#score .result').text()

    view.showGameInfo()
    $('#info input[name="result"]').val(result)

    setUndoable(false)
}

function commitPreferences() {
    // Save general preferences

    $('#preferences input[type="checkbox"]').get()
        .forEach(el => setting.set(el.name, el.checked))

    remote.getCurrentWindow().webContents.setAudioMuted(!setting.get('sound.enable'))
    view.setFuzzyStonePlacement(setting.get('view.fuzzy_stone_placement'))
    view.setAnimatedStonePlacement(setting.get('view.animated_stone_placement'))

    // Save engines

    setting.clearEngines()

    $('#preferences .engines-list li').get().forEach(li => {
        let $nameinput = $(li).find('h3 input')

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

function sendGTPCommand(command, ignoreBlocked = false, callback = () => {}) {
    if (!getEngineController()) {
        $('#console form:last-child input').val('')
        return
    }

    let controller = getEngineController()
    let $container = $('#console .inner')
    let $oldform = $container.find('form:last-child')
    let $form = $oldform.clone(true)
    let $pre = $('<pre/>').text(' ')

    $form.find('input').val('')
    $oldform.addClass('waiting').find('input').val(command.toString())
    $container.append($pre).append($form)
    if (view.getShowLeftSidebar()) $form.find('input').get(0).focus()

    // Cleanup
    let $forms = $('#console .inner form')
    if ($forms.length > setting.get('console.max_history_count')) {
        $forms.eq(0).next('pre').remove()
        $forms.eq(0).remove()
    }

    let listener = (response, c) => {
        $pre.html(response.toHtml())
        view.wireLinks($pre)
        $oldform.removeClass('waiting')
        callback(response)

        // Update scrollbars

        let $view = $('#console.gm-prevented, #console.gm-scrollbar-container .gm-scroll-view')
        let scrollbar = $('#console').data('scrollbar')

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

function generateMove(ignoreBusy = false) {}

function centerGraphCameraAt(node) {
    if (!view.getShowSidebar() || !node) return

    let s = $('#graph').data('sigma')
    s.renderers[0].resize().render()

    let matrixdict = getGraphMatrixDict()
    let y = matrixdict[1][node.id][1]

    let wp = gametree.getSectionWidth(y, matrixdict[0])
    let width = wp[0], padding = wp[1]
    let x = matrixdict[1][node.id][0] - padding
    let relX = width == 1 ? 0 : x / (width - 1)
    let diff = (width - 1) * setting.get('graph.grid_size') / 2
    diff = Math.min(diff, s.renderers[0].width / 2 - setting.get('graph.grid_size'))

    node.color = setting.get('graph.node_active_color')
    s.refresh()

    sigma.misc.animation.camera(
        s.camera,
        {
            x: node[s.camera.readPrefix + 'x'] + (1 - 2 * relX) * diff,
            y: node[s.camera.readPrefix + 'y']
        },
        {duration: setting.get('graph.delay')}
    )
}

function askForSave() {
    if (!getRootTree()) return true
    let hash = generateFileHash()

    if (hash != getFileHash()) {
        let answer = view.showMessageBox(
            'Your changes will be lost if you close this file without saving. Do you want to proceed?',
            'warning',
            ['Save', 'Don’t Save', 'Cancel'], 2
        )

        if (answer == 2) return false
    }

    return true
}

function startAutoScroll(direction, delay) {
    if (direction > 0 && !$('#sidebar .slider a.next').data('mousedown')
    || direction < 0 && !$('#sidebar .slider a.prev').data('mousedown')) return

    if (delay == null) delay = setting.get('autoscroll.max_interval')
    delay = Math.max(setting.get('autoscroll.min_interval'), delay)

    let $slider = $('#sidebar .slider')
    clearTimeout($slider.data('autoscrollid'))

    if (direction > 0) goForward()
    else goBack()
    updateSlider()

    $slider.data('autoscrollid', setTimeout(() => {
        startAutoScroll(direction, delay - setting.get('autoscroll.diff'))
    }, delay))
}

/**
 * Menu
 */

function newFile(playSound) {
    if (view.getIsBusy() || !askForSave()) return

    view.closeDrawers()
    setGameTrees([getEmptyGameTree()])
    view.setRepresentedFilename(null)
    setGameIndex(0)
    updateFileHash()

    if (playSound) {
        sound.playNewGame()
        view.showGameInfo()
    }
}

function loadFile(filename) {
    if (view.getIsBusy() || !askForSave()) return

    $('#fileinput').val('').off('change').on('change', function(evt) {
        let f = evt.target.files[0]

        if (f) {
            let r = new FileReader()

            r.onload = e => {
                let contents = e.target.result

                loadFileFromSgf(contents, true, err => {
                    if (!err) view.setRepresentedFilename(f.name)
                })
            }

            r.readAsText(f)
        } else {
            alert('Failed to load file.')
        }
    }).get(0).click()
}

function loadFileFromSgf(content, dontask = false, callback = () => {}) {
    if (view.getIsBusy() || !dontask && !askForSave()) return
    view.setIsBusy(true)
    view.closeDrawers()

    setTimeout(() => {
        let win = remote.getCurrentWindow()
        let lastprogress = -1
        let error = false
        let trees = []

        try {
            trees = sgf.parse(sgf.tokenize(content), progress => {
                if (progress - lastprogress < 0.05) return

                view.setProgressIndicator(progress, win)
                lastprogress = progress
            }).subtrees

            if (trees.length == 0) throw true
        } catch(e) {
            view.showMessageBox('This file is unreadable.', 'warning')
            error = true
        }

        if (trees.length != 0) {
            setGameTrees(trees)
            setGameIndex(0)
            updateFileHash()
        }

        if (trees.length > 1)
            setTimeout(view.showGameChooser, setting.get('gamechooser.show_delay'))

        view.setProgressIndicator(-1, win)
        view.setIsBusy(false)
        callback(error)
    }, setting.get('app.loadgame_delay'))
}

function saveFile() {
    if (view.getIsBusy()) return

    let sgf = saveFileToSgf()
    let link = 'data:application/x-go-sgf;charset=utf-8,' + encodeURIComponent(sgf)
    let $el = $('<a/>')
    .attr('download', view.getRepresentedFilename() || 'game.sgf')
    .attr('href', link)
    .css('display', 'none')

    $('body').append($el)
    $el.get(0).click()
    $el.remove()

    updateFileHash()
}

function saveFileToSgf() {
    let trees = getGameTrees()
    let text = ''

    for (let i = 0; i < trees.length; i++) {
        trees[i].nodes[0].AP = [app.getName() + ':' + app.getVersion()]
        text += '(' + sgf.stringify(trees[i]) + ')\n\n'
    }

    return text
}

function clearMarkup() {
    view.closeDrawers()
    let markupIds = ['MA', 'TR', 'CR', 'SQ', 'LB', 'AR', 'LN']

    // Save undo information
    setUndoable(true, 'Restore Markup')

    let [tree, index] = getCurrentTreePosition()
    markupIds.forEach(id => delete tree.nodes[index][id])

    setCurrentTreePosition(tree, index)
}

function goStep(step) {
    if (view.getGuessMode()) return

    let [tree, index] = getCurrentTreePosition()
    let tp = gametree.navigate(tree, index, step)
    if (tp) setCurrentTreePosition(...tp)
}

function goBack() {
    goStep(-1)
}

function goForward() {
    goStep(1)
}

function goToNextFork() {
    let [tree, index] = getCurrentTreePosition()

    if (index != tree.nodes.length - 1)
        setCurrentTreePosition(tree, tree.nodes.length - 1)
    else if (tree.current != null) {
        let subtree = tree.subtrees[tree.current]
        setCurrentTreePosition(subtree, subtree.nodes.length - 1)
    }
}

function goToPreviousFork() {
    let [tree, index] = getCurrentTreePosition()

    if (tree.parent == null || tree.parent.nodes.length == 0) {
        if (index != 0) setCurrentTreePosition(tree, 0)
    } else {
        setCurrentTreePosition(tree.parent, tree.parent.nodes.length - 1)
    }
}

function goToComment(step) {
    let tp = getCurrentTreePosition()

    while (true) {
        tp = gametree.navigate(...tp, step)
        if (!tp) break

        let node = tp[0].nodes[tp[1]]

        if (setting.get('sgf.comment_properties').some(p => p in node))
            break
    }

    if (tp) setCurrentTreePosition(...tp)
}

function goToBeginning() {
    let tree = getRootTree()
    if (tree.nodes.length == 0) return
    setCurrentTreePosition(tree, 0)
}

function goToEnd() {
    let tree = getRootTree()
    setCurrentTreePosition(...gametree.navigate(tree, 0, gametree.getCurrentHeight(tree) - 1))
}

function goToNextVariation() {
    let [tree, index] = getCurrentTreePosition()

    if (!tree.parent) return

    let mod = tree.parent.subtrees.length
    let i = (tree.parent.current + 1) % mod

    setCurrentTreePosition(tree.parent.subtrees[i], 0)
}

function goToPreviousVariation() {
    let [tree, index] = getCurrentTreePosition()

    if (!tree.parent) return

    let mod = tree.parent.subtrees.length
    let i = (tree.parent.current + mod - 1) % mod

    setCurrentTreePosition(tree.parent.subtrees[i], 0)
}

function goToMainVariation() {
    let tp = getCurrentTreePosition()
    let tree = tp[0]
    let root = getRootTree()

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
    view.closeDrawers()

    let root = getRootTree()
    let level = gametree.getLevel(tree, index)
    let t = tree

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
        view.showMessageBox('The root node cannot be removed.', 'warning')
        return
    }

    if (setting.get('edit.show_removenode_warning') && view.showMessageBox(
        'Do you really want to remove this node?',
        'warning',
        ['Remove Node', 'Cancel'], 1
    ) == 1) return

    // Save undo information

    setUndoable(true, 'Undo Remove Node')

    // Remove node

    view.closeDrawers()
    let prev = gametree.navigate(tree, index, -1)

    if (index != 0) {
        tree.nodes.splice(index, tree.nodes.length)
        tree.current = null
        tree.subtrees.length = 0
    } else {
        let parent = tree.parent
        let i = parent.subtrees.indexOf(tree)

        parent.subtrees.splice(i, 1)
        if (parent.current >= 1) parent.current--
        gametree.reduceTree(parent)
    }

    setGraphMatrixDict(gametree.tree2matrixdict(getRootTree()))
    if (!prev || getCurrentGraphNode()) prev = getCurrentTreePosition()
    setCurrentTreePosition(...prev)
}

function undoBoard() {
    if ($('body').data('undodata-root') == null
    || $('body').data('undodata-pos') == null)
        return

    view.setIsBusy(true)

    setTimeout(() => {
        setRootTree($('body').data('undodata-root'))

        let tp = gametree.navigate(getRootTree(), 0, $('body').data('undodata-pos'))
        setCurrentTreePosition(...tp, true, true)

        setUndoable(false)
        view.setIsBusy(false)
    }, setting.get('edit.undo_delay'))
}

/**
 * Main events
 */

$(document).ready(function() {
    view = require('./view')

    loadSettings()
    loadEngines()
    prepareDragDropFiles()
    prepareBars()
    prepareEditTools()
    prepareAutoplay()
    prepareSidebar()
    prepareSlider()
    prepareConsole()
    prepareGameInfo()
    preparePreferences()
    newFile()

    $('#main, #graph canvas:last-child, #graph .slider').on('mousewheel', function(evt) {
        evt.preventDefault()
        if (evt.wheelDelta < 0) goForward()
        else if (evt.wheelDelta > 0) goBack()
    })
}).on('keydown', function(evt) {
    if (evt.keyCode == 27) {
        // Escape

        if (!view.closeDrawers() && remote.getCurrentWindow().isFullScreen())
            view.setFullScreen(false)
    }

    if (['input', 'textarea'].indexOf(document.activeElement.tagName.toLowerCase()) >= 0)
        return

    if (evt.keyCode == 36) {
        // Home
        goToBeginning()
    } else if (evt.keyCode == 35) {
        // End
        goToEnd()
    } else if (evt.keyCode == 38) {
        // Up
        goBack()
    } else if (evt.keyCode == 40) {
        // Down
        goForward()
    } else if (evt.keyCode == 37) {
        // Left
        goToPreviousVariation()
    } else if (evt.keyCode == 39) {
        // Right
        goToNextVariation()
    }
})

$(window).on('resize', function() {
    view.resizeBoard()
}).on('beforeunload', function(evt) {
    if (!askForSave()) evt.returnValue = 'false'
})
