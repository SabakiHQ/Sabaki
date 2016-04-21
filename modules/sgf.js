(function(root) {

var gametree = root.gametree
var helper = root.helper
var fs = null

if (typeof require != 'undefined') {
    gametree = require('../modules/gametree')
    helper = require('../modules/helper')
    fs = require('fs')
}

var context = typeof module != 'undefined' ? module.exports : (window.sgf = {})

var alpha = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

context.meta = {
    name: 'Smart Game Format',
    extensions: ['sgf']
}

context.tokenize = function(input) {
    var tokens = []
    var rules = {
        ignore: /^\s+/,
        parenthesis: /^(\(|\))/,
        semicolon: /^;/,
        prop_ident: /^[A-Za-z]+/,
        c_value_type: /^\[([^\\\]]|\\.)*\]/
    }

    while (input.length > 0) {
        var token = null
        var length = 1

        for (var type in rules) {
            var matches = rules[type].exec(input)
            if (!matches) continue

            var value = matches[0]
            length = value.length
            token = [type, value]

            break
        }

        if (token && token[0] != 'ignore') tokens.push(token)
        input = input.substr(length)
    }

    return tokens
}

context.parse = function(tokens, callback, start, depth) {
    if (!callback) callback = function(progress) {}
    if (!start) start = [0]
    if (isNaN(depth)) depth = 0

    var i = start[0]
    var node, property, tree = gametree.new()
    tree.collapsed = tokens.length >= setting.get('graph.collapse_tokens_count')
        && depth >= setting.get('graph.collapse_min_depth')

    while (i < tokens.length) {
        if (tokens[i][0] == 'parenthesis' && tokens[i][1] == '(') break
        if (tokens[i][0] == 'parenthesis' && tokens[i][1] == ')') return tree

        var type = tokens[i][0], value = tokens[i][1]

        if (type == 'semicolon') {
            node = {}
            tree.nodes.push(node)
        } else if (type == 'prop_ident') {
            node[value] = []
            property = node[value]
        } else if (type == 'c_value_type') {
            property.push(context.unescapeString(value.substr(1, value.length - 2)))
        }

        start[0] = ++i
    }

    while (i < tokens.length) {
        if (tokens[i][0] == 'parenthesis' && tokens[i][1] == '(') {
            start[0] = i + 1

            t = context.parse(tokens, callback, start, depth + Math.min(tree.subtrees.length, 1))
            t.parent = tree
            tree.subtrees.push(t)
            tree.current = 0

            i = start[0]
        } else if (tokens[i][0] == 'parenthesis' && tokens[i][1] == ')') {
            start[0] = i
            callback(i / tokens.length)
            break
        }

        i++
    }

    return tree
}

context.parseFile = function(filename, callback) {
    if (!fs) return null

    var input = fs.readFileSync(filename, { encoding: 'utf8' })
    var tokens = context.tokenize(input)

    return context.parse(tokens, callback)
}

context.point2vertex = function(point) {
    if (point.length != 2) return [-1, -1]
    return [alpha.indexOf(point[0]), alpha.indexOf(point[1])]
}

context.vertex2point = function(vertex) {
    var x = vertex[0], y = vertex[1]
    if (x < 0 || y < 0) return ''
    return alpha[x] + alpha[y]
}

context.compressed2list = function(compressed) {
    var colon = compressed.indexOf(':')
    if (colon < 0) return [context.point2vertex(compressed)]

    var v1 = context.point2vertex(compressed.slice(0, colon))
    var v2 = context.point2vertex(compressed.slice(colon + 1))
    var list = []

    for (var i = Math.min(v1[0], v2[0]); i <= Math.max(v1[0], v2[0]); i++) {
        for (var j = Math.min(v1[1], v2[1]); j <= Math.max(v1[1], v2[1]); j++) {
            list.push([i, j])
        }
    }

    return list
}

context.addBoard = function(tree, index, baseboard) {
    if (isNaN(index)) index = 0
    if (index >= tree.nodes.length) return tree

    var node = tree.nodes[index]
    var vertex = null
    var board = null

    if (!baseboard) {
        var prev = gametree.navigate(tree, index, -1)

        if (!prev) {
            var size = 'SZ' in node ? node.SZ[0].toInt() : 19
            baseboard = new Board(size)
        } else {
            var prevNode = prev[0].nodes[prev[1]]

            if (!prevNode.board) context.addBoard(prev[0], prev[1])
            baseboard = prevNode.board
        }
    }

    if ('B' in node) {
        vertex = context.point2vertex(node.B[0])
        board = baseboard.makeMove(1, vertex)
    } else if ('W' in node) {
        vertex = context.point2vertex(node.W[0])
        board = baseboard.makeMove(-1, vertex)
    }

    if (!board) board = baseboard.clone()

    var ids = ['AW', 'AE', 'AB']

    for (var i = 0; i < ids.length; i++) {
        if (!(ids[i] in node)) continue

        node[ids[i]].forEach(function(value) {
            context.compressed2list(value).forEach(function(vertex) {
                board.arrangement[vertex] = i - 1
            })
        })
    }

    if (vertex != null) {
        board.markups[vertex] = ['point', 0, '']
    }

    var ids = ['CR', 'MA', 'SQ', 'TR']
    var classes = ['circle', 'cross', 'square', 'triangle']

    for (var i = 0; i < ids.length; i++) {
        if (!(ids[i] in node)) continue

        node[ids[i]].forEach(function(value) {
            context.compressed2list(value).forEach(function(vertex) {
                board.markups[vertex] = [classes[i], 0, '']
            })
        })
    }

    if ('LB' in node) {
        node.LB.forEach(function(composed) {
            var sep = composed.indexOf(':')
            var point = composed.slice(0, sep)
            var label = composed.slice(sep + 1).replace(/\s+/, ' ')
            board.markups[context.point2vertex(point)] = ['label', 0, label]
        })
    }

    if ('LN' in node) {
        node.LN.forEach(function(composed) {
            var sep = composed.indexOf(':')
            var p1 = composed.slice(0, sep)
            var p2 = composed.slice(sep + 1)
            board.lines.push([context.point2vertex(p1), context.point2vertex(p2), false])
        })
    }

    if ('AR' in node) {
        node.AR.forEach(function(composed) {
            var sep = composed.indexOf(':')
            var p1 = composed.slice(0, sep)
            var p2 = composed.slice(sep + 1)
            board.lines.push([context.point2vertex(p1), context.point2vertex(p2), true])
        })
    }

    node.board = board

    // Add variation overlays

    var addOverlay = function(node) {
        var v, sign

        if ('B' in node) {
            v = sgf.point2vertex(node.B[0])
            sign = 1
        } else if ('W' in node) {
            v = sgf.point2vertex(node.W[0])
            sign = -1
        } else {
            return
        }

        if (v in board.markups) board.markups[v][1] = sign
        else board.markups[v] = ['', sign, '']
    }

    if (index == tree.nodes.length - 1 && tree.subtrees.length > 0) {
        tree.subtrees.forEach(function(subtree) {
            if (subtree.nodes.length == 0) return
            addOverlay(subtree.nodes[0])
        })
    } else if (index < tree.nodes.length - 1) {
        addOverlay(tree.nodes[index + 1])
    }

    return tree
}

context.fromTree = function(tree) {
    var output = ''

    tree.nodes.forEach(function(node) {
        output += ';'

        for (var id in node) {
            if (id.toUpperCase() != id) continue
            output += id

            node[id].forEach(function(value) {
                output += '[' + context.escapeString(value.toString()) + ']'
            })

            if (node[id].length == 0) output += '[]'
        }

        output += '\n'
    })

    for (var i = 0; i < tree.subtrees.length; i++) {
        output += '(' + context.fromTree(tree.subtrees[i]) + ')'
    }

    return output
}

context.escapeString = function(input) {
    return input.replace(/\\/g, '\\\\').replace(/\]/g, '\\]')
}

context.unescapeString = function(input) {
    var result = ''
    var inBackslash = false

    input = input.replace(/\\(\r\n|\n\r|\n|\r)/g, '')

    for (var i = 0; i < input.length; i++) {
        if (!inBackslash) {
            if (input[i] != '\\')
                result += input[i]
            else if (input[i] == '\\')
                inBackslash = true
        } else {
            result += input[i]
        }
    }

    return result
}

}).call(null, typeof module != 'undefined' ? module : window)
