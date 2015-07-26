var Tuple = require('../lib/tuple')

var gametree = require('../module/gametree')
var uuid = require('../lib/node-uuid')
var fs = require('fs')

var alpha = 'abcdefghijklmnopqrstuvwxyz'

exports.meta = {
    name: 'Smart Game Format',
    extensions: ['sgf']
}

exports.tokenize = function(input) {
    var tokens = []
    var builder = ''
    var propIdentRegex = /^[A-Za-z]+/

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
                        builder += '\n'
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

    var node, property, tree = {
        id: uuid.v4(),
        nodes: [],
        subtrees: [],
        parent: null,
        current: null
    }

    while (i <= end) {
        if (new Tuple('parenthesis', '(').equals(tokens[i])) break
        if (new Tuple('parenthesis', ')').equals(tokens[i])) return null

        tokens[i].unpack(function(type, data) {
            if (type == 'semicolon') {
                node = {}
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

exports.point2vertex = function(point) {
    if (point.length != 2) return new Tuple(-1, -1)

    point = point.toLowerCase()
    return new Tuple(alpha.indexOf(point[0]), alpha.indexOf(point[1]))
}

exports.vertex2point = function(tuple) {
    return tuple.unpack(function(x, y) {
        if (x < 0 || y < 0) return ''
        return alpha[x] + alpha[y]
    })
}

exports.compressed2list = function(compressed) {
    var colon = compressed.indexOf(':')
    if (colon < 0) return [exports.point2vertex(compressed)]

    var v1 = exports.point2vertex(compressed.slice(0, colon))
    var v2 = exports.point2vertex(compressed.slice(colon + 1))
    var list = []

    for (var i = v1[0]; i <= v2[0]; i++) {
        for (var j = v1[1]; j <= v2[1]; j++) {
            list.push(new Tuple(i, j))
        }
    }

    return list
}

exports.addBoard = function(tree, index, baseboard) {
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

            if (!prevNode.board) exports.addBoard(prev[0], prev[1])
            baseboard = prevNode.board
        }
    }

    if ('B' in node) {
        vertex = exports.point2vertex(node.B[0])
        board = baseboard.makeMove(1, vertex)
    } else if ('W' in node) {
        vertex = exports.point2vertex(node.W[0])
        board = baseboard.makeMove(-1, vertex)
    } else {
        board = baseboard.makeMove(0)
    }

    var ids = ['AW', 'AE', 'AB']

    for (var i = 0; i < ids.length; i++) {
        if (!(ids[i] in node)) continue

        node[ids[i]].each(function(value) {
            if (value.indexOf(':') < 0) {
                // Single point
                board.arrangement[exports.point2vertex(value)] = i - 1
            } else {
                // Compressed point list
                exports.compressed2list(value).each(function(vertex) {
                    board.arrangement[vertex] = i - 1
                })
            }
        })
    }

    if (vertex != null) {
        board.overlays[vertex] = new Tuple('point', 0, '')
    }

    var ids = ['CR', 'MA', 'SQ', 'TR']
    var classes = ['circle', 'cross', 'square', 'triangle']

    for (var i = 0; i < ids.length; i++) {
        if (!(ids[i] in node)) continue

        node[ids[i]].each(function(value) {
            if (value.indexOf(':') < 0) {
                // Single point
                board.overlays[exports.point2vertex(value)] = new Tuple(classes[i], 0, '')
            } else {
                // Compressed point list
                exports.compressed2list(value).each(function(vertex) {
                    board.overlays[vertex] = new Tuple(classes[i], 0, '')
                })
            }
        })
    }

    if ('LB' in node) {
        node.LB.each(function(composed) {
            var sep = composed.indexOf(':')
            var point = composed.slice(0, sep)
            var label = composed.slice(sep + 1).replace(/\s+/, ' ')
            board.overlays[exports.point2vertex(point)] = new Tuple('label', 0, label)
        })
    }

    node.board = board

    if (index == tree.nodes.length - 1 && tree.subtrees.length > 0) {
        // Add variations

        tree.subtrees.each(function(subtree) {
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

            if (v in board.overlays)
                board.overlays[v] = board.overlays[v].unpack(function(a, b, c) {
                     return new Tuple(a, sign, c)
                })
            else board.overlays[v] = new Tuple('', sign, '')
        })
    }

    return tree
}

exports.tree2string = function(tree) {
    var output = ''

    tree.nodes.each(function(node) {
        output += ';'

        Object.each(node, function(values, id) {
            if (id.toUpperCase() != id) return
            output += id

            values.each(function(value) {
                output += '[' + exports.escapeString(value.toString()) + ']'
            })
        })

        output += '\n'
    })

    if (tree.current != null)
        output += '(' + exports.tree2string(tree.subtrees[tree.current]) + ')'

    for (var i = 0; i < tree.subtrees.length; i++) {
        if (i == tree.current) continue
        output += '(' + exports.tree2string(tree.subtrees[i]) + ')'
    }

    return output
}

exports.escapeString = function(input) {
    return input.replace('\\', '\\\\').replace(']', '\\]')
}
