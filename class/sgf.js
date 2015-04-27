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

    var tree = { nodes: [], subtrees: [] }
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
            if (depth == 0) tree.subtrees.push(exports.parse(tokens, newstart, i - 1))
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

exports.addBoards = function(tree, baseboard) {
    if (arguments.length <= 1) {
        var size = tree.nodes.length != 0 && 'SZ' in tree.nodes[0] ? tree.nodes[0]['SZ'].toInt() : 19
        baseboard = new Board(size)
    }

    tree.nodes.each(function(node) {
        if ('B' in node) {
            baseboard = baseboard.makeMove(1, exports.point2tuple(node.B[0]))
        } else if ('W' in node) {
            baseboard = baseboard.makeMove(-1, exports.point2tuple(node.W[0]))
        } else {
            if ('AB' in node) {
                baseboard = new Board(baseboard.size, baseboard.arrangements, baseboard.captures)

                node.AB.each(function(point) {
                    baseboard.arrangements[exports.point2tuple(point)] = 1
                })
            }
            if ('AW' in node) {
                baseboard = new Board(baseboard.size, baseboard.arrangements, baseboard.captures)

                node.AW.each(function(point) {
                    baseboard.arrangements[exports.point2tuple(point)] = -1
                })
            }
            if ('AE' in node) {
                baseboard = new Board(baseboard.size, baseboard.arrangements, baseboard.captures)

                node.AE.each(function(point) {
                    baseboard.arrangements[exports.point2tuple(point)] = 1
                })
            }
        }

        node.board = baseboard
    })

    tree.subtrees.each(function(t) {
        exports.addBoards(t, baseboard)
    })
}