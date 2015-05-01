var Board = require('./board.js')
var Tuple = require('../lib/tuple')
var fs = require('fs')

exports.tokenize = function(input) {
    var tokens = []
    var builder = ''
    var propIdentRegex = /^[A-Z]+/

    var i = 0
    var inCValueType = false
    var inBackslash = false

    while (i < input.length) {
        if (!inCValueType) {
            builder = ''
            inBackslash = false

            switch (input[i]) {
                case '(':
                    tokens.push(new Tuple('parenthesis', '('))
                    i++
                    break
                case ')':
                    tokens.push(new Tuple('parenthesis', ')'))
                    i++
                    break
                case ';':
                    tokens.push(new Tuple('semicolon', ';'))
                    i++
                    break
                case '[':
                    inCValueType = true
                    i++
                    break
                default:
                    if (/\s/.test(input[i])) {
                        i++
                        break
                    }

                    var match = propIdentRegex.exec(input.slice(i))[0]

                    if (match != null) {
                        tokens.push(new Tuple('prop_ident', match))
                        i += match.length
                    } else {
                        return []
                    }

                    break
            }
        } else {
            if (!inBackslash) {
                switch (input[i]) {
                    case '\\':
                        inBackslash = true
                        break
                    case '\n':
                        builder += '\\'
                        break
                    case ']':
                        inCValueType = false
                        tokens.push(new Tuple('c_value_type', builder))
                        break
                    default:
                        builder += input[i]
                        break
                }
            } else {
                inBackslash = false
                builder += input[i]
            }

            i++
        }
    }

    return tokens
}

exports.parse = function(tokens, start, end) {
    if (arguments.length <= 2) end = tokens.length - 1
    if (arguments.length <= 1) start = 0

    var i = start

    var tree = { nodes: [], subtrees: [], parent: null, current: null }
    var node, property

    while (i <= end) {
        if (new Tuple('parenthesis', '(').equals(tokens[i])) break
        if (new Tuple('parenthesis', ')').equals(tokens[i])) return null

        tokens[i].unpack(function(type, data) {
            if (type == 'semicolon') {
                node = { }
                tree.nodes.push(node)
            } else if (type == 'prop_ident') {
                node[data] = []
                property = node[data]
            } else if (type == 'c_value_type') {
                property.push(data)
            }
        })

        i++
    }

    var depth = 0
    var newstart = 0

    while (i <= end) {
        if (new Tuple('parenthesis', '(').equals(tokens[i])) {
            depth++
            if (depth == 1) newstart = i + 1
        } else if (new Tuple('parenthesis', ')').equals(tokens[i])) {
            depth--
            if (depth == 0) {
                t = exports.parse(tokens, newstart, i - 1)
                t.parent = tree
                tree.subtrees.push(t)
                tree.current = 0
            }
        }

        i++
    }

    return tree
}

exports.parseFile = function(filename) {
    var input = fs.readFileSync(filename, { encoding: 'utf8' })
    var tokens = exports.tokenize(input)

    return exports.parse(tokens)
}

exports.point2tuple = function(point) {
    if (point.length != 2) return new Tuple(-1, -1)

    var alpha = 'abcdefghijklmnopqrstuvwxyz'
    point = point.toLowerCase()
    return new Tuple(alpha.indexOf(point[0]), alpha.indexOf(point[1]))
}

exports.tuple2point = function(tuple) {
    var alpha = 'abcdefghijklmnopqrstuvwxyz'

    return tuple.unpack(function(x, y) {
        if (x < 0 || y < 0) return ''
        return alpha[x] + alpha[y]
    })
}

exports.addBoard = function(tree, index, baseboard) {
    var node = tree.nodes[index]
    var vertex = null

    if (index >= tree.nodes.length) return tree
    if (arguments.length <= 2) {
        if (index != 0) {
            baseboard = tree.nodes[index - 1].board
        } else {
            if (tree.parent == null || tree.parent.nodes.length == 0) {
                var size = 'SZ' in node ? node.SZ[0].toInt() : 19
                baseboard = new Board(size)
            } else {
                baseboard = tree.parent.nodes[tree.parent.nodes.length - 1].board
            }
        }
    }

    if ('B' in node) {
        vertex = exports.point2tuple(node.B[0])
        baseboard = baseboard.makeMove(1, vertex)
    } else if ('W' in node) {
        vertex = exports.point2tuple(node.W[0])
        baseboard = baseboard.makeMove(-1, vertex)
    } else {
        baseboard = baseboard.makeMove(0)
    }

    var ids = ['AW', 'AE', 'AB']

    for (var i = 0; i < ids.length; i++) {
        if (!(ids[i] in node)) continue

        node[ids[i]].each(function(point) {
            baseboard.arrangement[exports.point2tuple(point)] = i - 1
        })
    }

    if (vertex != null) {
        baseboard.overlays[vertex] = new Tuple('point', 0, '')
    }

    var ids = ['CR', 'MA', 'SQ', 'TR']
    var classes = ['circle', 'cross', 'square', 'triangle']

    for (var i = 0; i < ids.length; i++) {
        if (!(ids[i] in node)) continue

        node[ids[i]].each(function(point) {
            baseboard.overlays[exports.point2tuple(point)] = new Tuple(classes[i], 0, '')
        })
    }

    if ('LB' in node) {
        node.LB.each(function(composed) {
            var sep = composed.indexOf(':')
            var point = composed.slice(0, sep)
            var label = composed.slice(sep + 1).replace(/\s+/, ' ')
            baseboard.overlays[exports.point2tuple(point)] = new Tuple('label', 0, label)
        })
    }

    node.board = baseboard

    if (index == tree.nodes.length - 1 && tree.subtrees.length > 0) {
        // Add variations

        tree.subtrees.each(function(subtree) {
            if (subtree.nodes.length == 0) return

            var v, sign

            if ('B' in subtree.nodes[0]) {
                v = sgf.point2tuple(subtree.nodes[0].B[0])
                sign = 1
            } else if ('W' in subtree.nodes[0]) {
                v = sgf.point2tuple(subtree.nodes[0].W[0])
                sign = -1
            } else {
                return
            }

            if (v in baseboard.overlays)
                baseboard.overlays[v] = baseboard.overlays[v].unpack(function(a, b, c) {
                     return new Tuple(a, sign, c)
                })
            else baseboard.overlays[v] = new Tuple('', sign, '')
        })
    }

    return tree
}

exports.addBoards = function(tree, baseboard) {
    if (tree.nodes.length == 0) return tree

    for (var j = 0; j < tree.nodes.length; j++) {
        if ('board' in tree.nodes[j]) continue
        exports.addBoard(tree, j)
    }

    if (tree.current == null) return tree

    exports.addBoards(tree.subtrees[tree.current], baseboard)
    return tree
}

exports.splitTree = function(tree, index) {
    if (index < 0 || index >= tree.nodes.length - 1) return tree

    var newnodes = tree.nodes.slice(0, index + 1)
    tree.nodes = tree.nodes.slice(index + 1)

    var newtree = { nodes: newnodes, subtrees: [tree], parent: tree.parent, current: 0 }

    if (tree.parent != null) {
        tree.parent.subtrees[tree.parent.subtrees.indexOf(tree)] = newtree
    }

    return newtree
}
