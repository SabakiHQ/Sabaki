const sgf = require('@sabaki/sgf')
const Board = require('./board')
const helper = require('./helper')

const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

let boardCache = {}

exports.new = function() {
    return {
        id: helper.getId(),
        nodes: [],
        subtrees: [],
        current: null,
        parent: null
    }
}

exports.clone = function(tree, parent = null) {
    let c = Object.assign(exports.new(), {
        current: tree.current,
        parent
    })

    for (let node of tree.nodes) {
        let cn = {}

        for (let key in node) {
            if (key === 'board') continue

            if (Array.isArray(node[key])) {
                cn[key] = [...node[key]]
            } else {
                cn[key] = node[key]
            }
        }

        c.nodes.push(cn)
    }

    for (let subtree of tree.subtrees) {
        c.subtrees.push(exports.clone(subtree, c))
    }

    return c
}

exports.getRoot = function(tree) {
    while (tree.parent !== null) tree = tree.parent
    return tree
}

exports.getRootProperty = function(tree, property, fallback = null) {
    let node = exports.getRoot(tree).nodes[0]
    if (!node) return fallback

    let result = ''
    if (property in node) result = node[property][0]

    return result === '' ? fallback : result
}

exports.getHeight = function(tree) {
    let height = 0

    for (let subtree of tree.subtrees) {
        height = Math.max(exports.getHeight(subtree), height)
    }

    return height + tree.nodes.length
}

exports.getCurrentHeight = function(tree) {
    let height = tree.nodes.length

    if (tree.subtrees.length !== 0)
        height += exports.getCurrentHeight(tree.subtrees[tree.current])

    return height
}

exports.getTreesRecursive = function(tree) {
    let result = [tree]

    for (let subtree of tree.subtrees) {
        result.push(...exports.getTreesRecursive(subtree))
    }

    return result
}

exports.getLevel = function(tree, index) {
    return index + (tree.parent ? exports.getLevel(tree.parent, tree.parent.nodes.length) : 0)
}

exports.getSection = function(tree, level) {
    if (level < 0) return []
    if (level < tree.nodes.length) return [[tree, level]]

    let sections = []

    for (let subtree of tree.subtrees) {
        sections.push(...exports.getSection(subtree, level - tree.nodes.length))
    }

    return sections
}

exports.navigate = function(tree, index, step) {
    if (index + step >= 0 && index + step < tree.nodes.length) {
        return [tree, index + step]
    } else if (index + step < 0 && tree.parent != null) {
        let prev = tree.parent
        let newstep = index + step + 1

        return exports.navigate(prev, prev.nodes.length - 1, newstep)
    } else if (index + step >= tree.nodes.length && tree.subtrees.length !== 0) {
        let next = tree.subtrees[tree.current]
        let newstep = index + step - tree.nodes.length

        return exports.navigate(next, 0, newstep)
    }

    return null
}

exports.makeHorizontalNavigator = function(tree, index) {
    let root = exports.getRoot(tree)
    let level = exports.getLevel(tree, index, root)
    let sections = exports.getSection(root, level)
    let j = sections.map(x => x[0]).indexOf(tree)

    return {
        navigate(step) {
            if (j + step >= 0 && j + step < sections.length) {
                j = j + step
            } else if (j + step >= sections.length) {
                step = j + step - sections.length
                sections = exports.getSection(root, ++level)
                j = 0
                if (sections.length != 0) this.navigate(step)
            } else if (j + step < 0) {
                step = j + step + 1
                sections = exports.getSection(root, --level)
                j = sections.length - 1
                if (sections.length != 0) this.navigate(step)
            }
        },
        value() {
            return j < sections.length && j >= 0 ? sections[j] : null
        },
        next() {
            this.navigate(1)
            return this.value()
        },
        prev() {
            this.navigate(-1)
            return this.value()
        }
    }
}

exports.split = function(tree, index) {
    if (index < 0 || index >= tree.nodes.length - 1) return [tree, tree]

    let second = {}
    let first = Object.assign(exports.new(), {
        nodes: tree.nodes.slice(0, index + 1),
        subtrees: [second],
        parent: tree.parent,
        current: 0
    })

    Object.assign(second, exports.new(), {
        nodes: tree.nodes.slice(index + 1),
        subtrees: tree.subtrees,
        parent: first,
        current: tree.current
    })

    if (first.parent) {
        first.parent.subtrees[first.parent.subtrees.indexOf(tree)] = first
    }

    for (let subtree of second.subtrees) {
        subtree.parent = second
    }

    return [first, second]
}

exports.reduce = function(tree) {
    if (tree.subtrees.length !== 1) return tree

    let onlySubtree = exports.reduce(tree.subtrees[0])

    tree.nodes.push(...onlySubtree.nodes)
    tree.subtrees = onlySubtree.subtrees
    tree.current = onlySubtree.current

    if (tree.parent) {
        tree.parent.subtrees[tree.parent.subtrees.indexOf(tree)] = tree
    }

    for (let subtree of tree.subtrees) {
        subtree.parent = tree
    }

    return tree
}

exports.onCurrentTrack = function(tree) {
    return !tree.parent
    || tree.parent.subtrees[tree.parent.current] == tree
    && exports.onCurrentTrack(tree.parent)
}

exports.onMainTrack = function(tree) {
    return !tree.parent
    || tree.parent.subtrees[0] == tree
    && exports.onMainTrack(tree.parent)
}

exports.getMatrixDict = function(tree, matrix = null, dict = {}, xshift = 0, yshift = 0) {
    if (!matrix) matrix = [...Array(exports.getHeight(tree))].map(_ => [])

    let hasCollisions = true
    while (hasCollisions) {
        hasCollisions = false

        for (let y = 0; y < Math.min(tree.nodes.length + 1, matrix.length - yshift); y++) {
            if (xshift >= matrix[yshift + y].length - (y === tree.nodes.length)) continue

            hasCollisions = true
            xshift++
            break
        }
    }

    for (let y = 0; y < tree.nodes.length; y++) {
        matrix[yshift + y].length = xshift + 1
        matrix[yshift + y][xshift] = [tree, y]
        dict[tree.id + '-' + y] = [xshift, yshift + y]
    }

    for (let k = 0; k < tree.subtrees.length; k++) {
        let subtree = tree.subtrees[k]
        exports.getMatrixDict(subtree, matrix, dict, xshift + k, yshift + tree.nodes.length)
    }

    return [matrix, dict]
}

exports.getMatrixWidth = function(y, matrix) {
    let keys = [...Array(10)]
        .map((_, i) => i + y - 4)
        .filter(i => i >= 0 && i < matrix.length)

    let padding = Math.min(...keys.map(i => {
        for (let j = 0; j < matrix[i].length; j++)
            if (matrix[i][j] != null) return j
        return 0
    }))

    let width = Math.max(...keys.map(i => matrix[i].length)) - padding

    return [width, padding]
}

exports.getBoard = function(tree, index, baseboard = null) {
    if (index >= tree.nodes.length) return null

    let node = tree.nodes[index]
    let vertex = null
    let board = null

    // Get base board

    if (!baseboard) {
        let prev = exports.navigate(tree, index, -1)

        if (!prev) {
            let size = [19, 19]

            if ('SZ' in node) {
                size = node.SZ[0].toString()

                if (size.includes(':')) size = size.split(':')
                else size = [size, size]

                size = size.map(x => isNaN(x) ? 19 : +x)
            }

            baseboard = new Board(...size)
        } else {
            baseboard = boardCache[`${prev[0].id}-${prev[1]}`] || exports.getBoard(...prev)
        }
    }

    // Make move

    let data = {B: 1, W: -1}

    for (let prop in data) {
        if (!(prop in node)) continue

        vertex = sgf.parseVertex(node[prop][0])
        board = baseboard.makeMove(data[prop], vertex)
        break
    }

    if (!board) board = baseboard.clone()

    // Add markup

    data = {AW: -1, AE: 0, AB: 1}

    for (let prop in data) {
        if (!(prop in node)) continue

        for (let value of node[prop]) {
            for (let vertex of sgf.parseCompressedVertices(value)) {
                if (!board.hasVertex(vertex)) continue
                board.set(vertex, data[prop])
            }
        }
    }

    board.markers = board.arrangement.map(row => row.map(_ => null))

    if (vertex != null && board.hasVertex(vertex)) {
        let [x, y] = vertex
        board.markers[y][x] = {type: 'point'}
    }

    data = {CR: 'circle', MA: 'cross', SQ: 'square', TR: 'triangle'}

    for (let prop in data) {
        if (!(prop in node)) continue

        for (let value of node[prop]) {
            for (let [x, y] of sgf.parseCompressedVertices(value)) {
                if (board.markers[y] == null) continue
                board.markers[y][x] = {type: data[prop]}
            }
        }
    }

    if ('LB' in node) {
        for (let composed of node.LB) {
            let sep = composed.indexOf(':')
            let point = composed.slice(0, sep)
            let label = composed.slice(sep + 1)
            let [x, y] = sgf.parseVertex(point)

            if (board.markers[y] == null) continue
            board.markers[y][x] = {type: 'label', label}
        }
    }

    if ('L' in node) {
        for (let i = 0; i < node.L.length; i++) {
            let point = node.L[i]
            let label = alpha[i]
            if (label == null) return
            let [x, y] = sgf.parseVertex(point)

            if (board.markers[y] == null) continue
            board.markers[y][x] = {type: 'label', label}
        }
    }

    for (let type of ['AR', 'LN']) {
        if (!(type in node)) continue

        for (let composed of node[type]) {
            let sep = composed.indexOf(':')
            let [v1, v2] = [composed.slice(0, sep), composed.slice(sep + 1)].map(sgf.parseVertex)

            board.lines.push({v1, v2, type: type === 'AR' ? 'arrow' : 'line'})
        }
    }

    // Add variation overlays

    let addInfo = (node, list) => {
        let v, sign

        if ('B' in node) {
            v = sgf.parseVertex(node.B[0])
            sign = 1
        } else if ('W' in node) {
            v = sgf.parseVertex(node.W[0])
            sign = -1
        } else {
            return
        }

        if (!board.hasVertex(v))
            return

        let type = null

        if ('BM' in node) {
            type = 'bad'
        } else if ('DO' in node) {
            type = 'doubtful'
        } else if ('IT' in node) {
            type = 'interesting'
        } else if ('TE' in node) {
            type = 'good'
        }

        list[v] = {sign, type}
    }

    if (index === tree.nodes.length - 1) {
        for (let subtree of tree.subtrees) {
            if (subtree.nodes.length === 0) continue
            addInfo(subtree.nodes[0], board.childrenInfo)
        }
    } else if (index < tree.nodes.length - 1) {
        addInfo(tree.nodes[index + 1], board.childrenInfo)
    }

    if (index === 0 && tree.parent) {
        for (let subtree of tree.parent.subtrees) {
            if (subtree.nodes.length == 0) continue
            addInfo(subtree.nodes[0], board.siblingsInfo)
        }
    }

    boardCache[`${tree.id}-${index}`] = board
    return board
}

exports.clearBoardCache = function() {
    boardCache = {}
}

exports.getJson = function(tree) {
    return JSON.stringify(tree, (name, val) => {
        let list = ['id', 'board', 'parent', 'current']
        return list.includes(name) ? undefined : val
    })
}

exports.fromJson = function(json) {
    let addInformation = tree => {
        tree.id = helper.getId()

        if (tree.subtrees.length > 0) tree.current = 0

        for (let i = 0; i < tree.subtrees.length; i++) {
            tree.subtrees[i].parent = tree
            addInformation(tree.subtrees[i])
        }

        return tree
    }

    let tree = JSON.parse(json)
    tree.parent = null
    return addInformation(tree)
}

exports.getHash = function(tree) {
    return helper.hash(`${JSON.stringify(tree.nodes)}-${tree.subtrees.map(exports.getHash).join('-')}`)
}

exports.getMatrixHash = function(tree) {
    return helper.hash(`${tree.id}-${tree.nodes.length}-${tree.subtrees.map(exports.getMatrixHash).join('-')}`)
}
