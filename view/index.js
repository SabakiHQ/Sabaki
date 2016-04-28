var remote = { getCurrentWindow: function() {} }
var ipcRenderer = { send: function() {} }
var clipboard = null
var fs = null
var sgf = window.sgf
var boardmatcher = window.boardmatcher
var fuzzyfinder = window.fuzzyfinder
var gametree = window.gametree
var sound = window.sound
var helper = window.helper
var setting = window.setting
var gtp = null
var process = { argv: { length: -1 }, platform: 'web' }
var app = { getName: function() { return 'Sabaki' }, getVersion: function() { return 'web' } }
var dialog = { showMessageBox: function() {} }

var GeminiScrollbar = window.GeminiScrollbar
var Board = window.Board
var Menu = window.Menu
var MenuItem = null

/**
 * Getter & setter
 */

function getGameTrees() {
    var trees = document.body.retrieve('gametrees')
    return trees ? trees : [getRootTree()]
}

function setGameTrees(trees) {
    trees.forEach(function(tree) { tree.parent = null })
    document.body.store('gametrees', trees)
}

function getGameIndex() {
    return getGameTrees().length == 1 ? 0 : document.body.retrieve('gameindex')
}

function setGameIndex(index) {
    document.body.store('gameindex', index)
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
    return document.body.retrieve('filehash')
}

function getGraphMatrixDict() {
    return $('graph').retrieve('graphmatrixdict')
}

function setGraphMatrixDict(matrixdict) {
    if (!getShowSidebar()) return

    var s, graph

    try {
        s = $('graph').retrieve('sigma')
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

    $('graph').store('graphmatrixdict', matrixdict)
}

function getCurrentTreePosition() {
    return $('goban').retrieve('position')
}

function setCurrentTreePosition(tree, index, now, redraw) {
    if (!tree || getScoringMode()) return

    // Remove old graph node color

    var oldNode = getCurrentGraphNode()
    var oldPos = getCurrentTreePosition()
    var node = getGraphNode(tree, index)

    if (oldNode && oldNode != node)
        oldNode.color = oldNode.originalColor

    // Store new position

    $('goban').store('position', [tree, index])
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
    || 'HA' in tree.nodes[index] && tree.nodes[index].HA[0].toInt() >= 1)
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
    var s = $('graph').retrieve('sigma')
    return s.graph.nodes(id)
}

function getSelectedTool() {
    var li = $$('#edit .selected')[0]
    var tool = li.get('class').replace('selected', '').replace('-tool', '').trim()

    if (tool == 'stone') {
        return li.getElement('img').get('src').indexOf('_1') != -1 ? 'stone_1' : 'stone_-1'
    } else if (tool == 'line') {
        return li.getElement('img').get('src').indexOf('line') != -1 ? 'line' : 'arrow'
    } else {
        return tool
    }
}

function setSelectedTool(tool) {
    if (!getEditMode()) {
        setEditMode(true)
        if (getSelectedTool().indexOf(tool) != -1) return
    }

    $('goban').store('edittool-data', null)
    $$('#edit .' + tool + '-tool a').fireEvent('click')
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
            var sign = board.arrangement[li.retrieve('vertex')]
            var types = ['ghost_1', 'ghost_-1', 'circle', 'triangle',
                'cross', 'square', 'label', 'point', 'dimmed', 'paint_1', 'paint_-1']

            types.forEach(function(x) {
                if (li.hasClass(x)) li.removeClass(x)
            })
            li.getElement('.stone span').set('title', '')

            if (li.retrieve('vertex') in board.markups) {
                var markup = board.markups[li.retrieve('vertex')]
                var type = markup[0], ghost = markup[1], label = markup[2]

                if (type != '') li.addClass(type)
                if (ghost != 0) li.addClass('ghost_' + ghost)
                if (label != '') li.getElement('.stone span').set('title', label)
                li.toggleClass('smalllabel', label.length >= 3)
            }

            if (li.hasClass('sign_' + sign)) continue

            for (var i = -1; i <= 1; i++) {
                if (li.hasClass('sign_' + i)) li.removeClass('sign_' + i)
            }

            li.addClass('sign_' + sign).getElement('img')
                .set('src', setting.get('board.stone_image_' + sign))
        }
    }

    // Add lines

    $$('#goban hr').destroy()

    board.lines.forEach(function(line) {
        $('goban').grab(
            new Element('hr', { class: line[2] ? 'arrow' : 'line' })
            .store('v1', line[0])
            .store('v2', line[1])
        )
    })

    updateBoardLines()
}

function getScoringMethod() {
    return $$('#score .tabs .territory')[0].hasClass('current') ? 'territory' : 'area'
}

function setScoringMethod(method) {
    $$('#score .tabs li').removeClass('current')
    $$('#score .tabs .' + method).addClass('current')
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

function getKomi() {
    var rootNode = getRootTree().nodes[0]
    return 'KM' in rootNode ? rootNode.KM[0].toFloat() : 0
}

function getEngineName() {
    return $('console').retrieve('enginename')
}

function getEngineController() {
    return $('console').retrieve('controller')
}

function getEngineCommands() {
    return $('console').retrieve('commands')
}

function setUndoable(undoable) {
    if (undoable) {
        var rootTree = gametree.clone(getRootTree())
        var position = gametree.getLevel.apply(null, getCurrentTreePosition())

        document.body
            .addClass('undoable')
            .store('undodata-root', rootTree)
            .store('undodata-pos', position)
    } else {
        document.body
            .removeClass('undoable')
            .store('undodata-root', null)
            .store('undodata-pos', null)
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
    var buffer = ';GM[1]AP[' + app.getName() + ':' + app.getVersion() + ']'
    buffer += 'CA[UTF-8]KM[' + setting.get('game.default_komi')
        + ']SZ[' + setting.get('game.default_board_size') + ']'

    return sgf.parse(sgf.tokenize(buffer))
}

/**
 * Methods
 */

function loadSettings() {
    if (setting.get('view.fuzzy_stone_placement'))
        $('goban').addClass('fuzzy')
    if (setting.get('view.show_coordinates'))
        $('goban').addClass('coordinates')
    if (setting.get('view.show_next_moves'))
        $('goban').addClass('variations')
    if (setting.get('view.show_leftsidebar')) {
        document.body.addClass('leftsidebar')
        setLeftSidebarWidth(setting.get('view.leftsidebar_width'))
    }
    if (setting.get('view.show_graph') || setting.get('view.show_comments')) {
        document.body.addClass('sidebar')
        setSidebarArrangement(setting.get('view.show_graph'), setting.get('view.show_comments'))
    }

    setSidebarWidth(setting.get('view.sidebar_width'))
}

function prepareEditTools() {
    $$('#edit ul a').addEvent('click', function() {
        if (!this.getParent().hasClass('selected')) {
            $$('#edit .selected').removeClass('selected')
            this.getParent().addClass('selected')
        } else if (this.getParent().hasClass('stone-tool')) {
            var img = this.getElement('img')
            var black = img.get('src') == '../img/edit/stone_1.svg'
            img.set('src', black ? '../img/edit/stone_-1.svg' : '../img/edit/stone_1.svg')
        } else if (this.getParent().hasClass('line-tool')) {
            var img = this.getElement('img')
            var line = img.get('src') == '../img/edit/line.svg'
            img.set('src', line ? '../img/edit/arrow.svg' : '../img/edit/line.svg')
        }
    })
}

function prepareGameGraph() {
    var container = $('graph')
    var s = new sigma({
        renderer: {
            container: container,
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
        console.log(e)
        openNodeMenu.apply(null, getTreePos(e).concat([e.data.captor]))
    })

    container.store('sigma', s)
}

function prepareSlider() {
    var slider = $$('#sidebar .slider .inner')[0]
    Element.NativeEvents.touchstart = 2
    Element.NativeEvents.touchmove = 2
    Element.NativeEvents.touchend = 2

    var changeSlider = function(percentage) {
        percentage = Math.min(1, Math.max(0, percentage))

        var level = Math.round((gametree.getHeight(getRootTree()) - 1) * percentage)
        var pos = gametree.navigate(getRootTree(), 0, level)
        if (!pos) pos = gametree.navigate(getRootTree(), 0, gametree.getCurrentHeight(getRootTree()) - 1)

        if (helper.equals(pos, getCurrentTreePosition())) return
        setCurrentTreePosition.apply(null, pos)
        updateSlider()
    }

    slider.addEvent('mousedown', function(e) {
        if (e.event.buttons != 1) return

        this.store('mousedown', true).addClass('active')
        document.fireEvent('mousemove', e)
    }).addEvent('touchstart', function() {
        this.addClass('active')
    }).addEvent('touchmove', function(e) {
        var percentage = (e.client.y - slider.getPosition().y) / slider.getSize().y
        changeSlider(percentage)
    }).addEvent('touchend', function() {
        this.removeClass('active')
    })

    document.addEvent('mouseup', function() {
        slider.store('mousedown', false)
            .removeClass('active')
        document.onselectstart = null
    }).addEvent('mousemove', function(e) {
        if (e.event.buttons != 1 || !slider.retrieve('mousedown'))
            return

        var percentage = (e.event.clientY - slider.getPosition().y) / slider.getSize().y
        changeSlider(percentage)
        document.onselectstart = function() { return false }
    })

    // Prepare previous/next buttons

    $$('#sidebar .slider a').addEvent('mousedown', function() {
        this.store('mousedown', true)
        startAutoScroll(this.hasClass('next') ? 1 : -1)
    })

    document.addEvent('mouseup', function() {
        $$('#sidebar .slider a').store('mousedown', false)
    })
}

function prepareDragDropFiles() {
    Element.NativeEvents.dragover = 2
    Element.NativeEvents.dragenter = 2
    Element.NativeEvents.dragleave = 2
    Element.NativeEvents.dragstart = 2
    Element.NativeEvents.drop = 2

    document.body.addEvent('dragover', function(e) {
        e.preventDefault()
    }).addEvent('drop', function(e) {
        e.preventDefault()

        if (e.event.dataTransfer.files.length == 0) return
        loadFile(e.event.dataTransfer.files[0].path)
    })
}

function prepareConsole() {
    return

    $$('#console form').addEvent('submit', function(e) {
        e.preventDefault()

        var input = this.getElement('input')
        if (input.value.trim() == '') return
        input.blur()

        var command = gtp.parseCommand(input.value)
        sendGTPCommand(command)
    })

    $$('#console form input').addEvent('keydown', function(e) {
        if ([40, 38, 9].indexOf(e.code) != -1) e.preventDefault()
        var inputs = $$('#console form input')

        if (this.retrieve('index') == null) this.store('index', inputs.indexOf(this))
        var i = this.retrieve('index')
        var length = inputs.length

        if ([38, 40].indexOf(e.code) != -1) {
            if (e.code == 38) {
                // Up
                i = Math.max(i - 1, 0)
            } else if (e.code == 40) {
                // Down
                i = Math.min(i + 1, length - 1)
            }

            this.value = i == length - 1 ? '' : inputs[i].value
            this.store('index', i)
        } else if (e.code == 9) {
            // Tab
            var tokens = this.value.split(' ')
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
    $$('#info button[type="submit"]').addEvent('click', function() {
        commitGameInfo()
        closeGameInfo()
        return false
    })

    $$('#info button[type="reset"]').addEvent('click', function() {
        closeGameInfo()
        return false
    })

    $$('#info .currentplayer').addEvent('click', function() {
        var data = $$('#info section input[type="text"]').map(function(el) {
            return el.get('value')
        })

        $$('#info section input[name="rank_1"]')[0].set('value', data[3])
        $$('#info section input[name="rank_-1"]')[0].set('value', data[0])
        $$('#info section input[name="name_1"]')[0].set('value', data[2])
        $$('#info section input[name="name_-1"]')[0].set('value', data[1])

        data = $$('#info section .menu').map(function(el) {
            return [el.hasClass('active'), el.retrieve('engineindex')]
        })

        $$('#info section .menu')[0].toggleClass('active', data[1][0])
        $$('#info section .menu')[0].store('engineindex', data[1][1])
        $$('#info section .menu')[1].toggleClass('active', data[0][0])
        $$('#info section .menu')[1].store('engineindex', data[0][1])
    })

    $$('#info section img.menu').addEvent('click', function() {
        var el = this

        function selectEngine(engine, i) {
            var currentIndex = this.retrieve('engineindex')
            if (currentIndex == null) currentIndex = -1
            if (i == currentIndex) return

            this.getParent().getElement('input[name^="name_"]').set('value', engine ? engine.name : '')
            this.store('engineindex', i)

            if (engine) {
                var els = $('info').getElements('section .menu')
                var other = els[0] == this ? els[1] : els[0]
                if (other) selectEngine.call(other, null, -1)

                this.addClass('active')
            } else {
                $('info').getElements('section .menu')
                .removeClass('active')
            }
        }

        openEnginesMenu(el, selectEngine.bind(el))
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
    document.body.store('filehash', generateFileHash())
}

function loadEngines() {
    // Load engines list

    var ul = $$('#preferences .engines-list ul')[0]
    ul.empty()

    setting.getEngines().forEach(function(engine) {
        addEngineItem(engine.name, engine.path, engine.args)
    })
}

function attachEngine(exec, args, genMove) {
    return
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
            $('console').store('controller', null)
            setIsBusy(false)
        })

        $('console').store('controller', controller)

        sendGTPCommand(new gtp.Command(null, 'name'), true, function(response) {
            $('console').store('enginename', response.content)
        })
        sendGTPCommand(new gtp.Command(null, 'version'))
        sendGTPCommand(new gtp.Command(null, 'protocol_version'))
        sendGTPCommand(new gtp.Command(null, 'list_commands'), true, function(response) {
            $('console').store('commands', response.content.split('\n'))
        })

        syncEngine()
        setIsBusy(false)

        if (!!genMove) generateMove()
    }, setting.get('gtp.attach_delay'))
}

function detachEngine() {
    return
    sendGTPCommand(new gtp.Command(null, 'quit'), true)

    $('console').store('controller', null)
        .store('boardhash', null)

    setIsBusy(false)
}

function syncEngine() {
    return
    var board = getBoard()

    if (!getEngineController()
        || $('console').retrieve('boardhash') == board.getHash()) return
    if (!board.isValid()) {
        showMessageBox('GTP engines don’t support invalid board positions.', 'warning')
        return
    }

    setIsBusy(true)

    sendGTPCommand(new gtp.Command(null, 'clear_board'), true)
    sendGTPCommand(new gtp.Command(null, 'boardsize', [board.size]), true)
    sendGTPCommand(new gtp.Command(null, 'komi', [getKomi()]), true)

    // Replay
    for (var i = 0; i < board.size; i++) {
        for (var j = 0; j < board.size; j++) {
            var v = [i, j]
            var sign = board.arrangement[v]
            if (sign == 0) continue
            var color = sign > 0 ? 'B' : 'W'
            var point = gtp.vertex2point(v, board.size)

            sendGTPCommand(new gtp.Command(null, 'play', [color, point]), true)
        }
    }

    $('console').store('boardhash', board.getHash())
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
        var li = $$('#goban .pos_' + vertex[0] + '-' + vertex[1])
        var direction = Math.floor(Math.random() * 9)

        for (var i = 0; i < 9; i++) li.removeClass('shift_' + i)
        li.addClass('shift_' + direction)
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
        sendGTPCommand(
            new gtp.Command(null, 'play', [color, gtp.vertex2point(vertex, getBoard().size)]),
            true
        )
        $('console').store('boardhash', getBoard().getHash())

        setIsBusy(true)
        setTimeout(function() {
            generateMove(true)
        }, setting.get('gtp.move_delay'))
    }
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

        var hr = $('goban').retrieve('edittool-data')

        if (hr) {
            var v1 = hr.retrieve('v1'), v2 = hr.retrieve('v2')
            var toDelete = $$('#goban hr').filter(function(x) {
                var w1 = x.retrieve('v1'), w2 = x.retrieve('v2')
                var result = x != hr
                    && w1[0] == v1[0] && w1[1] == v1[1]
                    && w2[0] == v2[0] && w2[1] == v2[1]

                if (tool == 'line' || x.hasClass('line')) result = result || x != hr
                    && w1[0] == v2[0] && w1[1] == v2[1]
                    && w2[0] == v1[0] && w2[1] == v1[1]

                return result
            })

            if (toDelete.length != 0) hr.destroy()
            toDelete.destroy()
        }

        $('goban').store('edittool-data', null)

        // Update SGF & board

        node.LN = []
        node.AR = []
        board.lines = []

        $$('#goban hr').forEach(function(hr) {
            var p1 = sgf.vertex2point(hr.retrieve('v1'))
            var p2 = sgf.vertex2point(hr.retrieve('v2'))

            if (p1 == p2) return

            node[hr.hasClass('arrow') ? 'AR' : 'LN'].push(p1 + ':' + p2)
            board.lines.push([hr.retrieve('v1'), hr.retrieve('v2'), hr.hasClass('arrow')])
        })

        if (node.LN.length == 0) delete node.LN
        if (node.AR.length == 0) delete node.AR
    } else {
        if (event.button != 0) return

        if (tool != 'label' && tool != 'number') {
            if (vertex in board.markups && board.markups[vertex][0] == tool) {
                delete board.markups[vertex]
            } else {
                board.markups[vertex] = [tool, 0, '']
            }
        } else if (tool == 'number') {
            if (vertex in board.markups && board.markups[vertex][0] == 'label') {
                delete board.markups[vertex]
            } else {
                var number = 1

                if ('LB' in node) {
                    var list = node.LB.map(function(x) {
                        return x.substr(3).toInt()
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

                board.markups[vertex] = [tool, 0, number.toString()]
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

                board.markups[vertex] = [tool, 0, alpha[k]]
            }
        }

        for (var id in dictionary) delete node[dictionary[id]]

        // Update SGF

        $$('#goban .row li').forEach(function(li) {
            var v = li.retrieve('vertex')
            if (!(v in board.markups)) return

            var id = dictionary[board.markups[v][0]]
            var pt = sgf.vertex2point(v)
            if (id == 'LB') pt += ':' + board.markups[v][2]

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

    if (!$('goban').retrieve('edittool-data')) {
        var hr = new Element('hr', { class: tool }).store('v1', vertex).store('v2', vertex)
        $('goban').grab(hr).store('edittool-data', hr)
    } else {
        var hr = $('goban').retrieve('edittool-data')
        hr.store('v2', vertex)
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

    if (getScoringMode()) {
        if ($('score').hasClass('show')) return
        if (event.button != 0) return
        if (getBoard().arrangement[vertex] == 0) return

        getBoard().getRelatedChains(vertex).forEach(function(v) {
            $$('#goban .pos_' + v[0] + '-' + v[1]).toggleClass('dead')
        })

        updateAreaMap()
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
            if ($$('#goban .pos_' + vertex[0] + '-' + vertex[1])[0].hasClass('paint_1')) return

            var i = 0
            if (Math.abs(vertex[1] - nextVertex[1]) > Math.abs(vertex[0] - nextVertex[0]))
                i = 1

            for (var x = 0; x < board.size; x++) {
                for (var y = 0; y < board.size; y++) {
                    var z = i == 0 ? x : y
                    if (Math.abs(z - vertex[i]) < Math.abs(z - nextVertex[i]))
                        $$('#goban .pos_' + x + '-' + y)[0].addClass('paint_1')
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
    clearTimeout($('sidebar').retrieve('updatesidebarid'))

    var tp = getCurrentTreePosition()
    var tree = tp[0], index = tp[1]

    $('sidebar').store('updatesidebarid', setTimeout(function() {
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

    $$('#properties .gm-scroll-view')[0].scrollTo(0, 0)
    $('properties').retrieve('scrollbar').update()
}

function updateAreaMap() {
    var board = getBoard().clone()

    $$('#goban .row li.dead').forEach(function(li) {
        if (li.hasClass('sign_1')) board.captures['-1']++
        else if (li.hasClass('sign_-1')) board.captures['1']++

        board.arrangement[li.retrieve('vertex')] = 0
    })

    var map = board.getAreaMap()

    $$('#goban .row li').forEach(function(li) {
        li.removeClass('area_-1').removeClass('area_0').removeClass('area_1')
            .addClass('area_' + map[li.retrieve('vertex')])
    })

    var falsedead = $$('#goban .row li.area_-1.sign_-1.dead, #goban .row li.area_1.sign_1.dead')

    if (falsedead.length > 0) {
        falsedead.removeClass('dead')
        return updateAreaMap()
    }

    $('goban').store('areamap', map)
        .store('finalboard', board)
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
    var info = $('info')

    var data = {
        'rank_1': 'BR',
        'rank_-1': 'WR',
        'name_1': 'PB',
        'name_-1': 'PW',
        'result': 'RE',
        'name': 'GN',
        'event': 'EV'
    }

    for (var name in data) {
        var value = info.getElement('input[name="' + name + '"]').get('value').trim()
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

    var komi = info.getElement('input[name="komi"]').get('value').toFloat()
    rootNode.KM = [String.from(komi)]
    if (isNaN(komi)) rootNode.KM = ['0']

    var handicap = info.getElement('select[name="handicap"]').selectedIndex
    if (handicap == 0) delete rootNode.HA
    else rootNode.HA = [String.from(handicap + 1)]

    var size = info.getElement('input[name="size"]').get('value').toInt()
    rootNode.SZ = [String.from(Math.max(Math.min(size, 25), 9))]
    if (isNaN(size)) rootNode.SZ = ['' + setting.get('game.default_board_size')]

    if (!info.getElement('select[name="handicap"]').disabled) {
        setCurrentTreePosition(getRootTree(), 0)

        if (!('HA' in rootNode)) {
            delete rootNode.AB
        } else {
            var board = getBoard()
            var stones = board.getHandicapPlacement(rootNode.HA[0].toInt())
            rootNode.AB = []

            for (var i = 0; i < stones.length; i++) {
                rootNode.AB.push(sgf.vertex2point(stones[i]))
            }
        }

        setCurrentTreePosition(getRootTree(), 0)
    }

    setUndoable(false)
    updateSidebar()

    // Start engine

    if (!$('info').hasClass('disabled')) {
        var engines = setting.getEngines()
        var indices = $$('#info section .menu').map(function(x) { return x.retrieve('engineindex') })
        var max = Math.max.apply(null, indices)
        var sign = indices.indexOf(max) == 0 ? 1 : -1

        if (max >= 0) {
            var engine = engines[max]
            attachEngine(engine.path, engine.args, getCurrentPlayer() == sign)
        } else {
            detachEngine()
        }
    }
}

function commitScore() {
    var rootNode = getRootTree().nodes[0]
    var results = $$('#score tbody td:last-child').get('text')
    var diff = results[0].toFloat() - results[1].toFloat()
    var result = diff > 0 ? 'B+' : (diff < 0 ? 'W+' : 'Draw')
    if (diff != 0) result = result + Math.abs(diff)

    rootNode.RE = [result]

    showGameInfo()
    setUndoable(false)
}

function commitPreferences() {
    // Save general preferences

    $$('#preferences input[type="checkbox"]').forEach(function(el) {
        setting.set(el.name, el.checked)
    })

    remote.getCurrentWindow().webContents.setAudioMuted(!setting.get('sound.enable'))
    setFuzzyStonePlacement(setting.get('view.fuzzy_stone_placement'))

    // Save engines

    setting.clearEngines()

    $$('#preferences .engines-list li').forEach(function(li) {
        var nameinput = li.getElement('h3 input')

        setting.addEngine(
            nameinput.value.trim() == '' ? nameinput.placeholder : nameinput.value,
            li.getElement('h3 + p input').value,
            li.getElement('h3 + p + p input').value
        )
    })

    setting.save()
    loadEngines()

    ipcRenderer.send('build-menu')
}

function sendGTPCommand(command, ignoreBlocked, callback) {
    if (!getEngineController()) {
        $$('#console form:last-child input')[0].value = ''
        return
    }

    var controller = getEngineController()
    var container = $$('#console .inner')[0]
    var oldform = container.getElement('form:last-child')
    var form = oldform.clone().cloneEvents(oldform)
    var pre = new Element('pre', { text: ' ' })

    form.getElement('input').set('value', '').cloneEvents(oldform.getElement('input'))
    oldform.addClass('waiting').getElement('input').value = command.toString()
    container.grab(pre).grab(form)
    if (getShowLeftSidebar()) form.getElement('input').focus()

    // Cleanup
    var forms = $$('#console .inner form')
    if (forms.length > setting.get('console.max_history_count')) {
        forms[0].getNext('pre').dispose()
        forms[0].dispose()
    }

    var listener = function(response, c) {
        pre.set('html', response.toHtml())
        helper.wireLinks(pre)
        oldform.removeClass('waiting')
        if (callback) callback(response)

        // Update scrollbars
        var view = $$('#console .gm-scroll-view')[0]
        var scrollbar = $('console').retrieve('scrollbar')

        view.scrollTo(0, view.getScrollSize().y)
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
    return
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
            v = gtp.point2vertex(r.content, getBoard().size)

        $('console').store('boardhash', getBoard().makeMove(getCurrentPlayer(), v).getHash())
        makeMove(v, false)
    })
}

function centerGraphCameraAt(node) {
    if (!getShowSidebar() || !node) return

    var s = $('graph').retrieve('sigma')
    s.renderers[0].resize().render()

    var matrixdict = getGraphMatrixDict()
    var y = matrixdict[1][node.id][1]

    var wp = gametree.getWidth(y, matrixdict[0])
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
            'Your changes will be lost if you close this file without saving. Do you want to proceed?',
            'warning',
            ['Save', 'Don’t Save', 'Cancel'], 2
        )

        if (answer == 2) return false
    }

    return true
}

function startAutoScroll(direction, delay) {
    if (direction > 0 && !$$('#sidebar .slider a.next')[0].retrieve('mousedown')
    || direction < 0 && !$$('#sidebar .slider a.prev')[0].retrieve('mousedown')) return

    if (delay == null) delay = setting.get('autoscroll.max_interval')
    delay = Math.max(setting.get('autoscroll.min_interval'), delay)

    var slider = $$('#sidebar .slider')[0]
    clearTimeout(slider.retrieve('autoscrollid'))

    if (direction > 0) goForward()
    else goBack()
    updateSlider()

    slider.store('autoscrollid', setTimeout(function() {
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
    loadGameFromIndex(0)
    updateFileHash()

    if (playSound) {
        sound.playNewGame()
        showGameInfo()
    }
}

function loadGameFromIndex(index) {
    var trees = getGameTrees()

    setGameTrees(trees)
    setGameIndex(index)
    setRootTree(trees[index])
    updateTitle()
    setUndoable(false)
    if (setting.get('game.goto_end_after_loading')) goToEnd()
}

function loadFile(filename) {
    if (getIsBusy() || !askForSave()) return

    $('fileinput').set('value', '').removeEvents('change').addEvent('change', function(evt) {
        var f = evt.target.files[0]

        if (f) {
            var r = new FileReader()

            r.onload = function(e) {
                var contents = e.target.result
                loadFileFromSgf(contents, true, function(error) {
                    if (!error) setRepresentedFilename(f.name)
                })
            }

            r.readAsText(f)
        } else {
            alert('Failed to load file.')
        }
    }).click()

    return

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

        try {
            var trees = sgf.parse(sgf.tokenize(content), function(progress) {
                if (progress - lastprogress < 0.05) return

                setProgressIndicator(progress, win)
                lastprogress = progress
            }).subtrees

            if (trees.length == 0 || trees.some(function(t) { return t.nodes.length == 0 }))
                throw true

            setGameTrees(trees)
            loadGameFromIndex(0)
            updateFileHash()

            if (trees.length > 1) showGameChooser()
        } catch(e) {
            showMessageBox('This file is unreadable.', 'warning')
            error = true
        }

        setProgressIndicator(-1, win)
        setIsBusy(false)

        if (callback) callback(error)
    }, setting.get('app.loadgame_delay'))
}

function saveFile() {
    if (getIsBusy()) return

    var sgf = saveFileToSgf()
    var link = 'data:application/x-go-sgf;charset=utf-8,' + encodeURIComponent(sgf)
    var el = new Element('a', {
        download: getRepresentedFilename() || 'game.sgf',
        href: link,
        css: { display: 'none' }
    })

    document.body.grab(el)
    el.click()
    el.destroy()

    updateFileHash()
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

function clearMarkups() {
    closeDrawers()
    var markupIds = ['MA', 'TR', 'CR', 'SQ', 'LB', 'AR', 'LN']

    // Save undo information
    setUndoable(true)

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

    if (gametree.onMainTrack(tree)) return

    while (!gametree.onMainTrack(tree)) {
        tree = tree.parent
    }

    while (root.current != null) {
        root.current = 0
        root = root.subtrees[0]
    }

    setCurrentTreePosition(tree, tree.nodes.length - 1, false, true)
}

function makeMainVariation() {
    setUndoable(true)
    closeDrawers()

    var root = tree = getRootTree()
    var level = gametree.getLevel.apply(null, getCurrentTreePosition())

    while (tree.current != null) {
        var subtree = tree.subtrees.splice(tree.current, 1)[0]
        tree.subtrees.unshift(subtree)
        tree.current = 0

        tree = subtree
    }

    setCurrentTreePosition.apply(null, gametree.navigate(root, 0, level).concat([false, true]))
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

    setUndoable(true)

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
    if (document.body.retrieve('undodata-root') == null
    || document.body.retrieve('undodata-pos') == null)
        return

    setIsBusy(true)

    setTimeout(function() {
        setRootTree(document.body.retrieve('undodata-root'))

        var pos = gametree.navigate(getRootTree(), 0, document.body.retrieve('undodata-pos'))
        setCurrentTreePosition.apply(null, pos.concat([true, true]))

        setUndoable(false)
        setIsBusy(false)
    }, setting.get('edit.undo_delay'))
}

/**
 * Main events
 */

document.addEvent('keydown', function(e) {
    if (e.code == 27) {
        // Escape key
        closeDrawers()
    }

    if (e.code == 36) {
        // Home
        goToBeginning()
    } else if (e.code == 35) {
        // End
        goToEnd()
    } else if (e.code == 38) {
        // Up
        goBack()
    } else if (e.code == 40) {
        // Down
        goForward()
    } else if (e.code == 37) {
        // Left
        goToPreviousVariation()
    } else if (e.code == 39) {
        // Right
        goToNextVariation()
    }
}).addEvent('domready', function() {
    loadSettings()
    loadEngines()
    prepareDragDropFiles()
    prepareEditTools()
    prepareGameGraph()
    prepareSlider()
    prepareConsole()
    prepareGameInfo()
    newFile()

    $$('#goban, #graph canvas:last-child, #graph .slider').addEvent('mousewheel', function(e) {
        if (e.wheel < 0) goForward()
        else if (e.wheel > 0) goBack()
    })
})

window.addEvent('resize', function() {
    resizeBoard()
    setShowSidebar(document.body.getSize().x >= 800)
}).addEvent('beforeunload', function(e) {
    if (!askForSave()) {
        e.event.returnValue = 'false'
        return
    }

    return
    detachEngine()

    var win = remote.getCurrentWindow()
    if (win.isMaximized() || win.isMinimized() || win.isFullScreen()) return

    var size = document.body.getSize()
    setting.set('window.width', size.x).set('window.height', size.y)
})
