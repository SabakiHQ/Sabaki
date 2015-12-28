var Board = require('./board')
var Tuple = require('tuple-w')

var sgf = require('./sgf')
var helper = require('./helper')
var setting = require('electron').remote.require('./modules/setting')

exports.new = function() {
    return {
        id: helper.getId(),
        nodes: [],
        subtrees: [],
        current: null,
        parent: null,
        collapsed: false
    }
}

exports.clone = function(tree, parent) {
    if (!parent) parent = null

    var c = {
        id: tree.id,
        nodes: [],
        subtrees: [],
        current: tree.current,
        parent: parent,
        collapsed: tree.collapsed
    }

    tree.nodes.forEach(function(node) {
        c.nodes.push(Object.clone(node))
    })

    tree.subtrees.forEach(function(subtree) {
        c.subtrees.push(exports.clone(subtree), c)
    })

    return c
}

exports.getRoot = function(tree) {
    while (tree.parent != null) tree = tree.parent
    return tree
}

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

exports.makeNodeIterator = function(tree, index) {
    var root = exports.getRoot(tree)
    var level = exports.getLevel(tree, index, root)
    var sections = exports.getSections(root, level)
    var j = sections.map(function(x) { return x[0] }).indexOf(tree)

    return {
        navigate: function(step) {
            if (j + step >= 0 && j + step < sections.length) {
                j = j + step
            } else if (j + step >= sections.length) {
                step = j + step - sections.length
                sections = exports.getSections(root, ++level)
                j = 0
                if (sections.length != 0) this.navigate(step)
            } else if (j + step < 0) {
                step = j + step + 1
                sections = exports.getSections(root, --level)
                j = sections.length - 1
                if (sections.length != 0) this.navigate(step)
            }
        },
        value: function() {
            return j < sections.length && j >= 0 ? sections[j] : null
        },
        next: function() {
            this.navigate(1)
            return this.value()
        },
        prev: function() {
            this.navigate(-1)
            return this.value()
        }
    }
}

exports.splitTree = function(tree, index) {
    if (index < 0 || index >= tree.nodes.length - 1) return tree

    var newnodes = tree.nodes.slice(0, index + 1)
    tree.nodes = tree.nodes.slice(index + 1)

    var newtree = exports.new()
    newtree.nodes = newnodes
    newtree.subtrees = [tree]
    newtree.parent = tree.parent
    newtree.current = 0
    tree.parent = newtree

    if (newtree.parent)
        newtree.parent.subtrees[newtree.parent.subtrees.indexOf(tree)] = newtree

    return newtree
}

exports.reduceTree = function(tree) {
    if (tree.subtrees.length != 1) return tree

    tree.nodes = tree.nodes.concat(tree.subtrees[0].nodes)
    tree.current = tree.subtrees[0].current
    tree.subtrees = tree.subtrees[0].subtrees

    tree.subtrees.forEach(function(subtree) {
        subtree.parent = tree
    })

    return tree
}

exports.getHeight = function(tree) {
    var height = 0

    tree.subtrees.forEach(function(subtree) {
        height = Math.max(exports.getHeight(subtree), height)
    })

    return height + tree.nodes.length
}

exports.getCurrentHeight = function(tree) {
    var height = tree.nodes.length

    if (tree.current != null)
        height += exports.getCurrentHeight(tree.subtrees[tree.current])

    return height
}

exports.getLevel = function(tree, index) {
    return index + (tree.parent ? exports.getLevel(tree.parent, tree.parent.nodes.length) : 0)
}

exports.getSections = function(tree, level) {
    if (level < 0) return []
    if (level < tree.nodes.length) return [new Tuple(tree, level)]

    var sections = []

    tree.subtrees.forEach(function(subtree) {
        sections = sections.concat(exports.getSections(subtree, level - tree.nodes.length))
    })

    return sections
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
            if (xshift >= matrix[yshift + y].length) continue

            hasCollisions = true
            xshift++
            break
        }
    }

    for (var y = 0; y < tree.nodes.length; y++) {
        while (xshift >= matrix[yshift + y].length) {
            matrix[yshift + y].push(null)
        }

        matrix[yshift + y][xshift] = new Tuple(tree, y)
        dict[tree.id + '-' + y] = new Tuple(xshift, yshift + y)
    }

    if (!tree.collapsed) {
        for (var k = 0; k < tree.subtrees.length; k++) {
            var subtree = tree.subtrees[k]
            exports.tree2matrixdict(subtree, matrix, dict, xshift, yshift + tree.nodes.length)
        }
    }

    return new Tuple(matrix, dict)
}

exports.onCurrentTrack = function(tree) {
    return !tree.parent || tree.parent.subtrees[tree.parent.current] == tree && exports.onCurrentTrack(tree.parent)
}

exports.matrixdict2graph = function(matrixdict) {
    var matrix = matrixdict[0]
    var dict = matrixdict[1]
    var graph = { nodes: [], edges: [] }
    var currentTrack = []
    var notCurrentTrack = []
    var width = Math.max.apply(null, matrix.map(function(x) { return x.length }))
    var gridSize = setting.get('graph.grid_size')

    for (y = 0; y < matrix.length; y++) {
        for (x = 0; x < width; x++) {
            if (!matrix[y][x]) continue

            var tree = matrix[y][x][0]
            var index = matrix[y][x][1]
            var id = tree.id + '-' + index
            var node = {
                id: id,
                x: x * gridSize,
                y: y * gridSize,
                size: setting.get('graph.node_size'),
                data: matrix[y][x],
                originalColor: setting.get('graph.node_color')
            }

            if ('C' in tree.nodes[index])
                node.originalColor = setting.get('graph.node_comment_color')

            if (currentTrack.indexOf(tree.id) != -1) {
                node.color = node.originalColor
            } else if (notCurrentTrack.indexOf(tree.id) == -1) {
                if (exports.onCurrentTrack(tree)) {
                    currentTrack.push(tree.id)
                    node.color = node.originalColor
                } else {
                    notCurrentTrack.push(tree.id)
                }
            }

            if (tree.collapsed && tree.subtrees.length > 0 && index == tree.nodes.length - 1)
                node.color = node.originalColor = setting.get('graph.node_collapsed_color')

            graph.nodes.push(node)

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

exports.getHash = function(tree) {
    return helper.md5(sgf.tree2string(tree))
}
