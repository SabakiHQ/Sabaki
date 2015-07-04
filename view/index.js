var remote = require('remote')
var fs = require('fs')
var shell = require('shell')
var sgf = require('../module/sgf.js')
var process = remote.require('process')
var app = remote.require('app');
var dialog = remote.require('dialog')
var setting = remote.require('./module/setting.js')

var Menu = remote.require('menu')
var Tuple = require('../lib/tuple')
var Board = require('../module/board.js')

/**
 * Getters and setters
 */

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
    setting.set('view.show_sidebar', show)

    // Resize window
    var win  = remote.getCurrentWindow()
    var size = win.getContentSize()

    if (win.isMaximized()) return
    win.setContentSize(size[0] + (show ? 1 : -1) * setting.get('view.sidebar_width').toInt(), size[1])
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

function getRootTree() {
    return getCurrentTreePosition().unpack(function(tree, index) {
        while (tree.parent != null) tree = tree.parent
        return tree
    })
}

function setRootTree(tree) {
    if (tree.nodes.length == 0) return

    tree.parent = null
    setCurrentTreePosition(sgf.addBoards(tree), 0)

    if ('PB' in tree.nodes[0]) setPlayerName(1, tree.nodes[0].PB[0])
    if ('PW' in tree.nodes[0]) setPlayerName(-1, tree.nodes[0].PW[0])
}

function setCurrentTreePosition(tree, index) {
    if (!tree) return

    $('goban').store('position', new Tuple(tree, index))
    if (tree.parent) tree.parent.current = tree.parent.subtrees.indexOf(tree)

    setBoard(sgf.addBoard(tree, index).nodes[index].board)
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
 * Methods
 */

function loadSettings() {
    if (setting.get('view.fuzzy_stone_placement'))
        $('goban').addClass('fuzzy')
    if (setting.get('view.show_coordinates'))
        $('goban').addClass('coordinates')
    if (setting.get('view.show_variations'))
        $('goban').addClass('variations')
    if (setting.get('view.show_sidebar'))
        document.body.addClass('sidebar')
}

function selectTool(tool) {
    $$('#edit .' + tool + '-tool a').fireEvent('click')
}

function makeMove(vertex) {
    if (getBoard().hasVertex(vertex) && getBoard().arrangement[vertex] != 0)
        return

    var position = getCurrentTreePosition()
    var tree = position[0], index = position[1]
    var color = getCurrentPlayer() > 0 ? 'B' : 'W'
    var sign = color == 'B' ? 1 : -1

    // Check for ko
    var ko = sgf.navigate(tree, index, -1).unpack(function(prevTree, prevIndex) {
        if (!prevTree) return

        var hash = getBoard().makeMove(sign, vertex).getHash()
        return prevTree.nodes[prevIndex].board.getHash() == hash
    })

    if (ko) {
        var button = dialog.showMessageBox(remote.getCurrentWindow(), {
            type: 'warning',
            buttons: ['Play anyway', 'Cancel'],
            message: 'You are about to play a move, which repeats a previous board position. '
                + 'This is invalid in some rulesets.'
        })

        if (button == 1) return
    }

    // Play sounds
    if (getBoard().hasVertex(vertex)) {
        // Detect captured stones
        if (getBoard().getNeighborhood(vertex).some(function(v) {
            return getBoard().arrangement[v] == -sign && getBoard().getLiberties(v).length == 1
        })) setTimeout(function() {
            new Audio('../sound/capture' + Math.floor(Math.random() * 5) + '.wav').play()
        }, 400 + Math.floor(Math.random() * 200))

        new Audio('../sound/' + Math.floor(Math.random() * 5) + '.wav').play()
    } else new Audio('../sound/pass.wav').play()

    // Randomize shift and readjust
    var li = $$('#goban .pos_' + vertex[0] + '-' + vertex[1])
    var direction = Math.floor(Math.random() * 9)

    for (var i = 0; i < 9; i++) li.removeClass('shift_' + i)
    li.addClass('shift_' + direction)

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
                && sgf.point2vertex(nextNode[color][0]).equals(vertex)

            if (moveExists) {
                setCurrentTreePosition(tree, index + 1)
                return
            }
        } else {
            // Search for variation

            var variations = tree.subtrees.filter(function(subtree) {
                return subtree.nodes.length > 0
                    && color in subtree.nodes[0]
                    && sgf.point2vertex(subtree.nodes[0][color][0]).equals(vertex)
            })

            if (variations.length > 0) {
                setCurrentTreePosition(sgf.addBoards(variations[0]), 0)
                return
            }
        }

        // Create variation

        var splitted = sgf.splitTree(tree, index)
        var node = {}; node[color] = [sgf.vertex2point(vertex)]
        var newtree = { nodes: [node], subtrees: [], parent: splitted, current: null }

        splitted.subtrees.push(newtree)
        splitted.current = splitted.subtrees.length - 1

        sgf.addBoard(newtree, newtree.nodes.length - 1)
        setCurrentTreePosition(newtree, 0)
    }
}

function vertexClicked() {
    closeGameInfo()

    if (!getEditMode() && !getScoringMode()) {
        if (event.button != 0) return
        makeMove(this)

        return
    }

    // Scoring mode activated
    if (getScoringMode()) {
        if (getBoard().arrangement[this] == 0) return

        getBoard().getRelatedChains(this).each(function(vertex) {
            $$('#goban .pos_' + vertex[0] + '-' + vertex[1]).toggleClass('dead')
        })

        updateAreaMap()
        return
    }

    // Edit mode activated
    getCurrentTreePosition().unpack(function(tree, index) {
        var node = tree.nodes[index]
        var tool = getSelectedTool()
        var board = getBoard()
        var dictionary = {
            'cross': 'MA',
            'triangle': 'TR',
            'circle': 'CR',
            'square': 'SQ',
            'number': 'LB',
            'label': 'LB'
        }

        if (tool.contains('stone')) {
            if ('B' in node || 'W' in node) {
                // New variation needed
                var splitted = sgf.splitTree(tree, index)

                if (splitted != tree || splitted.subtrees.length != 0) {
                    tree = { nodes: [], subtrees: [], current: null, parent: splitted }
                    splitted.subtrees.push(tree)
                }

                node = { PL: getCurrentPlayer() > 0 ? ['B'] : ['W'] }
                index = tree.nodes.length
                tree.nodes.push(node)
            }

            var sign = tool.contains('_1') ? 1 : -1
            if (event.button == 2) sign = -sign

            var oldSign = board.arrangement[this]
            var ids = ['AW', 'AE', 'AB']
            var id = ids[sign + 1]
            var point = sgf.vertex2point(this)

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
                if (this in board.overlays && board.overlays[this][0] == tool) {
                    delete board.overlays[this]
                } else {
                    board.overlays[this] = new Tuple(tool, 0, '')
                }
            } else if (tool == 'number') {
                if (this in board.overlays && board.overlays[this][0] == 'label') {
                    delete board.overlays[this]
                } else {
                    var number = 1

                    if ('LB' in node) {
                        node.LB.each(function(value) {
                            var label = value.substr(3).toInt()
                            if (!isNaN(label)) number = Math.max(number, label + 1)
                        })
                    }

                    board.overlays[this] = new Tuple(tool, 0, number.toString())
                }
            } else if (tool == 'label') {
                if (this in board.overlays && board.overlays[this][0] == 'label') {
                    delete board.overlays[this]
                } else {
                    var alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
                    var k = 0

                    if ('LB' in node) {
                        node.LB.each(function(value) {
                            if (value.length != 4 || !alpha.contains(value[3])) return

                            var label = value[3]
                            k = Math.max(k, (alpha.indexOf(label) + 1) % alpha.length)
                        })
                    }

                    board.overlays[this] = new Tuple(tool, 0, alpha[k])
                }
            }

            Object.each(dictionary, function(id) { delete node[id] })

            $$('#goban .row li').each(function(li) {
                var vertex = li.retrieve('tuple')
                if (!(vertex in board.overlays)) return

                var id = dictionary[board.overlays[vertex][0]]
                var pt = sgf.vertex2point(vertex)
                if (id == 'LB') pt += ':' + board.overlays[vertex][2]

                if (id in node) node[id].push(pt)
                else node[id] = [pt]
            })
        }

        setCurrentTreePosition(tree, index)
    }.bind(this))
}

function buildBoard() {
    var board = getBoard()
    var rows = []
    var hoshi = board.getHandicapPlacement(9)

    for (var y = 0; y < board.size; y++) {
        var ol = new Element('ol.row')

        for (var x = 0; x < board.size; x++) {
            var vertex = new Tuple(x, y)
            var li = new Element('li.pos_' + x + '-' + y)
                .store('tuple', vertex)
                .addClass('shift_' + Math.floor(Math.random() * 9))
            var img = new Element('img', { src: '../img/goban/stone_0.png' })

            if (hoshi.some(function(v) { return v.equals(vertex) }))
                li.addClass('hoshi')

            ol.adopt(li.adopt(img).addEvent('mouseup', vertexClicked.bind(vertex)))
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
}

function resizeBoard() {
    var board = getBoard()
    if (!board) return

    var width = $('goban').getStyle('width').toInt()
    var height = $('goban').getStyle('height').toInt()
    var min = Math.min(width, height)
    var hasCoordinates = getShowCoordinates()

    var fieldsize = Math.floor(min / board.size)
    min = fieldsize * board.size

    if (hasCoordinates) {
        fieldsize = Math.floor(min / (board.size + 2))
        min = fieldsize * (board.size + 2)
    }

    $$('#goban > div').setStyle('width', min).setStyle('height', min)

    $$('#goban .row, #goban .coordx').setStyle('height', fieldsize).setStyle('line-height', fieldsize)
    $$('#goban .row, #goban .coordx').setStyle('margin-left', hasCoordinates ? fieldsize : 0)

    $$('#goban .coordy').setStyle('width', fieldsize).setStyle('top', fieldsize).setStyle('line-height', fieldsize)
    $$('#goban .coordy:last-child').setStyle('left', fieldsize * (board.size + 1))

    $$('#goban li').setStyle('width', fieldsize).setStyle('height', fieldsize)
}

function showGameInfo() {
    closeScore()

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
    if ('HA' in rootNode) handicap.selectedIndex = rootNode.HA[0].toInt() - 1
    else handicap.selectedIndex = 0

    var disabled = tree.nodes.length > 1 || tree.subtrees.length > 0
    handicap.disabled = disabled
    size.disabled = disabled
}

function closeGameInfo() {
    $('info').removeClass('show')
}

function updateGameInfo() {
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
    if (isNaN(size)) rootNode.SZ = ['19']

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
        if (sign < 0) tds[3].set('text', ('KM' in rootNode ? rootNode.KM[0] : '0').toFloat())
        tds[4].set('text', 0)

        setScoringMethod(setting.get('scoring.method'))
    }

    closeGameInfo()
    $('score').addClass('show')
}

function closeScore() {
    $('score').removeClass('show')
    setScoringMode(false)
}

function updateScore() {
    var rootNode = getRootTree().nodes[0]
    var results = $$('#score tbody td:last-child').get('text')
    var diff = results[1].toFloat() - results[0].toFloat()
    var color = diff > 0 ? 'W+' : (diff < 0 ? 'B+' : '')
    var result = color + Math.abs(diff)

    rootNode.RE = [result]
}

function updateAreaMap() {
    var board = getBoard().makeMove(0)

    $$('#goban .row li.dead').each(function(li) {
        if (li.hasClass('sign_1')) board.captures['-1']++
        else if (li.hasClass('sign_-1')) board.captures['1']++

        board.arrangement[li.retrieve('tuple')] = 0
    })

    var map = board.getAreaMap()

    $$('#goban .row li').each(function(li) {
        li.removeClass('area_-1').removeClass('area_0').removeClass('area_1')
            .addClass('area_' + map[li.retrieve('tuple')])
        if (!li.getElement('div.area'))
            li.grab(new Element('div', { class: 'area' }))
    })

    $('goban').store('areamap', map)
        .store('finalboard', board)
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

/**
 * Menu
 */

function newGame(playSound) {
    var buffer = ';GM[1]AP[' + app.getName() + ':' + app.getVersion() + ']'
    buffer += 'GM[1]CA[UTF-8]PB[Black]PW[White]KM[6.5]SZ[19]'

    var tree = sgf.parse(sgf.tokenize(buffer))
    setRootTree(tree)

    if (arguments.length >= 1 && playSound) {
        // Called from menu
        new Audio('../sound/newgame.wav').play()
        showGameInfo()
    }

    closeScore()
}

function loadGame(filename) {
    setIsLoading(true)

    if (arguments.length == 0) {
        var result = dialog.showOpenDialog(remote.getCurrentWindow(), {
            filters: [{ name: 'SGF Files', extensions: ['sgf'] },
                      { name: 'All Files', extensions: ['*'] }]
        })

        if (result) filename = result[0]
    }

    if (filename) {
        var tree = sgf.parseFile(filename)
        if (tree.subtrees.length == 0) return
        setRootTree(tree.subtrees[0])
    }

    setIsLoading(false)
    closeGameInfo()
    closeScore()
}

function saveGame() {
    setIsLoading(true)

    var result = dialog.showSaveDialog(remote.getCurrentWindow(), {
        filters: [{ name: 'SGF Files', extensions: ['sgf'] },
                  { name: 'All Files', extensions: ['*'] }]
    })

    if (result) {
        var tree = getRootTree()
        var text = '(' + sgf.tree2string(tree) + ')'

        fs.writeFile(result, text)
    }

    setIsLoading(false)
}

function goBack() {
    if (getScoringMode()) return

    getCurrentTreePosition().unpack(function(tree, position) {
        sgf.navigate(tree, position, -1).unpack(function(prevTree, prevIndex) {
            setCurrentTreePosition(prevTree, prevIndex)
        })
    })
}

function goForward() {
    if (getScoringMode()) return

    getCurrentTreePosition().unpack(function(tree, position) {
        sgf.navigate(tree, position, 1).unpack(function(nextTree, nextIndex) {
            setCurrentTreePosition(nextTree, nextIndex)
        })
    })
}

function goToNextFork() {
    if (getScoringMode()) return

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
    if (getScoringMode()) return

    getCurrentTreePosition().unpack(function(tree, index) {
        if (tree.parent == null || tree.parent.nodes.length == 0)
            setCurrentTreePosition(tree, 0)
        else setCurrentTreePosition(tree.parent, tree.parent.nodes.length - 1)
    })
}

function goToBeginning() {
    if (getScoringMode()) return

    var tree = getRootTree()
    if (tree.nodes.length == 0) return
    setCurrentTreePosition(tree, 0)
}

function goToEnd() {
    if (getScoringMode()) return

    getCurrentTreePosition().unpack(function(tree, position) {
        var t = tree
        while (t.current != null) {
            t = t.subtrees[t.current]
        }
        setCurrentTreePosition(t, t.nodes.length - 1)
    })
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
                    label: 'Show &Tree',
                    type: 'checkbox',
                    accelerator: 'CmdOrCtrl+T',
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

/**
 * Main events
 */

document.addEvent('keydown', function(e) {
    if (e.code == 123) {
        // F12
        remote.getCurrentWindow().toggleDevTools()
    } else if (e.code == 116) {
        // F5
        location.reload()
    } else if (e.code == 27) {
        // Escape key
        closeGameInfo()
        closeScore()
        setEditMode(false)
    }
}).addEvent('mousewheel', function(e) {
    if (e.wheel < 0) goForward()
    else if (e.wheel > 0) goBack()
}).addEvent('domready', function() {
    loadSettings()
    buildMenu()
    prepareEditTools()

    if (process.argv.length >= 2) loadGame(process.argv[1])
    else newGame()

    var s = new sigma('sidebar')
    s.settings({
        defaultNodeColor: '#eee',
        borderSize: 2,
        defaultNodeBorderColor: 'rgba(255,255,255,.2)',
        zoomMax: 1,
        zoomMin: 1,
        autoResize: false,
        autoRescale: false
    })

    s.graph.addNode({
        id: 'n0',
        x: 0,
        y: 0,
        size: 4
    }).addNode({
        id: 'n1',
        x: 0,
        y: 30,
        size: 4
    }).addEdge({
        id: 'e0',
        source: 'n0',
        target: 'n1'
    })

    s.refresh()
    s.render()
})

window.addEvent('resize', function() {
    resizeBoard()
}).addEvent('beforeunload', function() {
    if (remote.getCurrentWindow().isMaximized() || remote.getCurrentWindow().isMinimized()) return

    var size = document.body.getSize()
    setting.set('window.width', size.x).set('window.height', size.y)
})
