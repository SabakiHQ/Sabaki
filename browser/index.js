require('./ipc')

const fs = require('fs')
const {ipcRenderer, clipboard, remote} = require('electron')
const {app, dialog, Menu} = remote
const EventEmitter = require('events')
const Pikaday = require('pikaday')

const view = require('./view')
const $ = require('../modules/sprint')
const sgf = require('../modules/sgf')
const gib = require('../modules/gib')
const ngf = require('../modules/ngf')
const fuzzyfinder = require('../modules/fuzzyfinder')
const gametree = require('../modules/gametree')
const sound = require('../modules/sound')
const helper = require('../modules/helper')
const setting = require('../modules/setting')
const gtp = require('../modules/gtp')
const Board = require('../modules/board')

window.sabaki = {
    view,
    events: new EventEmitter(),
    modules: {sgf, gametree, sound, setting}
}

/**
 * Getters & Setters
 */

sabaki.getGameTrees = function() {
    let trees = $('body').data('gametrees')
    return trees ? trees : [sabaki.getRootTree()]
}

sabaki.setGameTrees = function(trees) {
    trees.forEach(tree => tree.parent = null)
    $('body').data('gametrees', trees)
}

sabaki.getGameIndex = function() {
    return sabaki.getGameTrees().length == 1 ? 0 : $('body').data('gameindex')
}

sabaki.setGameIndex = function(index) {
    let trees = sabaki.getGameTrees()
    $('body').data('gameindex', index)

    sabaki.setGameTrees(trees)
    sabaki.setRootTree(trees[index])
    view.updateTitle()
    sabaki.setUndoable(false)
    if (setting.get('game.goto_end_after_loading')) sabaki.goToEnd()
}

sabaki.getRootTree = function() {
    if (!sabaki.getCurrentTreePosition()) return null
    return sabaki.getGameTrees()[sabaki.getGameIndex()]
}

sabaki.setRootTree = function(tree) {
    if (tree.nodes.length == 0) return

    let trees = sabaki.getGameTrees()
    trees[sabaki.getGameIndex()] = tree
    sabaki.setGameTrees(trees)

    tree.parent = null
    gametree.getBoard(tree)
    sabaki.setCurrentTreePosition(tree, 0, true, true)

    view.setPlayerName(1,
        gametree.getPlayerName(tree, 1, 'Black'),
        'BR' in tree.nodes[0] ? tree.nodes[0].BR[0] : ''
    )
    view.setPlayerName(-1,
        gametree.getPlayerName(tree, -1, 'White'),
        'WR' in tree.nodes[0] ? tree.nodes[0].WR[0] : ''
    )
}

sabaki.getTreeHash = function() {
    return $('body').data('treehash')
}

sabaki.getFileHash = function() {
    return $('body').data('filehash')
}

sabaki.getGraphMatrixDict = function() {
    return $('#graph').data('graphmatrixdict')
}

sabaki.setGraphMatrixDict = function(matrixdict) {
    if (!view.getShowSidebar()) return

    let s, graph

    try {
        s = $('#graph').data('sigma')
        graph = gametree.matrixdict2graph(matrixdict)
    } catch (err) { }

    try {
        if (s && graph) {
            s.graph.clear()
            s.graph.read(graph)
        }
    } catch (err) {
        sabaki.setGraphMatrixDict(matrixdict)
    }

    $('#graph').data('graphmatrixdict', matrixdict)
}

sabaki.setCurrentPlayer = function(sign) {
    let [tree, index] = sabaki.getCurrentTreePosition()
    let node = tree.nodes[index]
    let intendedSign = 'B' in node ? -1 : +('W' in node)

    if (intendedSign == sign) {
        delete node.PL
    } else {
        node.PL = [sign > 0 ? 'B' : 'W']
    }

    view.setCurrentPlayer(sign)
}

sabaki.getCurrentPlayer = function() {
    return view.getCurrentPlayer()
}

sabaki.getCurrentTreePosition = function() {
    return $('#goban').data('position')
}

sabaki.setCurrentTreePosition = function(tree, index, now = false, redraw = false, ignoreAutoplay = false) {
    if (!tree || view.getScoringMode() || view.getEstimatorMode()) return
    if (!ignoreAutoplay && sabaki.getAutoplaying()) sabaki.setAutoplaying(false)

    // Remove old graph node color

    let oldGraphNode = sabaki.getCurrentGraphNode()
    let oldPos = sabaki.getCurrentTreePosition()
    let graphNode = sabaki.getGraphNode(tree, index)

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

    sabaki.updateSidebar(redraw, now)
    view.setShowHotspot('HO' in node)
    sabaki.setBoard(gametree.getBoard(tree, index))

    // Determine current player

    let currentplayer = 1

    if ('B' in node || 'HA' in node && +node.HA[0] >= 1)
        currentplayer = -1

    if ('PL' in node)
        currentplayer = node.PL[0] == 'W' ? -1 : 1

    view.setCurrentPlayer(currentplayer)
}

sabaki.getCurrentGraphNode = function() {
    let pos = sabaki.getCurrentTreePosition()
    if (!pos) return null
    return sabaki.getGraphNode(...pos)
}

sabaki.getGraphNode = function(tree, index) {
    let id = typeof tree === 'object' ? tree.id + '-' + index : tree
    let s = $('#graph').data('sigma')
    return s.graph.nodes(id)
}

sabaki.getSelectedTool = function() {
    let $li = $('#edit .selected')
    let tool = $li.attr('class').replace('selected', '').replace('-tool', '').trim()

    if (tool == 'stone') {
        return $li.find('img').attr('src').includes('_1') ? 'stone_1' : 'stone_-1'
    } else if (tool == 'line') {
        return $li.find('img').attr('src').includes('line') ? 'line' : 'arrow'
    } else {
        return tool
    }
}

sabaki.setSelectedTool = function(tool) {
    if (!view.getEditMode()) {
        view.setEditMode(true)
        if (sabaki.getSelectedTool().includes(tool)) return
    }

    $('#goban').data('edittool-data', null)
    $('#edit .' + tool + '-tool a').trigger('click')
}

sabaki.getBoard = function() {
    return $('#goban').data('board')
}

sabaki.setBoard = function(board) {
    let $goban = $('#goban')

    if (!sabaki.getBoard()
    || sabaki.getBoard().width != board.width
    || sabaki.getBoard().height != board.height) {
        $goban.data('board', board)
        view.buildBoard()
    }

    $goban.data('board', board)
    view.setCaptures(board.captures)

    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            let $li = $goban.find('.pos_' + x + '-' + y)
            let $span = $li.find('.stone span')
            let sign = board.get([x, y])

            // Clean up

            let types = ['ghost_1', 'ghost_-1', 'siblingghost_1', 'siblingghost_-1',
                'circle', 'triangle', 'cross', 'square', 'label',
                'point', 'dimmed', 'paint_1', 'paint_-1',
                'badmove', 'doubtfulmove', 'interestingmove', 'goodmove']

            types.forEach(x => $li.hasClass(x) ? $li.removeClass(x) : null)
            $span.attr('title', '')

            // Add markups

            if ([x, y] in board.markups) {
                let [type, label] = board.markups[[x, y]]

                if (type != '') $li.addClass(type)
                if (label != '') $span.attr('title', label)

                $li.toggleClass('smalllabel', label.length >= 3)
            }

            // Add ghost stone

            if ([x, y] in board.ghosts) {
                let [s, types] = board.ghosts[[x, y]]

                for (let type of types) {
                    if (type == 'child') $li.addClass('ghost_' + s)
                    else if (type == 'sibling') $li.addClass('siblingghost_' + s)
                    else if (type == 'badmove') $li.addClass('badmove')
                    else if (type == 'doubtfulmove') $li.addClass('doubtfulmove')
                    else if (type == 'interestingmove') $li.addClass('interestingmove')
                    else if (type == 'goodmove') $li.addClass('goodmove')
                }
            }

            // Set stone image

            if ($li.hasClass('sign_' + sign)) continue

            for (let i = -1; i <= 1; i++) {
                if ($li.hasClass('sign_' + i)) $li.removeClass('sign_' + i)
            }

            $li.addClass('sign_' + sign)
        }
    }

    // Add lines

    $('#goban hr').remove()

    for (let [v1, v2, arrow] of board.lines) {
        $goban.append(
            $('<hr/>').addClass(arrow ? 'arrow' : 'line').data('v1', v1).data('v2', v2)
        )
    }

    view.updateBoardLines()
}

sabaki.getScoringMethod = function() {
    return $('#score .tabs .territory').hasClass('current') ? 'territory' : 'area'
}

sabaki.setScoringMethod = function(method) {
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

sabaki.getKomi = function() {
    let rootNode = sabaki.getRootTree().nodes[0]
    return 'KM' in rootNode ? +rootNode.KM[0] : 0
}

sabaki.getEngineName = function() {
    return $('#console').data('enginename')
}

sabaki.getEngineController = function() {
    return $('#console').data('controller')
}

sabaki.getEngineCommands = function() {
    return $('#console').data('commands')
}

sabaki.setUndoable = function(undoable, tooltip = 'Undo') {
    if (undoable) {
        let rootTree = gametree.clone(sabaki.getRootTree())
        let level = gametree.getLevel(...sabaki.getCurrentTreePosition())

        $('#bar header .undo').attr('title', tooltip)
        $('body')
        .addClass('undoable')
        .data('undodata-root', rootTree)
        .data('undodata-level', level)
    } else {
        $('body')
        .removeClass('undoable')
        .data('undodata-root', null)
        .data('undodata-level', null)
    }
}

sabaki.getHotspot = function() {
    let [tree, index] = sabaki.getCurrentTreePosition()
    let node = tree.nodes[index]

    return 'HO' in node
}

sabaki.setHotspot = function(bookmark) {
    let [tree, index] = sabaki.getCurrentTreePosition()
    let node = tree.nodes[index]

    if (bookmark) node.HO = [1]
    else delete node.HO

    sabaki.updateGraph()
    view.setShowHotspot(bookmark)
}

sabaki.getEmptyGameTree = function() {
    let handicap = setting.get('game.default_handicap')
    let size = setting.get('game.default_board_size').toString().split(':').map(x => +x)
    let stones = new Board(size[0], size.slice(-1)[0]).getHandicapPlacement(handicap).map(sgf.vertex2point)

    let buffer = [
        `(;GM[1]FF[4]CA[UTF-8]`,
        `AP[${app.getName()}:${app.getVersion()}]`,
        `KM[${setting.get('game.default_komi')}]`,
        `SZ[${size[0]}:${size.slice(-1)[0]}]`,
        stones.length > 0 ? `HA[${handicap}]AB[${stones.join('][')}]` : '',
        ')'
    ].join('')

    return sgf.parse(buffer)[0]
}

sabaki.getAutoplaying = function() {
    return view.getAutoplayMode() && $('#autoplay').hasClass('playing')
}

sabaki.setAutoplaying = function(playing) {
    let autoplay = () => {
        if (!sabaki.getAutoplaying()) return

        let tp = gametree.navigate(...sabaki.getCurrentTreePosition(), 1)
        if (!tp) {
            sabaki.setAutoplaying(false)
            return
        }

        let node = tp[0].nodes[tp[1]]

        if (!node.B && !node.W) {
            sabaki.setCurrentTreePosition(...tp, false, false, true)
        } else {
            let vertex = sgf.point2vertex(node.B ? node.B[0] : node.W[0])
            view.setCurrentPlayer(node.B ? 1 : -1)
            sabaki.makeMove(vertex, false, true)
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
 * Preparation Methods
 */

sabaki.loadSettings = function() {
    $('head link.userstyle').attr('href', setting.stylesPath)

    $('#goban')
    .toggleClass('fuzzy', setting.get('view.fuzzy_stone_placement'))
    .toggleClass('animation', setting.get('view.animated_stone_placement'))
    .toggleClass('coordinates', setting.get('view.show_coordinates'))
    .toggleClass('movecolorization', setting.get('view.show_move_colorization'))
    .toggleClass('variations', setting.get('view.show_next_moves'))
    .toggleClass('siblings', setting.get('view.show_siblings'))

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

sabaki.prepareBars = function() {
    // Handle close buttons

    let bars = ['edit', 'guess', 'autoplay', 'scoring', 'estimator', 'find']

    for (let id of bars) {
        let funcName = 'set' + id[0].toUpperCase() + id.slice(1) + 'Mode'
        $(`#${id} > .close`).on('click', () => view[funcName](false))
    }

    // Handle header bar

    $('header .undo').on('click', () => sabaki.undoBoard())
    $('#headermenu').on('click', () => view.openHeaderMenu())

    // Handle autoplay bar

    $('#autoplay .play').on('click', () => sabaki.setAutoplaying(!sabaki.getAutoplaying()))

    // Handle scoring/estimator bar and drawer

    $('#scoring button, #estimator button').on('click', evt => {
        evt.preventDefault()
        view.showScore()
    })

    $('#score .tabs .area a').on('click', () => sabaki.setScoringMethod('area'))
    $('#score .tabs .territory a').on('click', () => sabaki.setScoringMethod('territory'))
    $('#score button[type="reset"]').on('click', () => view.closeScore())
    $('#score button[type="submit"]').on('click', evt => {
        evt.preventDefault()
        sabaki.commitScore()
        view.closeScore()
    })

    // Handle find bar

    $('#find button').get().forEach((el, i) => {
        $(el).on('click', evt => {
            evt.preventDefault()
            sabaki.findMove(view.getIndicatorVertex(), view.getFindText(), 1 - i * 2)
        })
    })

    // Handle current player toggler

    $('header .current-player').on('click', () => {
        sabaki.setCurrentPlayer(-sabaki.getCurrentPlayer())
    })
}

sabaki.prepareEditTools = function() {
    $('#edit ul a').on('click', function() {
        let $a = $(this)
        let $img = $a.find('img')

        if (!$a.parent().hasClass('selected')) {
            $('#edit .selected').removeClass('selected')
            $a.parent().addClass('selected')
        } else if ($a.parent().hasClass('stone-tool')) {
            let black = $img.attr('src').includes('_1')
            $img.attr('src', black ? '../img/edit/stone_-1.svg' : '../img/edit/stone_1.svg')
        } else if ($a.parent().hasClass('line-tool')) {
            let line = $img.attr('src').includes('line')
            $img.attr('src', line ? '../img/edit/arrow.svg' : '../img/edit/line.svg')
        }
    })
}

sabaki.prepareAutoplay = function() {
    $('#autoplay input').on('input', function() {
        let value = Math.min(10, Math.max(1, +$(this).val()))
        value = Math.floor(value * 10) / 10
        setting.set('autoplay.sec_per_move', value)
    }).on('blur', function() {
        $(this).val(setting.get('autoplay.sec_per_move'))
    })
}

sabaki.prepareSidebar = function() {
    // Prepare comments section

    $('#properties .header .edit-button').on('click', () => view.setEditMode(true))

    $('#properties .edit .header img').on('click', function() {
        view.openCommentMenu([
            Math.round($(this).offset().left),
            Math.round($(this).offset().top + $(this).height())
        ])
    })

    $('#properties .edit .header input, #properties .edit textarea')
    .on('input', () => sabaki.commitCommentText())

    // Prepare game graph

    let $container = $('#graph')
    let s = new sigma({
        renderer: {
            container: $container.get(0),
            type: 'canvas'
        },
        settings: {
            defaultNodeColor: setting.get('graph.node_inactive_color'),
            defaultEdgeColor: setting.get('graph.node_inactive_color'),
            defaultNodeBorderColor: 'rgba(255,255,255,.2)',
            edgeColor: 'default',
            borderSize: 2,
            zoomMax: 1,
            zoomMin: 1,
            autoResize: false,
            autoRescale: false
        }
    })

    let getTreePos = evt => evt.data.node.data.slice(0, 2)

    s.bind('clickNode', function(evt) {
        sabaki.setCurrentTreePosition(...getTreePos(evt), true)
    }).bind('rightClickNode', function(evt) {
        let pos = [evt.data.captor.clientX, evt.data.captor.clientY]
        view.openNodeMenu(...getTreePos(evt), pos.map(x => Math.round(x)))
    })

    $container.data('sigma', s)
}

sabaki.prepareSlider = function() {
    let $slider = $('#sidebar .slider .inner')

    let changeSlider = percentage => {
        percentage = Math.min(1, Math.max(0, percentage))

        let level = Math.round((gametree.getHeight(sabaki.getRootTree()) - 1) * percentage)
        let tp = gametree.navigate(sabaki.getRootTree(), 0, level)

        if (!tp) tp = gametree.navigate(
            sabaki.getRootTree(),
            0,
            gametree.getCurrentHeight(sabaki.getRootTree()) - 1
        )

        if (helper.equals(tp, sabaki.getCurrentTreePosition())) return
        sabaki.setCurrentTreePosition(...tp)
        sabaki.updateSlider()
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
        sabaki.startAutoScroll($(this).hasClass('next') ? 1 : -1)
    })

    $(document).on('mouseup', function() {
        $('#sidebar .slider a').data('mousedown', false)
    })
}

sabaki.prepareDragDropFiles = function() {
    $('body').on('dragover', function(evt) {
        evt.preventDefault()
    }).on('drop', function(evt) {
        evt.preventDefault()

        if (evt.dataTransfer.files.length == 0) return
        sabaki.loadFile(evt.dataTransfer.files[0].path)
    })
}

sabaki.prepareConsole = function() {
    $('#console form').on('submit', function(evt) {
        evt.preventDefault()

        let $input = $(this).find('input')
        if ($input.val().trim() == '') return
        $input.get(0).blur()

        let command = gtp.parseCommand($input.val())
        sabaki.sendGTPCommand(command)
    })

    $('#console form input').on('keydown', function(evt) {
        if ([40, 38, 9].includes(evt.keyCode)) evt.preventDefault()
        let $inputs = $('#console form input')

        if ($(this).data('index') == null) $(this).data('index', $inputs.get().indexOf(this))
        let i = $(this).data('index')
        let length = $inputs.length

        if ([38, 40].includes(evt.keyCode)) {
            if (evt.keyCode == 38) {
                // Up
                i = Math.max(i - 1, 0)
            } else if (evt.keyCode == 40) {
                // Down
                i = Math.min(i + 1, length - 1)
            }

            $(this)
            .val(i == length - 1 ? '' : $inputs.eq(i).val())
            .data('index', i)
        } else if (evt.keyCode == 9) {
            // Tab
            let tokens = $(this).val().split(' ')
            let commands = sabaki.getEngineCommands()
            if (!commands) return

            let i = 0
            let selection = this.selectionStart
            while (selection > tokens[i].length && selection.length != 0 && i < tokens.length - 1)
                selection -= tokens[i++].length + 1

            let result = fuzzyfinder.find(tokens[i], sabaki.getEngineCommands())
            if (!result) return
            tokens[i] = result

            this.value = tokens.join(' ')
            this.selectionStart = this.selectionEnd = (() => {
                let sum = 0
                while (i >= 0) sum += tokens[i--].length + 1
                return sum - 1
            })()
        }
    })
}

sabaki.prepareGameInfo = function() {
    $('#info button[type="submit"]').on('click', function(evt) {
        evt.preventDefault()
        sabaki.commitGameInfo()
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

        for (let el of $(pikaday.el).find('.pika-button').get()) {
            let year = +$(el).attr('data-pika-year')
            let month = +$(el).attr('data-pika-month')
            let day = +$(el).attr('data-pika-day')

            $(el).parent().toggleClass('is-multi-selected', dates.some(d => {
                return helper.equals(d, [year, month + 1, day])
            }))
        }
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

    $(window).on('resize', () => adjustPosition(pikaday))

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
        let $input = $(this).parent().nextAll('input[name="size-height"]')
        $(this).data('link', this.value == $input.val())
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

sabaki.preparePreferences = function() {
    $('#preferences .tabs .general').on('click', () => view.setPreferencesTab('general'))
    $('#preferences .tabs .engines').on('click', () => view.setPreferencesTab('engines'))

    $('#preferences form .engines button').on('click', evt => {
        evt.preventDefault()
        view.addEngineItem()
    })

    $('#preferences button[type="submit"]').on('click', evt => {
        evt.preventDefault()
        sabaki.commitPreferences()
        view.closePreferences()
    })

    $('#preferences button[type="reset"]').on('click', evt => {
        evt.preventDefault()
        view.closePreferences()
    })
}

sabaki.prepareCleanMarkup = function() {
    $('#cleanmarkup button:not([type="reset"])').on('click', evt => {
        evt.preventDefault()
        sabaki.setUndoable(true, 'Undo Clean Markup')

        let data = {
            cross: ['MA'],
            triangle: ['TR'],
            square: ['SQ'],
            circle: ['CR'],
            line: ['LN'],
            arrow: ['AR'],
            label: ['LB'],
            comments: ['C', 'N'],
            annotations: ['DM', 'GB', 'GW', 'UC', 'BM', 'DO', 'IT', 'TE'],
            hotspots: ['HO']
        }

        for (let input of $('#cleanmarkup input[type="checkbox"]').get()) {
            let $input = $(input)
            setting.set($input.attr('name'), $input.prop('checked'))
        }

        let cleanWholeGame = $(evt.target).attr('class') == 'whole-game'
        let properties = $('#cleanmarkup input[type="checkbox"]').get()
            .filter(x => $(x).prop('checked'))
            .map(x => data[$(x).attr('name').replace('cleanmarkup.', '')])
            .reduce((sum, x) => [...sum, ...x], [])

        view.setIsBusy(true)

        setTimeout(() => {
            if (!cleanWholeGame) {
                let [tree, i] = sabaki.getCurrentTreePosition()

                for (let prop of properties) {
                    delete tree.nodes[i][prop]
                }
            } else {
                let trees = gametree.getTreesRecursive(sabaki.getRootTree())

                for (let tree of trees) {
                    for (let i = 0; i < tree.nodes.length; i++) {
                        for (let prop of properties) {
                            delete tree.nodes[i][prop]
                        }
                    }
                }
            }

            view.setIsBusy(false)
            view.closeCleanMarkup()
            sabaki.setCurrentTreePosition(...sabaki.getCurrentTreePosition(), true, true)
        }, 100)
    })

    $('#cleanmarkup button[type="reset"]').on('click', evt => {
        evt.preventDefault()
        view.closeCleanMarkup()
    })
}

/**
 * Engine Methods
 */

sabaki.loadEngines = function() {
    // Load engines list

    $('#preferences .engines-list ul').empty()

    for (let engine of setting.getEngines()) {
        view.addEngineItem(engine.name, engine.path, engine.args)
    }
}

sabaki.attachEngine = function(exec, args, genMove) {
    sabaki.detachEngine()
    view.setIsBusy(true)

    setTimeout(() => {
        let split = require('argv-split')
        let controller = new gtp.Controller(exec, split(args))

        if (controller.error) {
            view.showMessageBox('There was an error attaching the engine.', 'error')
            return
        }

        controller.on('quit', () => {
            $('#console').data('controller', null)
            view.setIsBusy(false)
        })

        $('#console').data('controller', controller)

        sabaki.sendGTPCommand(new gtp.Command(null, 'name'), true, response => {
            $('#console').data('enginename', response.content)
        })
        sabaki.sendGTPCommand(new gtp.Command(null, 'version'))
        sabaki.sendGTPCommand(new gtp.Command(null, 'protocol_version'))
        sabaki.sendGTPCommand(new gtp.Command(null, 'list_commands'), true, response => {
            $('#console').data('commands', response.content.split('\n'))
        })

        sabaki.syncEngine()
        view.setIsBusy(false)

        if (!!genMove) sabaki.generateMove()
    }, setting.get('gtp.attach_delay'))
}

sabaki.detachEngine = function() {
    sabaki.sendGTPCommand(new gtp.Command(null, 'quit'), true)

    $('#console')
    .data('controller', null)
    .data('boardhash', null)

    view.setIsBusy(false)
}

sabaki.syncEngine = function() {
    let board = sabaki.getBoard()

    if (!sabaki.getEngineController() || $('#console').data('boardhash') == board.getHash())
        return

    if (!board.isSquare()) {
        view.showMessageBox('GTP engines don’t support non-square boards.', 'warning')
        return sabaki.detachEngine()
    } else if (!board.isValid()) {
        view.showMessageBox('GTP engines don’t support invalid board positions.', 'warning')
        return sabaki.detachEngine()
    }

    view.setIsBusy(true)

    sabaki.sendGTPCommand(new gtp.Command(null, 'clear_board'), true)
    sabaki.sendGTPCommand(new gtp.Command(null, 'boardsize', [board.width]), true)
    sabaki.sendGTPCommand(new gtp.Command(null, 'komi', [sabaki.getKomi()]), true)

    // Replay
    for (let i = 0; i < board.width; i++) {
        for (let j = 0; j < board.height; j++) {
            let v = [i, j]
            let sign = board.get(v)
            if (sign == 0) continue

            let color = sign > 0 ? 'B' : 'W'
            let point = board.vertex2coord(v)

            sabaki.sendGTPCommand(new gtp.Command(null, 'play', [color, point]), true)
        }
    }

    $('#console').data('boardhash', board.getHash())
    view.setIsBusy(false)
}

sabaki.sendGTPCommand = function(command, ignoreBlocked = false, callback = () => {}) {
    if (!sabaki.getEngineController()) {
        $('#console form:last-child input').val('')
        return
    }

    let controller = sabaki.getEngineController()
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

        let $view = $('#console')
        $view.scrollTop($view.get(0).scrollHeight)
    }

    if (!ignoreBlocked && setting.get('console.blocked_commands').includes(command.name)) {
        listener(new gtp.Response(null, 'blocked command', true, true), command)
    } else {
        controller.once('response-' + command.internalId, listener)
        controller.sendCommand(command)
    }
}

sabaki.generateMove = function(ignoreBusy = false) {
    if (!sabaki.getEngineController() || !ignoreBusy && view.getIsBusy()) return

    view.closeDrawers()
    sabaki.syncEngine()
    view.setIsBusy(true)

    let color = view.getCurrentPlayer() > 0 ? 'B' : 'W'
    let opponent = view.getCurrentPlayer() > 0 ? 'W' : 'B'

    sabaki.sendGTPCommand(new gtp.Command(null, 'genmove', [color]), true, r => {
        view.setIsBusy(false)
        if (r.content.toLowerCase() == 'resign') {
            view.showMessageBox(sabaki.getEngineName() + ' has resigned.')
            sabaki.getRootTree().nodes[0].RE = [opponent + '+Resign']
            return
        }

        let v = [-1, -1]
        if (r.content.toLowerCase() != 'pass')
            v = sabaki.getBoard().coord2vertex(r.content)

        sabaki.makeMove(v, false)
        $('#console').data('boardhash', sabaki.getBoard().getHash())
    })
}

/**
 * File Hash Methods
 */

sabaki.generateTreeHash = function() {
    let trees = sabaki.getGameTrees()
    let hash = ''

    for (let i = 0; i < trees.length; i++) {
        hash += gametree.getHash(trees[i])
    }

    return hash
}

sabaki.updateTreeHash = function() {
    $('body').data('treehash', sabaki.generateTreeHash())
}

sabaki.generateFileHash = function() {
    let filename = view.getRepresentedFilename()
    if (!filename) return null

    try {
        let content = fs.readFileSync(filename, 'utf8')
        return helper.hash(content)
    } catch (err) {}

    return null
}

sabaki.updateFileHash = function() {
    $('body').data('filehash', sabaki.generateFileHash())
}

sabaki.askForSave = function() {
    if (!sabaki.getRootTree()) return true
    let hash = sabaki.generateTreeHash()

    if (hash != sabaki.getTreeHash()) {
        let answer = view.showMessageBox(
            'Your changes will be lost if you close this file without saving.',
            'warning',
            ['Save', 'Don’t Save', 'Cancel'], 2
        )

        if (answer == 0) return sabaki.saveFile(view.getRepresentedFilename())
        else if (answer == 2) return false
    }

    return true
}

sabaki.askForReload = function() {
    let hash = sabaki.generateFileHash()

    if (hash && hash != sabaki.getFileHash()) {
        let answer = view.showMessageBox([
            `This file has been changed outside of ${app.getName()}.`,
            'Do you want to reload the file? Your changes will be lost.'
        ].join('\n'), 'warning', ['Reload', 'Don’t Reload'], 1)

        if (answer == 0) {
            sabaki.loadFile(view.getRepresentedFilename(), true)
        }

        $('body').data('filehash', hash)
    }
}

/**
 * Game Board Methods
 */

sabaki.vertexClicked = function(vertex, buttonIndex = 0, ctrlKey = false, position = null) {
    view.closeGameInfo()

    if (typeof vertex == 'string') {
        vertex = sabaki.getBoard().coord2vertex(vertex)
    }

    if (view.getScoringMode() || view.getEstimatorMode()) {
        if ($('#score').hasClass('show')) return
        if (buttonIndex != 0) return
        if (sabaki.getBoard().get(vertex) == 0) return

        let dead = !$('#goban .pos_' + vertex.join('-')).hasClass('dead')
        let stones = view.getEstimatorMode()
            ? sabaki.getBoard().getChain(vertex)
            : sabaki.getBoard().getRelatedChains(vertex)

        for (let v of stones) {
            $('#goban .pos_' + v.join('-')).toggleClass('dead', dead)
        }

        sabaki.updateAreaMap(view.getEstimatorMode())
    } else if (view.getEditMode()) {
        if (ctrlKey) {
            let coord = sabaki.getBoard().vertex2coord(vertex)

            view.setCommentText([view.getCommentText().trim(), coord].join(' ').trim())
            sabaki.commitCommentText()
        } else {
            sabaki.useTool(vertex, null, buttonIndex)
        }
    } else if (view.getFindMode()) {
        if (buttonIndex != 0) return

        view.setIndicatorVertex(vertex)
        sabaki.findMove(view.getIndicatorVertex(), view.getFindText(), 1)
    } else if (view.getGuessMode()) {
        if (buttonIndex != 0) return

        let tp = gametree.navigate(...sabaki.getCurrentTreePosition(), 1)
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
        let board = sabaki.getBoard()

        if (!board.hasVertex(nextVertex)) {
            view.setGuessMode(false)
            return
        }

        if (vertex[0] == nextVertex[0] && vertex[1] == nextVertex[1]) {
            sabaki.makeMove(vertex)
        } else {
            if (board.get(vertex) != 0) return
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
    } else if (view.getPlayMode() || view.getAutoplayMode()) {
        let board = sabaki.getBoard()

        if (buttonIndex == 0) {
            if (board.get(vertex) == 0) {
                sabaki.makeMove(vertex)
                view.closeDrawers()
            } else if (vertex in board.markups
                       && board.markups[vertex][0] == 'point'
                       && setting.get('edit.click_currentvertex_to_remove')) {
                sabaki.removeNode(...sabaki.getCurrentTreePosition())
            }
        } else if (buttonIndex == 2) {
            if (vertex in board.markups && board.markups[vertex][0] == 'point') {
                view.openCommentMenu(position)
            }
        }
    }
}

sabaki.makeMove = function(vertex, sendCommand = null, ignoreAutoplay = false) {
    if (!view.getPlayMode() && !view.getAutoplayMode() && !view.getGuessMode())
        view.closeDrawers()

    if (sendCommand == null)
        sendCommand = view.getPlayMode() && sabaki.getEngineController() != null

    let board = sabaki.getBoard()
    let pass = !board.hasVertex(vertex)
    if (!pass && board.get(vertex) != 0) return

    let [tree, index] = sabaki.getCurrentTreePosition()
    let sign = view.getCurrentPlayer()
    let color = sign > 0 ? 'B' : 'W'
    let capture = false, suicide = false
    let createNode = true

    if (sendCommand) sabaki.syncEngine()

    if (!pass) {
        // Check for ko
        if (setting.get('game.show_ko_warning')) {
            let tp = gametree.navigate(tree, index, -1)
            let ko = false

            if (tp) {
                let hash = board.makeMove(sign, vertex).getHash()
                ko = tp[0].nodes[tp[1]].board.getHash() == hash
            }

            if (ko && view.showMessageBox(
                ['You are about to play a move which repeats a previous board position.',
                'This is invalid in some rulesets.'].join('\n'),
                'info',
                ['Play Anyway', 'Don’t Play'], 1
            ) != 0) return
        }

        let vertexNeighbors = board.getNeighbors(vertex)

        // Check for suicide
        capture = vertexNeighbors
            .some(v => board.get(v) == -sign && board.getLiberties(v).length == 1)

        suicide = !capture
        && vertexNeighbors.filter(v => board.get(v) == sign)
            .every(v => board.getLiberties(v).length == 1)
        && vertexNeighbors.filter(v => board.get(v) == 0).length == 0

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

        sabaki.setCurrentTreePosition(tree, tree.nodes.length - 1, null, null, ignoreAutoplay)
    } else {
        if (index != tree.nodes.length - 1) {
            // Search for next move

            let nextNode = tree.nodes[index + 1]
            let moveExists = color in nextNode
                && helper.equals(sgf.point2vertex(nextNode[color][0]), vertex)

            if (moveExists) {
                sabaki.setCurrentTreePosition(tree, index + 1, null, null, ignoreAutoplay)
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
                sabaki.setCurrentTreePosition(variations[0], 0, null, null, ignoreAutoplay)
                createNode = false
            }
        }

        if (createNode) {
            // Create variation

            let updateRoot = tree == sabaki.getRootTree()
            let splitted = gametree.split(tree, index)
            let newtree = gametree.new()
            let node = {}

            node[color] = [sgf.vertex2point(vertex)]
            newtree.nodes = [node]
            newtree.parent = splitted

            splitted.subtrees.push(newtree)
            splitted.current = splitted.subtrees.length - 1

            if (updateRoot) sabaki.setRootTree(splitted)
            sabaki.setCurrentTreePosition(newtree, 0, null, null, ignoreAutoplay)
        }
    }

    board = sabaki.getBoard()

    // Play sounds

    if (!pass) {
        let delay = setting.get('sound.capture_delay_min')
        delay += Math.floor(Math.random() * (setting.get('sound.capture_delay_max') - delay))

        if (capture || suicide)
            sound.playCapture(delay)

        sound.playPachi()
    } else {
        sound.playPass()
    }

    // Remove undo information

    if (createNode) sabaki.setUndoable(false)

    // Enter scoring mode when two consecutive passes

    let enterScoring = false
    let ptp = gametree.navigate(...sabaki.getCurrentTreePosition(), -1)

    if (pass && createNode && ptp) {
        let prevNode = ptp[0].nodes[ptp[1]]
        let prevColor = sign > 0 ? 'W' : 'B'
        let prevPass = prevColor in prevNode && prevNode[prevColor][0] == ''

        if (prevPass) {
            enterScoring = true
            view.setScoringMode(true)
        }
    }

    // Handle GTP engine

    if (sendCommand && !enterScoring) {
        let command = new gtp.Command(null, 'play', [color, pass ? 'pass' : board.vertex2coord(vertex)])
        sabaki.sendGTPCommand(command, true)

        $('#console').data('boardhash', board.getHash())

        view.setIsBusy(true)
        setTimeout(() => sabaki.generateMove(true), setting.get('gtp.move_delay'))
    }
}

sabaki.makeResign = function() {
    let player = view.getCurrentPlayer() > 0 ? 'W' : 'B'

    view.showGameInfo()
    $('#info input[name="result"]').val(player + '+Resign')
}

sabaki.useTool = function(vertex, tool = null, buttonIndex = 0) {
    if (!tool) tool = sabaki.getSelectedTool()

    let [tree, index] = sabaki.getCurrentTreePosition()
    let node = tree.nodes[index]
    let board = sabaki.getBoard()
    let dictionary = {
        cross: 'MA',
        triangle: 'TR',
        circle: 'CR',
        square: 'SQ',
        number: 'LB',
        label: 'LB'
    }

    if (tool.includes('stone')) {
        if ('B' in node || 'W' in node || gametree.navigate(tree, index, 1)) {
            // New variation needed

            let updateRoot = tree == sabaki.getRootTree()
            let splitted = gametree.split(tree, index)

            if (splitted != tree || splitted.subtrees.length != 0) {
                tree = gametree.new()
                tree.parent = splitted
                splitted.subtrees.push(tree)
            }

            node = {PL: view.getCurrentPlayer() > 0 ? ['B'] : ['W']}
            index = tree.nodes.length
            tree.nodes.push(node)

            if (updateRoot) sabaki.setRootTree(splitted)
        }

        let sign = tool.includes('_1') ? 1 : -1
        if (buttonIndex == 2) sign = -sign

        let oldSign = board.get(vertex)
        let ids = ['AW', 'AE', 'AB']
        let id = ids[sign + 1]
        let point = sgf.vertex2point(vertex)

        for (let i = 0; i <= 2; i++) {
            if (!(ids[i] in node)) continue

            // Resolve compressed lists

            if (node[ids[i]].some(x => x.includes(':'))) {
                node[ids[i]] = node[ids[i]]
                .map(value => sgf.compressed2list(value).map(sgf.vertex2point))
                .reduce((list, x) => [...list, x])
            }

            // Remove residue

            let k = node[ids[i]].indexOf(point)

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

        for (let hr of $('#goban hr').get()) {
            let p1 = sgf.vertex2point($(hr).data('v1'))
            let p2 = sgf.vertex2point($(hr).data('v2'))

            if (p1 == p2) continue

            node[$(hr).hasClass('arrow') ? 'AR' : 'LN'].push(p1 + ':' + p2)
            board.lines.push([$(hr).data('v1'), $(hr).data('v2'), $(hr).hasClass('arrow')])
        }

        if (node.LN.length == 0) delete node.LN
        if (node.AR.length == 0) delete node.AR
    } else {
        if (buttonIndex != 0) return

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
                    .sort((a, b) => a - b)

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

        for (let li of $('#goban .row li').get()) {
            let v = $(li).data('vertex')
            if (!(v in board.markups)) continue

            let id = dictionary[board.markups[v][0]]
            let pt = sgf.vertex2point(v)
            if (id == 'LB') pt += ':' + board.markups[v][1]

            if (id in node) node[id].push(pt)
            else node[id] = [pt]
        }
    }

    sabaki.setUndoable(false)
    sabaki.setCurrentTreePosition(tree, index)
}

sabaki.drawLine = function(vertex) {
    let tool = sabaki.getSelectedTool()

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

/**
 * Find Methods
 */

sabaki.findPosition = function(step, condition) {
    if (isNaN(step)) step = 1
    else step = step >= 0 ? 1 : -1

    view.setIsBusy(true)

    setTimeout(() => {
        let tp = sabaki.getCurrentTreePosition()
        let iterator = gametree.makeHorizontalNavigator(...tp)

        while (true) {
            tp = step >= 0 ? iterator.next() : iterator.prev()

            if (!tp) {
                let root = sabaki.getRootTree()

                if (step == 1) {
                    tp = [root, 0]
                } else {
                    let sections = gametree.getSection(root, gametree.getHeight(root) - 1)
                    tp = sections[sections.length - 1]
                }

                iterator = gametree.makeHorizontalNavigator(...tp)
            }

            if (helper.equals(tp, sabaki.getCurrentTreePosition()) || condition(...tp))
                break
        }

        sabaki.setCurrentTreePosition(...tp)
        view.setIsBusy(false)
    }, setting.get('find.delay'))
}

sabaki.findBookmark = function(step) {
    sabaki.findPosition(step, (tree, index) => 'HO' in tree.nodes[index])
}

sabaki.findMove = function(vertex, text, step) {
    if (vertex == null && text.trim() == '') return
    let point = vertex ? sgf.vertex2point(vertex) : null

    sabaki.findPosition(step, (tree, index) => {
        let node = tree.nodes[index]
        let cond = (prop, value) => prop in node
            && node[prop][0].toLowerCase().includes(value.toLowerCase())

        return (!point || ['B', 'W'].some(x => cond(x, point)))
            && (!text || cond('C', text) || cond('N', text))
    })
}

/**
 * Update Methods
 */

sabaki.updateSidebar = function(redraw = false, now = false) {
    clearTimeout($('#sidebar').data('updatesidebarid'))

    let [tree, index] = sabaki.getCurrentTreePosition()

    $('#sidebar').data('updatesidebarid', setTimeout(() => {
        if (!helper.equals(sabaki.getCurrentTreePosition(), [tree, index]))
            return

        // Set current path

        let t = tree
        while (t.parent) {
            t.parent.current = t.parent.subtrees.indexOf(t)
            t = t.parent
        }

        // Update

        sabaki.updateSlider()
        sabaki.updateCommentText()
        if (redraw) sabaki.updateGraph()
        else sabaki.centerGraphCameraAt(sabaki.getCurrentGraphNode())
    }, now ? 0 : setting.get('graph.delay')))
}

sabaki.updateGraph = function() {
    if (!view.getShowSidebar() || !sabaki.getCurrentTreePosition()) return

    sabaki.setGraphMatrixDict(gametree.getMatrixDict(sabaki.getRootTree()))
    sabaki.centerGraphCameraAt(sabaki.getCurrentGraphNode())
}

sabaki.updateSlider = function() {
    if (!view.getShowSidebar()) return

    let [tree, index] = sabaki.getCurrentTreePosition()
    let total = gametree.getHeight(sabaki.getRootTree()) - 1
    let relative = gametree.getLevel(tree, index)

    view.setSliderValue(total == 0 ? 0 : relative * 100 / total, relative)
}

sabaki.updateCommentText = function() {
    let [tree, index] = sabaki.getCurrentTreePosition()
    let node = tree.nodes[index]

    view.setCommentText('C' in node ? node.C[0] : '')
    view.setCommentTitle('N' in node ? node.N[0] : '')

    view.setAnnotations(...(
        'UC' in node ? [-2, node.UC[0]]
        : 'GW' in node ? [-1, node.GW[0]]
        : 'DM' in node ? [0, node.DM[0]]
        : 'GB' in node ? [1, node.GB[0]]
        : [null, null]
    ), ...(
        'BM' in node ? [-1, node.BM[0]]
        : 'TE' in node ? [2, node.TE[0]]
        : 'DO' in node ? [0, 1]
        : 'IT' in node ? [1, 1]
        : [null, null]
    ))

    $('#properties').scrollTop(0)
}

sabaki.updateAreaMap = function(estimate) {
    let board = sabaki.getBoard().clone()

    for (let li of $('#goban .row li.dead').get()) {
        if ($(li).hasClass('sign_1')) board.captures['-1']++
        else if ($(li).hasClass('sign_-1')) board.captures['1']++

        board.set($(li).data('vertex'), 0)
    }

    let map = estimate ? board.getAreaEstimateMap() : board.getAreaMap()

    for (let li of $('#goban .row li').get()) {
        let [x, y] = $(li).data('vertex')

        $(li)
        .removeClass('area_-1').removeClass('area_0').removeClass('area_1')
        .addClass('area_' + map[y][x])
    }

    if (!estimate) {
        let $falsedead = $('#goban .row li.area_-1.sign_-1.dead, #goban .row li.area_1.sign_1.dead')

        if ($falsedead.length > 0) {
            $falsedead.removeClass('dead')
            return sabaki.updateAreaMap()
        }
    }

    $('#goban')
    .data('areamap', map)
    .data('finalboard', board)
}

sabaki.centerGraphCameraAt = function(node) {
    if (!view.getShowSidebar() || !node) return

    let s = $('#graph').data('sigma')
    s.renderers[0].resize().render()

    let [matrix, dict] = sabaki.getGraphMatrixDict()
    let [x, y] = dict[node.id]
    let [width, padding] = gametree.getMatrixWidth(y, matrix)
    x -= padding
    let relX = width == 1 ? 1 : 1 - 2 * x / (width - 1)
    let diff = (width - 1) * setting.get('graph.grid_size') / 2
    diff = Math.min(diff, s.renderers[0].width / 2 - setting.get('graph.grid_size'))

    node.color = setting.get('graph.node_active_color')
    s.refresh()

    let prefix = s.camera.readPrefix
    sigma.misc.animation.camera(
        s.camera,
        {x: node[`${prefix}x`] + relX * diff, y: node[`${prefix}y`]},
        {duration: setting.get('graph.animation_duration')}
    )
}

sabaki.startAutoScroll = function(step, delay) {
    if (step > 0 && !$('#sidebar .slider a.next').data('mousedown')
    || step < 0 && !$('#sidebar .slider a.prev').data('mousedown')) return

    if (delay == null) delay = setting.get('autoscroll.max_interval')
    delay = Math.max(setting.get('autoscroll.min_interval'), delay)

    let $slider = $('#sidebar .slider')
    clearTimeout($slider.data('autoscrollid'))

    sabaki.goStep(step)
    sabaki.updateSlider()

    $slider.data('autoscrollid', setTimeout(() => {
        sabaki.startAutoScroll(step, delay - setting.get('autoscroll.diff'))
    }, delay))
}

/**
 * Commit Methods
 */

sabaki.commitCommentText = function() {
    let [tree, index] = sabaki.getCurrentTreePosition()
    let node = tree.nodes[index]
    let title = view.getCommentTitle()
    let comment = view.getCommentText()

    if (comment != '') node.C = [comment]
    else delete node.C

    if (title != '') node.N = [title]
    else delete node.N

    sabaki.updateSidebar(true)
    sabaki.setUndoable(false)
}

sabaki.commitGameInfo = function() {
    let rootNode = sabaki.getRootTree().nodes[0]
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
        gametree.getPlayerName(sabaki.getRootTree(), 1, 'Black'),
        'BR' in rootNode ? rootNode.BR[0] : ''
    )
    view.setPlayerName(-1,
        gametree.getPlayerName(sabaki.getRootTree(), -1, 'White'),
        'WR' in rootNode ? rootNode.WR[0] : ''
    )

    // Handle komi

    let komi = +$info.find('input[name="komi"]').val()
    if (isNaN(komi)) komi = 0

    rootNode.KM = ['' + komi]
    setting.set('game.default_komi', komi)

    // Handle size

    if (!$info.find('input[name="size-width"]').get(0).disabled) {
        let size = ['width', 'height'].map(x => {
            let num = +$info.find('input[name="size-' + x + '"]').val()
            return Math.min(Math.max(num, 3), 25)
        })

        if (size.some(x => isNaN(x))) {
            size = setting.get('game.default_board_size').toString().split(':')
            if (size.length != 2) size = [+size[0], +size[size.length - 1]]
        }

        if (size[0] == size[1]) rootNode.SZ = ['' + size[0]]
        else rootNode.SZ = [size.join(':')]

        setting.set('game.default_board_size', rootNode.SZ[0])
    }

    // Handle handicap stones

    let $handicapInput = $info.find('select[name="handicap"]')
    let handicap = $handicapInput.get(0).selectedIndex

    if (!$handicapInput.get(0).disabled) {
        sabaki.setCurrentTreePosition(sabaki.getRootTree(), 0)

        if (handicap == 0) {
            delete rootNode.AB
            delete rootNode.HA
            setting.set('game.default_handicap', 0)
        } else {
            let board = sabaki.getBoard()
            let stones = board.getHandicapPlacement(handicap + 1)

            rootNode.HA = ['' + stones.length]
            rootNode.AB = stones.map(sgf.vertex2point)
            setting.set('game.default_handicap', stones.length)
        }

        sabaki.setCurrentTreePosition(sabaki.getRootTree(), 0)
    }

    sabaki.setUndoable(false)
    sabaki.updateSidebar()

    // Update engine

    if (!$info.hasClass('disabled')) {
        // Attach/detach engine

        let engines = setting.getEngines()
        let indices = $('#info section .menu').get().map(x => $(x).data('engineindex'))
        let max = Math.max(...indices)
        let sign = indices.indexOf(max) == 0 ? 1 : -1

        if (max >= 0) {
            let engine = engines[max]
            sabaki.attachEngine(engine.path, engine.args, view.getCurrentPlayer() == sign)
        } else {
            sabaki.detachEngine()
        }
    } else {
        // Update komi

        let command = new gtp.Command(null, 'komi', [komi])
        sabaki.sendGTPCommand(command, true)
    }
}

sabaki.commitScore = function() {
    let result = $('#score .result').text()

    view.showGameInfo()
    $('#info input[name="result"]').val(result)

    sabaki.setUndoable(false)
}

sabaki.commitPreferences = function() {
    // Save general preferences

    $('#preferences input[type="checkbox"]').get()
        .forEach(el => setting.set(el.name, el.checked))

    remote.getCurrentWindow().webContents.setAudioMuted(!setting.get('sound.enable'))
    view.setFuzzyStonePlacement(setting.get('view.fuzzy_stone_placement'))
    view.setAnimatedStonePlacement(setting.get('view.animated_stone_placement'))

    let graphLayout = $('#preferences select[name="graph.layout"]').val()
    let data = {compact: [16, 4], spacious: [22, 4], big: [26, 6]}
    let [gridSize, nodeSize] = data[graphLayout]

    setting.set('graph.grid_size', gridSize)
    setting.set('graph.node_size', nodeSize)

    sabaki.updateSidebar(true, true)

    // Save engines

    setting.clearEngines()

    for (let li of $('#preferences .engines-list li').get()) {
        let $nameinput = $(li).find('h3 input')

        setting.addEngine(
            $nameinput.val().trim() == '' ? $nameinput.attr('placeholder') : $nameinput.val(),
            $(li).find('h3 + p input').val(),
            $(li).find('h3 + p + p input').val()
        )
    }

    setting.save()
    sabaki.loadEngines()

    ipcRenderer.send('build-menu')
}

/**
 * Menu Methods
 */

sabaki.newFile = function(playSound) {
    if (view.getIsBusy() || !sabaki.askForSave()) return

    view.closeDrawers()
    sabaki.setGameTrees([sabaki.getEmptyGameTree()])
    view.setRepresentedFilename(null)
    sabaki.setGameIndex(0)
    sabaki.updateTreeHash()
    sabaki.updateFileHash()

    if (playSound) {
        sound.playNewGame()
        view.showGameInfo()
    }
}

sabaki.loadFile = function(filename, dontask = false) {
    if (view.getIsBusy() || !dontask && !sabaki.askForSave()) return

    if (!filename) {
        let result = view.showOpenDialog({
            properties: ['openFile'],
            filters: [{name: 'Go Records', extensions: ['sgf', 'gib', 'ngf']}, {name: 'All Files', extensions: ['*']}]
        })

        if (result) filename = result[0]
    }

    if (filename) {

        let format = 'sgf'

        if (filename.toLowerCase().endsWith('.gib')) {
            format = 'gib'
        }

        if (filename.toLowerCase().endsWith('.ngf')) {
            format = 'ngf'
        }

        sabaki.loadFileFromSgf(fs.readFileSync(filename, {encoding: 'binary'}), format, true, false, err => {
            if (err) return
            view.setRepresentedFilename(filename)
            sabaki.updateFileHash()
        })
    }
}

sabaki.loadFileFromSgf = function(content, format = 'sgf', dontask = false, ignoreEncoding = false, callback = () => {}) {
    if (view.getIsBusy() || !dontask && !sabaki.askForSave()) return
    view.setIsBusy(true)
    view.closeDrawers()

    setTimeout(() => {
        let win = remote.getCurrentWindow()
        let lastprogress = -1
        let error = false
        let trees = []

        try {
            let fileFormatModule = {sgf, gib, ngf}[format]

            trees = fileFormatModule.parse(content, progress => {
                if (progress - lastprogress < 0.1) return
                view.setProgressIndicator(progress, win)
                lastprogress = progress
            }, ignoreEncoding)

            if (trees.length == 0) throw true
        } catch (err) {
            view.showMessageBox('This file is unreadable.', 'warning')
            error = true
        }

        if (trees.length != 0) {
            view.setRepresentedFilename(null)
            sabaki.setGameTrees(trees)
            sabaki.setGameIndex(0)
            sabaki.updateTreeHash()
            sabaki.updateFileHash()
        }

        if (trees.length > 1) {
            setTimeout(view.showGameChooser, setting.get('gamechooser.show_delay'))
        }

        view.setProgressIndicator(-1, win)
        view.setIsBusy(false)
        callback(error)
    }, setting.get('app.loadgame_delay'))
}

sabaki.saveFile = function(filename) {
    if (view.getIsBusy()) return

    if (!filename) {
        filename = view.showSaveDialog({
            filters: [sgf.meta, {name: 'All Files', extensions: ['*']}]
        })
    }

    if (filename) {
        view.setIsBusy(true)
        fs.writeFileSync(filename, sabaki.saveFileToSgf())
        view.setRepresentedFilename(filename)
        sabaki.updateTreeHash()
        sabaki.updateFileHash()
        view.setIsBusy(false)

        return true
    }

    return false
}

sabaki.saveFileToSgf = function() {
    let trees = sabaki.getGameTrees()
    let text = ''

    for (let i = 0; i < trees.length; i++) {
        trees[i].nodes[0].AP = [app.getName() + ':' + app.getVersion()]
        text += '(' + sgf.stringify(trees[i]) + ')\n\n'
    }

    return text
}

sabaki.goStep = function(step) {
    if (view.getGuessMode()) return

    let [tree, index] = sabaki.getCurrentTreePosition()
    let tp = gametree.navigate(tree, index, step)
    if (tp) sabaki.setCurrentTreePosition(...tp)
}

sabaki.goBack = function() {
    sabaki.goStep(-1)
}

sabaki.goForward = function() {
    sabaki.goStep(1)
}

sabaki.goToMoveNumber = function(number) {
    number = +number

    if (isNaN(number)) return
    if (number < 0) number = 0

    let root = sabaki.getRootTree()
    let tp = gametree.navigate(root, 0, Math.round(number))

    if (tp) sabaki.setCurrentTreePosition(...tp)
    else sabaki.goToEnd()
}

sabaki.goToNextFork = function() {
    let [tree, index] = sabaki.getCurrentTreePosition()

    if (index != tree.nodes.length - 1)
        sabaki.setCurrentTreePosition(tree, tree.nodes.length - 1)
    else if (tree.current != null) {
        let subtree = tree.subtrees[tree.current]
        sabaki.setCurrentTreePosition(subtree, subtree.nodes.length - 1)
    }
}

sabaki.goToPreviousFork = function() {
    let [tree, index] = sabaki.getCurrentTreePosition()

    if (tree.parent == null || tree.parent.nodes.length == 0) {
        if (index != 0) sabaki.setCurrentTreePosition(tree, 0)
    } else {
        sabaki.setCurrentTreePosition(tree.parent, tree.parent.nodes.length - 1)
    }
}

sabaki.goToComment = function(step) {
    let tp = sabaki.getCurrentTreePosition()

    while (true) {
        tp = gametree.navigate(...tp, step)
        if (!tp) break

        let node = tp[0].nodes[tp[1]]

        if (setting.get('sgf.comment_properties').some(p => p in node))
            break
    }

    if (tp) sabaki.setCurrentTreePosition(...tp)
}

sabaki.goToBeginning = function() {
    let tree = sabaki.getRootTree()
    sabaki.setCurrentTreePosition(tree, 0)
}

sabaki.goToEnd = function() {
    let tree = sabaki.getRootTree()
    let tp = gametree.navigate(tree, 0, gametree.getCurrentHeight(tree) - 1)
    sabaki.setCurrentTreePosition(...tp)
}

sabaki.goToSiblingVariation = function(sign) {
    let [tree, index] = sabaki.getCurrentTreePosition()

    sign = sign < 0 ? -1 : 1

    let mod = tree.parent.subtrees.length
    let i = (tree.parent.current + mod + sign) % mod

    sabaki.setCurrentTreePosition(tree.parent.subtrees[i], 0)
}

sabaki.goToNextVariation = () => sabaki.goToSiblingVariation(1)

sabaki.goToPreviousVariation = () => sabaki.goToSiblingVariation(-1)

sabaki.goToMainVariation = function() {
    let tp = sabaki.getCurrentTreePosition()
    let tree = tp[0]
    let root = sabaki.getRootTree()

    while (!gametree.onMainTrack(tree)) {
        tree = tree.parent
    }

    while (root.current != null) {
        root.current = 0
        root = root.subtrees[0]
    }

    if (gametree.onMainTrack(tp[0])) {
        sabaki.setCurrentTreePosition(tree, tp[1], false, true)
    } else {
        sabaki.setCurrentTreePosition(tree, tree.nodes.length - 1, false, true)
    }
}

sabaki.copyVariation = function(tree, index) {
    let clone = gametree.clone(tree)
    if (index != 0) gametree.split(clone, index - 1)

    $('body').data('copyvardata', clone)
}

sabaki.cutVariation = function(tree, index) {
    sabaki.setUndoable(true, 'Undo Cut Variation')
    sabaki.copyVariation(tree, index)
    sabaki.removeNode(tree, index, false, false)
}

sabaki.pasteVariation = function(tree, index) {
    if ($('body').data('copyvardata') == null) return

    sabaki.setUndoable(true, 'Undo Paste Variation')

    let updateRoot = tree == sabaki.getRootTree()
    let oldLength = tree.nodes.length
    let splitted = gametree.split(tree, index)
    let copied = gametree.clone($('body').data('copyvardata'), true)

    copied.parent = splitted
    splitted.subtrees.push(copied)

    if (updateRoot) {
        sabaki.setRootTree(splitted)
    }

    if (splitted.subtrees.length == 1) {
        gametree.reduce(splitted)
        sabaki.setCurrentTreePosition(splitted, oldLength, true, true)
    } else {
        sabaki.setCurrentTreePosition(copied, 0, true, true)
    }
}

sabaki.flattenVariation = function(tree, index) {
    sabaki.setUndoable(true, 'Undo Flatten')

    let board = gametree.getBoard(tree, index)
    let rootNode = sabaki.getRootTree().nodes[0]
    let inherit = ['BR', 'BT', 'DT', 'EV', 'GN', 'GC', 'PB', 'PW', 'RE', 'SO', 'WT', 'WR']

    let clone = gametree.clone(tree)
    if (index != 0) gametree.split(clone, index - 1)
    let node = clone.nodes[0]

    node.AB = []
    node.AW = []
    node.AE = []
    delete node.B
    delete node.W
    clone.parent = null
    inherit.forEach(x => x in rootNode ? node[x] = rootNode[x] : null)

    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            let sign = board.get([x, y])
            if (sign == 0) continue

            node[sign > 0 ? 'AB' : 'AW'].push(sgf.vertex2point([x, y]))
        }
    }

    sabaki.setRootTree(clone)
}

sabaki.makeMainVariation = function(tree, index) {
    sabaki.setUndoable(true, 'Restore Main Variation')
    view.closeDrawers()

    let t = tree

    while (t.parent != null) {
        t.parent.subtrees.splice(t.parent.subtrees.indexOf(t), 1)
        t.parent.subtrees.unshift(t)
        t.parent.current = 0

        t = t.parent
    }

    t = tree

    while (t.current != null) {
        let [x] = t.subtrees.splice(t.current, 1)
        t.subtrees.unshift(x)
        t.current = 0

        t = x
    }

    sabaki.setCurrentTreePosition(tree, index, true, true)
}

sabaki.shiftVariation = function(step, tree, index) {
    if (!tree.parent) return

    sabaki.setUndoable(true, 'Undo Shift Variation')
    view.closeDrawers()

    let subtrees = tree.parent.subtrees
    let m = subtrees.length
    let i = subtrees.indexOf(tree)
    let inew = ((i + step) % m + m) % m

    subtrees.splice(i, 1)
    subtrees.splice(inew, 0, tree)

    sabaki.setCurrentTreePosition(tree, index, true, true)
}

sabaki.removeNode = function(tree, index, confirm = null, undoable = true) {
    if (!tree.parent && index == 0) {
        view.showMessageBox('The root node cannot be removed.', 'warning')
        return
    }

    if (confirm != false && setting.get('edit.show_removenode_warning') && view.showMessageBox(
        'Do you really want to remove this node?',
        'warning',
        ['Remove Node', 'Cancel'], 1
    ) == 1) return

    // Save undo information

    if (undoable) sabaki.setUndoable(true, 'Undo Remove Node')

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
        gametree.reduce(parent)
    }

    sabaki.updateGraph()
    if (!prev || sabaki.getCurrentGraphNode()) prev = sabaki.getCurrentTreePosition()
    sabaki.setCurrentTreePosition(...prev)
}

sabaki.removeOtherVariations = function(tree, index, confirm = null) {
    if (confirm != false && setting.get('edit.show_removeothervariations_warning') && view.showMessageBox(
        'Do you really want to remove all other variations?',
        'warning',
        ['Remove Variations', 'Cancel'], 1
    ) == 1) return

    // Save undo information

    sabaki.setUndoable(true, 'Undo Remove Other Variations')
    view.closeDrawers()

    // Remove all subsequent variations

    let t = tree

    while (t.subtrees.length != 0) {
        t.subtrees = [t.subtrees[t.current]]
        t.current = 0

        t = t.subtrees[0]
    }

    // Remove all precedent variations

    t = tree

    while (t.parent != null) {
        t.parent.subtrees = [t]
        t.parent.current = 0

        t = t.parent
    }

    sabaki.setCurrentTreePosition(tree, index, true, true)
}

sabaki.undoBoard = function() {
    if ($('body').data('undodata-root') == null
    || $('body').data('undodata-level') == null)
        return

    view.setIsBusy(true)

    setTimeout(() => {
        sabaki.setRootTree($('body').data('undodata-root'))

        let tp = gametree.navigate(sabaki.getRootTree(), 0, $('body').data('undodata-level'))
        sabaki.setCurrentTreePosition(...tp, true, true)

        sabaki.setUndoable(false)
        view.setIsBusy(false)
    }, setting.get('edit.undo_delay'))
}

/**
 * Main events
 */

$(document).ready(function() {
    sabaki.loadSettings()
    sabaki.loadEngines()
    sabaki.prepareDragDropFiles()
    sabaki.prepareBars()
    sabaki.prepareEditTools()
    sabaki.prepareAutoplay()
    sabaki.prepareSidebar()
    sabaki.prepareSlider()
    sabaki.prepareConsole()
    sabaki.prepareGameInfo()
    sabaki.preparePreferences()
    sabaki.prepareCleanMarkup()
    sabaki.newFile()

    view.prepareResizers()
    view.prepareGameChooser()
    view.prepareIndicator()
    view.updateTitle()

    $('#main, #graph canvas:last-child, #graph .slider').on('wheel', function(evt) {
        evt.preventDefault()

        if (evt.deltaY > 0) sabaki.goForward()
        else if (evt.deltaY < 0) sabaki.goBack()
    })

    $('body').on('mouseup', function() {
        $('#goban').data('mousedown', false)
    })
}).on('keydown', function(evt) {
    if (evt.keyCode == 27) {
        // Escape

        if (!view.closeDrawers() && remote.getCurrentWindow().isFullScreen())
            view.setFullScreen(false)
    }
})

$(window).on('load', function() {
    let win = remote.getCurrentWindow()
    if (win) win.show()
}).on('resize', function() {
    view.resizeBoard()
}).on('beforeunload', function(evt) {
    let win = remote.getCurrentWindow()

    if (!$('body').data('closewindow')) {
        evt.returnValue = ' '

        setTimeout(() => {
            if (sabaki.askForSave()) {
                $('body').data('closewindow', true)
                win.close()
            }
        }, 0)
    } else {
        sabaki.detachEngine()

        if (!win.isMaximized() && !win.isMinimized() && !win.isFullScreen()) {
            let [width, height] = win.getContentSize()
            setting.set('window.width', width).set('window.height', height)
        }
    }
})
