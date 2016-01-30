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

var alpha = 'abcdefghijklmnopqrstuvwxyz'

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
        c_value_type: /^\[(\]|[^]*?[^\\]\]|[^]*\\\\\])/
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
        if (helper.equals(['parenthesis', '('], tokens[i])) break
        if (helper.equals(['parenthesis', ')'], tokens[i])) return tree

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
        if (helper.equals(['parenthesis', '('], tokens[i])) {
            start[0] = i + 1

            t = context.parse(tokens, callback, start, depth + Math.min(tree.subtrees.length, 1))
            t.parent = tree
            tree.subtrees.push(t)
            tree.current = 0

            i = start[0]
        } else if (helper.equals(['parenthesis', ')'], tokens[i])) {
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

    point = point.toLowerCase()
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

    for (var i = v1[0]; i <= v2[0]; i++) {
        for (var j = v1[1]; j <= v2[1]; j++) {
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

        if (!prev[0]) {
            var size = 'SZ' in node ? node.SZ[0].toInt() : 19
            baseboard = new Board(size)
        } else {
            var prevNode = prev[0].nodes[prev[1]]

            if (!prevNode.board) context.addBoard(prev[0], prev[1])
            baseboard = prevNode.board
        }
    }

    if (!baseboard) return tree
    if ('B' in node) {
        vertex = context.point2vertex(node.B[0])
        board = baseboard.makeMove(1, vertex)
    } else if ('W' in node) {
        vertex = context.point2vertex(node.W[0])
        board = baseboard.makeMove(-1, vertex)
    } else {
        board = baseboard.clone()
    }

    var ids = ['AW', 'AE', 'AB']
    if (!board) return tree

    for (var i = 0; i < ids.length; i++) {
        if (!(ids[i] in node)) continue

        node[ids[i]].forEach(function(value) {
            if (value.indexOf(':') < 0) {
                // Single point
                board.arrangement[context.point2vertex(value)] = i - 1
            } else {
                // Compressed point list
                context.compressed2list(value).forEach(function(vertex) {
                    board.arrangement[vertex] = i - 1
                })
            }
        })
    }

    if (vertex != null) {
        board.overlays[vertex] = ['point', 0, '']
    }

    var ids = ['CR', 'MA', 'SQ', 'TR']
    var classes = ['circle', 'cross', 'square', 'triangle']

    for (var i = 0; i < ids.length; i++) {
        if (!(ids[i] in node)) continue

        node[ids[i]].forEach(function(value) {
            if (value.indexOf(':') < 0) {
                // Single point
                board.overlays[context.point2vertex(value)] = [classes[i], 0, '']
            } else {
                // Compressed point list
                context.compressed2list(value).forEach(function(vertex) {
                    board.overlays[vertex] = [classes[i], 0, '']
                })
            }
        })
    }

    if ('LB' in node) {
        node.LB.forEach(function(composed) {
            var sep = composed.indexOf(':')
            var point = composed.slice(0, sep)
            var label = composed.slice(sep + 1).replace(/\s+/, ' ')
            board.overlays[context.point2vertex(point)] = ['label', 0, label]
        })
    }

    node.board = board

    if (index == tree.nodes.length - 1 && tree.subtrees.length > 0) {
        // Add variation overlays

        tree.subtrees.forEach(function(subtree) {
            if (subtree.nodes.length == 0) return

            var v, sign

            if ('B' in subtree.nodes[0]) {
                v = sgf.point2vertex(subtree.nodes[0].B[0])
                sign = 1
            } else if ('W' in subtree.nodes[0]) {
                v = sgf.point2vertex(subtree.nodes[0].W[0])
                sign = -1
            } else {
                return
            }

            if (v in board.overlays) board.overlays[v][1] = sign
            else board.overlays[v] = ['', sign, '']
        })
    }

    return tree
}

context.tree2string = function(tree) {
    var output = ''

    tree.nodes.forEach(function(node) {
        output += ';'

        for (var id in node) {
            if (id.toUpperCase() != id) continue
            output += id

            node[id].forEach(function(value) {
                output += '[' + context.escapeString(value.toString()) + ']'
            })
        }

        output += '\n'
    })

    if (tree.current != null)
        output += '(' + context.tree2string(tree.subtrees[tree.current]) + ')'

    for (var i = 0; i < tree.subtrees.length; i++) {
        if (i == tree.current) continue
        output += '(' + context.tree2string(tree.subtrees[i]) + ')'
    }

    return output
}

context.escapeString = function(input) {
    return input.replace(/\\/g, '\\\\').replace(/\]/g, '\\]')
}

context.unescapeString = function(input) {
    return input.replace(/\\(\r\n|\n\r|\n|\r)/g, '').replace(/\\(.)/g, function(m, p) { return p })
}

}).call(null, typeof module != 'undefined' ? module : window)
