var Board = require('./board')
var Tuple = require('../lib/tuple')

var uuid = require('../lib/node-uuid')
var setting = require('remote').require('./module/setting')

exports.navigate = function(tree, index, step) {
    if (index + step >= 0 && index + step < tree.nodes.length) {
        return new Tuple(tree, index + step)
    } else if (index + step < 0 && tree.parent) {
        var prev = tree.parent
        var newstep = index + step + 1

        return exports.navigate(prev, prev.nodes.length - 1, newstep)
    } else if (index + step >= tree.nodes.length && tree.current != null) {
        var next = tree.subtrees[tree.current]
        var newstep = index + step - tree.nodes.length

        return exports.navigate(next, 0, newstep)
    }

    return new Tuple(null, 0)
}

exports.splitTree = function(tree, index) {
    if (index < 0 || index >= tree.nodes.length - 1) return tree

    var newnodes = tree.nodes.slice(0, index + 1)
    tree.nodes = tree.nodes.slice(index + 1)

    var newtree = {
        id: uuid.v4(),
        nodes: newnodes,
        subtrees: [tree],
        parent: tree.parent,
        current: 0
    }
    tree.parent = newtree

    if (newtree.parent != null) {
        newtree.parent.subtrees[newtree.parent.subtrees.indexOf(tree)] = newtree
    }

    return newtree
}

exports.reduceTree = function(tree) {
    if (tree.subtrees.length != 1) return tree

    tree.nodes = tree.nodes.concat(tree.subtrees[0].nodes)
    tree.current = tree.subtrees[0].current
    tree.subtrees = tree.subtrees[0].subtrees

    tree.subtrees.each(function(subtree) {
        subtree.parent = tree
    })

    return tree
}

exports.getHeight = function(tree) {
    var depth = 0

    tree.subtrees.each(function(subtree) {
        depth = Math.max(exports.getHeight(subtree), depth)
    })

    return depth + tree.nodes.length
}

exports.getCurrentHeight = function(tree) {
    var depth = tree.nodes.length

    if (tree.current != null)
        depth += exports.getCurrentHeight(tree.subtrees[tree.current])

    return depth
}

exports.getWidth = function(y, matrix) {
    var keys = Object.keys(new Int8Array(10)).map(function(i) {
        return parseFloat(i) + y - 4
    }).filter(function(i) { return i >= 0 && i < matrix.length })

    var padding = Math.min.apply(null, keys.map(function(i) {
        return matrix[i].indexOf(matrix[i].pick())
    }))
    var width = Math.max.apply(null, keys.map(function(i) {
        return matrix[i].length
    })) - padding

    return new Tuple(width, padding)
}

exports.tree2matrixdict = function(tree, matrix, dict, xshift, yshift) {
    if (!matrix) matrix = Array.apply(null, new Array(exports.getHeight(tree))).map(function() { return [] });
    if (!dict) dict = {}
    if (!xshift) xshift = 0
    if (!yshift) yshift = 0

    var hasCollisions = true
    while (hasCollisions) {
        hasCollisions = false

        for (var y = 0; y < Math.min(tree.nodes.length + 1, matrix.length - yshift); y++) {
            if (xshift < matrix[yshift + y].length) {
                hasCollisions = true
                xshift++
                break
            }
        }
    }

    for (var y = 0; y < tree.nodes.length; y++) {
        while (xshift >= matrix[yshift + y].length) {
            matrix[yshift + y].push(null)
        }

        matrix[yshift + y][xshift] = new Tuple(tree, y)
        dict[tree.id + '-' + y] = new Tuple(xshift, yshift + y)
    }

    for (var k = 0; k < tree.subtrees.length; k++) {
        var subtree = tree.subtrees[k]
        exports.tree2matrixdict(subtree, matrix, dict, xshift, yshift + tree.nodes.length)
    }

    return new Tuple(matrix, dict)
}

exports.matrixdict2graph = function(matrixdict) {
    var matrix = matrixdict[0]
    var dict = matrixdict[1]
    var graph = { nodes: [], edges: [] }
    var width = Math.max.apply(null, matrix.map(function(x) { return x.length }))
    var gridSize = setting.get('graph.grid_size')

    for (x = 0; x < width; x++) {
        for (y = 0; y < matrix.length; y++) {
            if (!matrix[y][x]) continue

            var tree = matrix[y][x][0]
            var index = matrix[y][x][1]
            var id = tree.id + '-' + index

            graph.nodes.push({
                'id': id,
                'x': x * gridSize,
                'y': y * gridSize,
                'size': setting.get('graph.node_size'),
                'data': matrix[y][x]
            })

            var prev = exports.navigate(tree, index, -1)
            if (!prev[0]) continue
            var prevId = prev[0].id + '-' + prev[1]
            var prevPos = dict[prevId]

            if (prevPos[0] != x) {
                graph.nodes.push({
                    'id': id + '-h',
                    'x': (x - 1) * gridSize,
                    'y': (y - 1) * gridSize,
                    'size': 0
                })

                graph.edges.push({
                    'id': id + '-e1',
                    'source': id,
                    'target': id + '-h'
                })

                graph.edges.push({
                    'id': id + '-e2',
                    'source': id + '-h',
                    'target': prevId
                })
            } else {
                graph.edges.push({
                    'id': id + '-e1',
                    'source': id,
                    'target': prevId
                })
            }
        }
    }

    return graph
}
