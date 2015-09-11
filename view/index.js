var remote = require('remote')
var fs = require('fs')
var shell = require('shell')
var sgf = require('../modules/sgf')
var fuzzyfinder = require('../modules/fuzzyfinder')
var gametree = require('../modules/gametree')
var sound = require('../modules/sound')
var helper = require('../modules/helper')
var process = remote.require('process')
var app = remote.require('app')
var dialog = remote.require('dialog')
var gtp = remote.require('./modules/gtp')
var setting = remote.require('./modules/setting')

var Tuple = require('tuple-w')
var Board = require('../modules/board')
var Scrollbar = require('gemini-scrollbar')
var Menu = remote.require('menu')

var updateSidebarLambda

/**
 * Getter & setter
 */

function getRootTree() {
    if (!getCurrentTreePosition()) return null
    return gametree.getRoot(getCurrentTreePosition()[0])
}

function setRootTree(tree) {
    if (tree.nodes.length == 0) return

    tree.parent = null
    document.body.store('treehash', gametree.getHash(tree))
    setCurrentTreePosition(sgf.addBoard(tree), 0)

    if ('PB' in tree.nodes[0]) setPlayerName(1, tree.nodes[0].PB[0])
    if ('PW' in tree.nodes[0]) setPlayerName(-1, tree.nodes[0].PW[0])
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

function setCurrentTreePosition(tree, index) {
    if (!tree || getScoringMode()) return

    // Remove old graph node color

    var oldNode = getCurrentGraphNode()
    var oldPos = getCurrentTreePosition()
    var node = getGraphNode(tree, index)

    if (oldNode && oldNode != node)
        oldNode.color = oldNode.originalColor

    // Store new position

    $('goban').store('position', new Tuple(tree, index))
    var redraw = !node
        || !gametree.onCurrentTrack(tree)
        || tree.collapsed && index == tree.nodes.length - 1

    var t = tree
    t.collapsed = false
    while (t.parent && t.parent.collapsed) {
        redraw = true
        t.parent.collapsed = false
        t = t.parent
    }

    // Update graph, slider and comment text

    updateSidebar(redraw)
    sgf.addBoard(tree, index)
    if (tree.nodes[index].board) setBoard(tree.nodes[index].board)

    // Determine current player

    setCurrentPlayer(1)

    if ('B' in tree.nodes[index]) setCurrentPlayer(-1)
    else if ('W' in tree.nodes[index]) setCurrentPlayer(1)
    else if ('PL' in tree.nodes[index])
        setCurrentPlayer(tree.nodes[index].PL[0] == 'W' ? -1 : 1)
    else if ('HA' in tree.nodes[index] && tree.nodes[index].HA[0].toInt() >= 1)
        setCurrentPlayer(-1)
}

function getCurrentGraphNode() {
    if (!getCurrentTreePosition()) return null
    return getCurrentTreePosition().unpack(getGraphNode)
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
    } else {
        return tool
    }
}

function setSelectedTool(tool) {
    if (!getEditMode()) {
        setEditMode(true)
        if (getSelectedTool().indexOf(tool) != -1) return
    }

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
            var sign = board.arrangement[li.retrieve('tuple')]
            var types = ['ghost_1', 'ghost_-1', 'circle', 'triangle',
                'cross', 'square', 'label', 'point']

            types.forEach(function(x) {
                if (li.hasClass(x)) li.removeClass(x)
            })
            li.set('title', '')

            if (li.retrieve('tuple') in board.overlays) {
                board.overlays[li.retrieve('tuple')].unpack(function(type, ghost, label) {
                    if (type != '') li.addClass(type)
                    if (ghost != 0) li.addClass('ghost_' + ghost)
                    if (label != '') li.set('title', label)
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

function getKomi() {
    var rootNode = getRootTree().nodes[0]
    return 'KM' in rootNode ? rootNode.KM[0].toFloat() : 0
}

function getIsEngineAttached() {
    return $('console').retrieve('controller') ? true : false
}

/**
 * Methods
 */

function loadSettings() {
    if (setting.get('view.fuzzy_stone_placement'))
        $('goban').addClass('fuzzy')
    if (setting.get('view.show_coordinates'))
        $('goban').addClass('coordinates')
    if (setting.get('view.show_variations'))
        $('goban').addClass('variations')
    if (setting.get('view.show_console')) {
        document.body.addClass('console')
        setConsoleWidth(setting.get('view.console_width'))
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
            var black = img.get('src') == '../img/edit/stone_1.png'
            img.set('src', black ? '../img/edit/stone_-1.png' : '../img/edit/stone_1.png')
        }
    })
}

function prepareGameGraph() {
    var container = $('graph')
    var s = new sigma(container)

    s.settings({
        defaultNodeColor: setting.get('graph.node_inactive_color'),
        defaultEdgeColor: setting.get('graph.node_color'),
        defaultNodeBorderColor: 'rgba(255,255,255,.2)',
        edgeColor: 'default',
        borderSize: 2,
        zoomMax: 1,
        zoomMin: 1,
        autoResize: false,
        autoRescale: false
    })

    s.bind('clickNode', function(e) {
        e.data.node.data.unpack(function(tree, index) {
            setCurrentTreePosition(tree, index)
        })
    }).bind('rightClickNode', function(e) {
        e.data.node.data.unpack(function(tree, index) {
            openNodeMenu(tree, index)
        })
    })

    container.store('sigma', s)
}

function prepareSlider() {
    var slider = $$('#sidebar .slider')[0]

    slider.addEvent('mousedown', function() {
        if (event.buttons != 1) return

        this.store('mousedown', true).addClass('active')
        document.fireEvent('mousemove')
    })

    document.addEvent('mouseup', function() {
        slider.store('mousedown', false)
            .removeClass('active')
    }).addEvent('mousemove', function() {
        if (event.buttons != 1 || !slider.retrieve('mousedown'))
            return

        var percentage = event.clientY / slider.getSize().y
        var height = Math.round((gametree.getCurrentHeight(getRootTree()) - 1) * percentage)
        var pos = gametree.navigate(getRootTree(), 0, height)

        if (pos.equals(getCurrentTreePosition())) return
        pos.unpack(setCurrentTreePosition)
        updateSlider()
    })
}

function prepareDragDropFiles() {
    Element.NativeEvents.dragover = 2
    Element.NativeEvents.drop = 2

    document.body.addEvent('dragover', function() {
        return false
    }).addEvent('drop', function(e) {
        e.preventDefault()

        if (e.event.dataTransfer.files.length == 0) return
        loadGame(e.event.dataTransfer.files[0].path)
    })
}

function prepareConsole() {
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
            var commands = $('console').retrieve('commands')
            if (!commands) return

            var i = 0
            var selection = this.selectionStart
            while (selection > tokens[i].length && selection.length != 0 && i < tokens.length - 1)
                selection -= tokens[i++].length + 1

            var result = fuzzyfinder.find(tokens[i], $('console').retrieve('commands'))
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

function attachEngine(exec, args) {
    detachEngine()
    setIsBusy(true)

    setTimeout(function() {
        var controller = new gtp.Controller(exec, args)
        controller.on('quit', function() { $('console').store('controller', null) })
        $('console').store('controller', controller)

        sendGTPCommand(new gtp.Command(null, 'list_commands'), true, function(response) {
            $('console').store('commands', response.content.split('\n'))
        })

        syncEngine()
    }, setting.get('gtp.attach_delay'))
}

function detachEngine() {
    sendGTPCommand(new gtp.Command(null, 'quit'), true)
    clearConsole()
    $('console').store('controller', null)
}

function syncEngine() {
    if (!getIsEngineAttached()) return
    if (!getBoard().isValid()) {
        showMessageBox('GTP engines don’t support invalid board positions.', 'warning')
        return
    }

    setIsBusy(true)

    var board = getBoard()
    sendGTPCommand(new gtp.Command(null, 'clear_board'), true)
    sendGTPCommand(new gtp.Command(null, 'boardsize', [board.size]), true)
    sendGTPCommand(new gtp.Command(null, 'komi', [getKomi()]), true)

    // Replay
    for (var i = 0; i < board.size; i++) {
        for (var j = 0; j < board.size; j++) {
            var v = new Tuple(i, j)
            var sign = board.arrangement[v]
            if (sign == 0) continue
            var color = sign > 0 ? 'B' : 'W'
            var point = gtp.vertex2point(v, board.size)

            sendGTPCommand(new gtp.Command(null, 'play', [color, point]), true)
        }
    }

    setIsBusy(false)
}

function checkForUpdates(callback) {
    if (!callback) callback = function(hasUpdates) {}
    var url = 'https://github.com/yishn/' + app.getName() + '/releases/latest'

    // Check internet connection first
    remote.require('dns').lookup('github.com', function(err) {
        if (err) return

        remote.require('https').get(url, function(response) {
            response.once('data', function(chunk) {
                chunk = '' + chunk
                var hasUpdates = chunk.indexOf('v' + app.getVersion()) == -1

                if (hasUpdates && showMessageBox(
                    'There is a new version of ' + app.getName() + ' available.',
                    'info',
                    ['Download Update', 'Not Now'], 1
                ) == 0) shell.openExternal(url)

                callback(hasUpdates)
            })
        }).on('error', function(e) {})
    })
}

function makeMove(vertex, sendCommand) {
    if (sendCommand == null) sendCommand = true
    if (getBoard().hasVertex(vertex) && getBoard().arrangement[vertex] != 0)
        return

    var position = getCurrentTreePosition()
    var tree = position[0], index = position[1]
    var color = getCurrentPlayer() > 0 ? 'B' : 'W'
    var sign = color == 'B' ? 1 : -1

    if (getBoard().hasVertex(vertex)) {
        // Check for ko
        if (setting.get('game.show_ko_warning')) {
            var ko = gametree.navigate(tree, index, -1).unpack(function(prevTree, prevIndex) {
                if (!prevTree) return

                var hash = getBoard().makeMove(sign, vertex).getHash()
                return prevTree.nodes[prevIndex].board.getHash() == hash
            })

            if (ko && showMessageBox(
                ['You are about to play a move which repeats a previous board position.',
                'This is invalid in some rulesets.'].join('\n'),
                'info',
                ['Play Anyway', 'Don’t Play'], 1
            ) != 0) return
        }

        // Check for suicide
        var capture = getBoard().getNeighborhood(vertex).some(function(v) {
            return getBoard().arrangement[v] == -sign && getBoard().getLiberties(v).length == 1
        })

        var suicide = setting.get('game.show_suicide_warning')
        suicide = suicide && !capture && getBoard().getNeighborhood(vertex).filter(function(v) {
            return getBoard().arrangement[v] == sign
        }).every(function(v) {
            return getBoard().getLiberties(v).length == 1
        }) && getBoard().getNeighborhood(vertex).filter(function(v) {
            return getBoard().arrangement[v] == 0
        }).length == 0

        if (suicide) {
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

        // Play sounds
        if (capture || suicide) setTimeout(function() {
            sound.playCapture()
        }, 300 + Math.floor(Math.random() * 200))

        sound.playPachi()
    } else sound.playPass()

    if (tree.current == null && tree.nodes.length - 1 == index) {
        // Append move
        var node = {}
        node[color] = [sgf.vertex2point(vertex)]
        tree.nodes.push(node)

        setCurrentTreePosition(tree, tree.nodes.length - 1)
    } else {
        var create = true

        if (index != tree.nodes.length - 1) {
            // Search for next move
            var nextNode = tree.nodes[index + 1]
            var moveExists = color in nextNode
                && sgf.point2vertex(nextNode[color][0]).equals(vertex)

            if (moveExists) {
                setCurrentTreePosition(tree, index + 1)
                create = false
            }
        } else {
            // Search for variation
            var variations = tree.subtrees.filter(function(subtree) {
                return subtree.nodes.length > 0
                    && color in subtree.nodes[0]
                    && sgf.point2vertex(subtree.nodes[0][color][0]).equals(vertex)
            })

            if (variations.length > 0) {
                setCurrentTreePosition(sgf.addBoard(variations[0]), 0)
                create = false
            }
        }

        if (create) {
            // Create variation
            var splitted = gametree.splitTree(tree, index)
            var node = {}; node[color] = [sgf.vertex2point(vertex)]
            var newtree = gametree.new()
            newtree.nodes = [node]
            newtree.parent = splitted

            splitted.subtrees.push(newtree)
            splitted.current = splitted.subtrees.length - 1

            sgf.addBoard(newtree, newtree.nodes.length - 1)
            setCurrentTreePosition(newtree, 0)
        }
    }

    if (sendCommand) {
        sendGTPCommand(
            new gtp.Command(null, 'play', [color, gtp.vertex2point(vertex, getBoard().size)]),
            true
        )
        setTimeout(generateMove, setting.get('gtp.move_delay'))
    }
}

function useTool(vertex) {
    getCurrentTreePosition().unpack(function(tree, index) {
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
            if ('B' in node || 'W' in node) {
                // New variation needed
                var splitted = gametree.splitTree(tree, index)

                if (splitted != tree || splitted.subtrees.length != 0) {
                    tree = gametree.new()
                    tree.parent = splitted
                    splitted.subtrees.push(tree)
                }

                node = { PL: getCurrentPlayer() > 0 ? ['B'] : ['W'] }
                index = tree.nodes.length
                tree.nodes.push(node)
            }

            var sign = tool.indexOf('_1') != -1 ? 1 : -1
            if (event.button == 2) sign = -sign

            var oldSign = board.arrangement[vertex]
            var ids = ['AW', 'AE', 'AB']
            var id = ids[sign + 1]
            var point = sgf.vertex2point(vertex)

            for (var i = -1; i <= 1; i++) {
                if (!(ids[i + 1] in node)) continue

                k = node[ids[i + 1]].indexOf(point)
                if (k >= 0) {
                    node[ids[i + 1]].splice(k, 1)

                    if (node[ids[i + 1]].length == 0) {
                        delete node[ids[i + 1]]
                    }
                }
            }

            if (oldSign != sign) {
                if (id in node) node[id].push(point)
                else node[id] = [point]
            } else if (oldSign == sign) {
                if ('AE' in node) node.AE.push(point)
                else node.AE = [point]
            }
        } else {
            if (event.button != 0) return

            if (tool != 'label' && tool != 'number') {
                if (vertex in board.overlays && board.overlays[vertex][0] == tool) {
                    delete board.overlays[vertex]
                } else {
                    board.overlays[vertex] = new Tuple(tool, 0, '')
                }
            } else if (tool == 'number') {
                if (vertex in board.overlays && board.overlays[vertex][0] == 'label') {
                    delete board.overlays[vertex]
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

                    board.overlays[vertex] = new Tuple(tool, 0, number.toString())
                }
            } else if (tool == 'label') {
                if (vertex in board.overlays && board.overlays[vertex][0] == 'label') {
                    delete board.overlays[vertex]
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

                    board.overlays[vertex] = new Tuple(tool, 0, alpha[k])
                }
            }

            for (var id in dictionary) delete node[dictionary[id]]

            // Update SGF

            $$('#goban .row li').forEach(function(li) {
                var v = li.retrieve('tuple')
                if (!(v in board.overlays)) return

                var id = dictionary[board.overlays[v][0]]
                var pt = sgf.vertex2point(v)
                if (id == 'LB') pt += ':' + board.overlays[v][2]

                if (id in node) node[id].push(pt)
                else node[id] = [pt]
            })
        }

        setCurrentTreePosition(tree, index)
    })
}

function findMove(vertex, step) {
    showIndicator(vertex)
    setIsBusy(true)

    setTimeout(function() {
        if (isNaN(step)) step = 1
        step = step >= 0 ? 1 : -1

        var root = getRootTree()
        var pos = getCurrentTreePosition()
        var point = sgf.vertex2point(vertex)
        var iterator = gametree.makeNodeIterator.apply(null, pos)

        while (true) {
            pos = step >= 0 ? iterator.next() : iterator.prev()

            if (!pos) {
                if (step == 1) {
                    pos = new Tuple(root, 0)
                } else {
                    var sections = gametree.getSections(root, gametree.getHeight(root) - 1)
                    pos = sections[sections.length - 1]
                }

                iterator = gametree.makeNodeIterator.apply(null, pos)
            }

            if (pos.equals(getCurrentTreePosition()) || pos.unpack(function(tree, index) {
                var node = tree.nodes[index]

                return ['B', 'W'].some(function(c) {
                    return c in node && node[c][0].toLowerCase() == point
                })
            })) break
        }

        setCurrentTreePosition.apply(null, pos)
        setIsBusy(false)
    }, 0)
}

function vertexClicked(vertex) {
    closeGameInfo()

    if (getScoringMode()) {
        if (event.button != 0) return
        if (getBoard().arrangement[vertex] == 0) return

        getBoard().getRelatedChains(vertex).forEach(function(v) {
            $$('#goban .pos_' + v[0] + '-' + v[1]).toggleClass('dead')
        })

        updateAreaMap()
    } else if (getEditMode()) {
        useTool(vertex)
    } else if (getFindMode()) {
        if (event.button != 0) return
        findMove(vertex, $$('#find button')[0].hasClass('selected') ? -1 : 1)
    } else {
        // Playing mode

        if (event.button != 0) return
        makeMove(vertex)
    }
}

function updateSidebar(redraw) {
    if (updateSidebarLambda) clearTimeout(updateSidebarLambda)

    getCurrentTreePosition().unpack(function(tree, index) {
        updateSidebarLambda = setTimeout(function() {
            if (!getCurrentTreePosition().equals(new Tuple(tree, index)))
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
            centerGraphCameraAt(getCurrentGraphNode())
        }, setting.get('graph.delay'))
    })
}

function updateGraph() {
    if (!getShowSidebar() || !getCurrentTreePosition()) return

    setGraphMatrixDict(gametree.tree2matrixdict(getRootTree()))
    centerGraphCameraAt(getCurrentGraphNode())
}

function updateSlider() {
    if (!getShowSidebar()) return

    getCurrentTreePosition().unpack(function(tree, index) {
        var total = gametree.getCurrentHeight(getRootTree()) - 1
        var relative = gametree.getLevel(tree, index)

        setSliderValue(total == 0 ? 0 : relative * 100 / total, relative)
    })
}

function updateCommentText() {
    getCurrentTreePosition().unpack(function(tree, index) {
        var node = tree.nodes[index]
        setCommentText('C' in node ? node.C[0] : '')
    })
}

function updateAreaMap() {
    var board = getBoard().makeMove(0)

    $$('#goban .row li.dead').forEach(function(li) {
        if (li.hasClass('sign_1')) board.captures['-1']++
        else if (li.hasClass('sign_-1')) board.captures['1']++

        board.arrangement[li.retrieve('tuple')] = 0
    })

    var map = board.getAreaMap()

    $$('#goban .row li').forEach(function(li) {
        li.removeClass('area_-1').removeClass('area_0').removeClass('area_1')
            .addClass('area_' + map[li.retrieve('tuple')])
    })

    $('goban').store('areamap', map)
        .store('finalboard', board)
}

function commitCommentText() {
    getCurrentTreePosition().unpack(function(tree, index) {
        var comment = $$('#properties textarea').get('value')[0]
        if (comment != '') tree.nodes[index].C = [comment]
        else delete tree.nodes[index].C
    })

    updateCommentText()
    updateSidebar(true)
}

function commitGameInfo() {
    var rootNode = getRootTree().nodes[0]
    var info = $('info')

    rootNode.BR = [info.getElement('input[name="rank_1"]').get('value').trim()]
    rootNode.WR = [info.getElement('input[name="rank_-1"]').get('value').trim()]
    rootNode.PB = [info.getElement('input[name="name_1"]').get('value').trim()]
    rootNode.PW = [info.getElement('input[name="name_-1"]').get('value').trim()]

    setPlayerName(1, rootNode.PB[0])
    setPlayerName(-1, rootNode.PW[0])

    var result = info.getElement('input[name="result"]').get('value').trim()
    rootNode.RE = [result]
    if (result == '') delete rootNode.RE

    var komi = info.getElement('input[name="komi"]').get('value').toFloat()
    rootNode.KM = [String.from(komi)]
    if (isNaN(komi)) rootNode.KM = ['0']

    var handicap = info.getElement('select[name="handicap"]').selectedIndex
    if (handicap == 0) delete rootNode.HA
    else rootNode.HA = [String.from(handicap + 1)]

    var size = info.getElement('input[name="size"]').get('value').toInt()
    rootNode.SZ = [String.from(Math.max(Math.min(size, 26), 9))]
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
}

function commitScore() {
    var rootNode = getRootTree().nodes[0]
    var results = $$('#score tbody td:last-child').get('text')
    var diff = results[0].toFloat() - results[1].toFloat()
    var result = diff > 0 ? 'B+' : (diff < 0 ? 'W+' : 'Draw')
    if (diff != 0) result = result + Math.abs(diff)

    rootNode.RE = [result]
    showGameInfo()
}

function sendGTPCommand(command, ignoreBlocked, callback) {
    if (!getIsEngineAttached()) {
        $$('#console form:last-child input')[0].value = ''
        return
    }

    var controller = $('console').retrieve('controller')
    var container = $$('#console .inner')[0]
    var oldform = container.getElement('form:last-child')
    var form = oldform.clone().cloneEvents(oldform)
    var pre = new Element('pre', { text: ' ' })

    form.getElement('input').set('value', '').cloneEvents(oldform.getElement('input'))
    oldform.addClass('waiting').getElement('input').value = command.toString()
    container.grab(pre).grab(form)

    // Cleanup
    var forms = $$('#console .inner form')
    if (forms.length > setting.get('console.max_history_count')) {
        forms[0].getNext('pre').dispose()
        forms[0].dispose()
    }

    var listener = function(response, c) {
        if (!oldform.hasClass('waiting') || c.toString() != command.toString()) return

        pre.set('html', response.toHtml())
        helper.wireLinks(pre)
        oldform.removeClass('waiting')
        if (callback) callback(response)

        // Update scrollbars
        var view = $$('#console .gm-scroll-view')[0]
        var scrollbar = $('console').retrieve('scrollbar')

        view.scrollTo(0, view.getScrollSize().y)
        $$('#console form:last-child input')[0].focus()
        if (scrollbar) scrollbar.update()
    }

    if (!ignoreBlocked && setting.get('console.blocked_commands').indexOf(command.name) != -1) {
        listener(new gtp.Response(null, 'blocked command', true, true), command)
    } else {
        controller.on('response', listener)
        controller.sendCommand(command)
    }
}

function generateMove() {
    if (!getIsEngineAttached() || getIsBusy()) return
    setIsBusy(true)

    sendGTPCommand(new gtp.Command(null, 'genmove', [getCurrentPlayer() > 0 ? 'B' : 'W']), true, function(r) {
        setIsBusy(false)
        if (r.content.toLowerCase() == 'resign') return

        var v = new Tuple(-1, -1)
        if (r.content.toLowerCase() != 'pass')
            v = gtp.point2vertex(r.content, getBoard().size)

        makeMove(new Tuple(v[0], v[1]), false)
    })
}

function centerGraphCameraAt(node) {
    if (!getShowSidebar() || !node) return

    var s = $('graph').retrieve('sigma')
    s.renderers[0].resize().render()

    var matrixdict = getGraphMatrixDict()
    var y = matrixdict[1][node.id][1]

    gametree.getWidth(y, matrixdict[0]).unpack(function(width, padding) {
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
    })
}

function askForSave() {
    if (!getRootTree()) return true
    var hash = gametree.getHash(getRootTree())

    if (hash != document.body.retrieve('treehash')) {
        var answer = showMessageBox(
            'Your changes will be lost if you close this game without saving.',
            'warning',
            ['Save', 'Don’t Save', 'Cancel'], 2
        )

        if (answer == 0) saveGame()
        else if (answer == 2) return false
    }

    return true
}

/**
 * Menu
 */

function newGame(playSound) {
    if (getIsBusy() || !askForSave()) return

    var buffer = ';GM[1]AP[' + app.getName() + ':' + app.getVersion() + ']'
    buffer += 'CA[UTF-8]PB[Black]PW[White]KM[' + setting.get('game.default_komi')
        + ']SZ[' + setting.get('game.default_board_size') + ']'

    var tree = sgf.parse(sgf.tokenize(buffer))
    setRootTree(tree)

    closeDrawers()
    if (arguments.length >= 1 && playSound) {
        sound.playNewGame()
        showGameInfo()
    }
}

function loadGame(filename) {
    if (getIsBusy() || !askForSave()) return
    setIsBusy(true)

    if (!filename) {
        var result = dialog.showOpenDialog(remote.getCurrentWindow(), {
            filters: [sgf.meta, { name: 'All Files', extensions: ['*'] }]
        })

        if (result) filename = result[0]
    }

    if (filename) {
        var win = remote.getCurrentWindow()

        try {
            var tree = sgf.parseFile(filename, function(progress) {
                setProgressIndicator(progress, win)
            }).subtrees[0]

            setRootTree(tree)
        } catch(e) {
            showMessageBox('This file is unreadable.', 'warning')
        }

        setProgressIndicator(0, win)
        closeDrawers()
    }

    if (setting.get('game.show_end_after_loading')) goToEnd()
    setIsBusy(false)
}

function saveGame() {
    if (getIsBusy()) return
    setIsBusy(true)

    var result = dialog.showSaveDialog(remote.getCurrentWindow(), {
        filters: [sgf.meta, { name: 'All Files', extensions: ['*'] }]
    })

    if (result) {
        var tree = getRootTree()
        var text = sgf.tree2string(tree)

        fs.writeFile(result, '(' + text + ')')
        document.body.store('treehash', helper.md5(text))
    }

    setIsBusy(false)
}

function clearAllOverlays() {
    var overlayIds = ['MA', 'TR', 'CR', 'SQ', 'LB', 'AR', 'LN']

    getCurrentTreePosition().unpack(function(tree, index) {
        overlayIds.forEach(function(id) {
            delete tree.nodes[index][id]
        })

        setCurrentTreePosition(tree, index)
    })
}

function goBack() {
    getCurrentTreePosition().unpack(function(tree, position) {
        gametree.navigate(tree, position, -1).unpack(function(prevTree, prevIndex) {
            setCurrentTreePosition(prevTree, prevIndex)
        })
    })
}

function goForward() {
    getCurrentTreePosition().unpack(function(tree, position) {
        gametree.navigate(tree, position, 1).unpack(function(nextTree, nextIndex) {
            setCurrentTreePosition(nextTree, nextIndex)
        })
    })
}

function goToNextFork() {
    getCurrentTreePosition().unpack(function(tree, index) {
        if (index != tree.nodes.length - 1)
            setCurrentTreePosition(tree, tree.nodes.length - 1)
        else if (tree.current != null) {
            var subtree = tree.subtrees[tree.current]
            setCurrentTreePosition(subtree, subtree.nodes.length - 1)
        }
    })
}

function goToPreviousFork() {
    getCurrentTreePosition().unpack(function(tree, index) {
        if (tree.parent == null || tree.parent.nodes.length == 0)
            setCurrentTreePosition(tree, 0)
        else setCurrentTreePosition(tree.parent, tree.parent.nodes.length - 1)
    })
}

function goToBeginning() {
    var tree = getRootTree()
    if (tree.nodes.length == 0) return
    setCurrentTreePosition(tree, 0)
}

function goToEnd() {
    var tree = getCurrentTreePosition()[0]
    gametree.navigate(tree, 0, gametree.getCurrentHeight(tree) - 1).unpack(setCurrentTreePosition)
}

function goToNextVariation() {
    getCurrentTreePosition().unpack(function(tree, index) {
        if (!tree.parent) return

        var mod = tree.parent.subtrees.length
        var i = (tree.parent.current + 1) % mod
        setCurrentTreePosition(tree.parent.subtrees[i], 0)
    })
}

function goToPreviousVariation() {
    getCurrentTreePosition().unpack(function(tree, index) {
        if (!tree.parent) return

        var mod = tree.parent.subtrees.length
        var i = (tree.parent.current + mod - 1) % mod
        setCurrentTreePosition(tree.parent.subtrees[i], 0)
    })
}

function removeNode(tree, index) {
    if (!tree.parent && index == 0) {
        showMessageBox('The root node cannot be removed.', 'warning')
        return
    }

    if (showMessageBox(
        'Do you really want to remove this node permanently?',
        'warning',
        ['Remove Node', 'Cancel'], 1
    ) == 1) return

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
    setCurrentTreePosition(prev[0], prev[1])
}

/**
 * Main events
 */

document.addEvent('keydown', function(e) {
    if (e.code == 27) {
        // Escape key
        closeDrawers()
    }
}).addEvent('domready', function() {
    loadSettings()
    prepareDragDropFiles()
    prepareEditTools()
    prepareGameGraph()
    prepareSlider()
    prepareConsole()

    $$('#goban, #graph canvas:last-child, #graph .slider').addEvent('mousewheel', function(e) {
        if (e.wheel < 0) goForward()
        else if (e.wheel > 0) goBack()
    })
})

window.addEvent('load', function() {
    newGame()

    setTimeout(function() {
        if (process.argv.length >= 2) loadGame(process.argv[1])
    }, setting.get('app.startup_loadgame_delay'))

    if (!setting.get('app.startup_check_updates')) return

    setTimeout(function() {
        checkForUpdates()
    }, setting.get('app.startup_check_updates_delay'))
}).addEvent('resize', function() {
    resizeBoard()
}).addEvent('beforeunload', function(e) {
    if (!askForSave()) e.event.returnValue = 'false'
    var win = remote.getCurrentWindow()
    if (win.isMaximized() || win.isMinimized() || win.isFullScreen()) return

    var size = document.body.getSize()
    setting.set('window.width', size.x).set('window.height', size.y)
})
