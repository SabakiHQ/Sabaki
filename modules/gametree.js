const Board = require('./board')

const helper = require('./helper')
const {sgf} = require('./fileformats')

const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

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
    if (index < 0 || index >= tree.nodes.length - 1) return tree

    let newnodes = tree.nodes.slice(0, index + 1)
    tree.nodes = tree.nodes.slice(index + 1)

    let newtree = exports.new()
    newtree.nodes = newnodes
    newtree.subtrees = [tree]
    newtree.parent = tree.parent
    newtree.current = 0
    tree.parent = newtree

    if (newtree.parent) {
        newtree.parent.subtrees[newtree.parent.subtrees.indexOf(tree)] = newtree
    }

    return newtree
}

exports.reduce = function(tree) {
    if (tree.subtrees.length != 1) return tree

    tree.nodes.push(...tree.subtrees[0].nodes)
    tree.current = tree.subtrees[0].current
    tree.subtrees = tree.subtrees[0].subtrees

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

                size = size.map(x => +x)
            }

            baseboard = new Board(...size)
        } else {
            let prevNode = prev[0].nodes[prev[1]]
            baseboard = prevNode.board || exports.getBoard(...prev)
        }
    }

    // Make move

    let data = {B: 1, W: -1}

    for (let prop in data) {
        if (!(prop in node)) continue

        vertex = sgf.point2vertex(node[prop][0])
        board = baseboard.makeMove(data[prop], vertex)
        break
    }

    if (!board) board = baseboard.clone()

    // Add markup

    data = {AW: -1, AE: 0, AB: 1}

    for (let prop in data) {
        if (!(prop in node)) continue

        for (let value of node[prop]) {
            for (let vertex of sgf.compressed2list(value)) {
                if (!board.hasVertex(vertex)) continue
                board.set(vertex, data[prop])
            }
        }
    }

    if (vertex != null) {
        board.markups[vertex] = ['point', '']
    }

    data = {CR: 'circle', MA: 'cross', SQ: 'square', TR: 'triangle'}

    for (let prop in data) {
        if (!(prop in node)) continue

        for (let value of node[prop]) {
            for (let vertex of sgf.compressed2list(value)) {
                board.markups[vertex] = [data[prop], '']
            }
        }
    }

    if ('LB' in node) {
        for (let composed of node.LB) {
            let sep = composed.indexOf(':')
            let point = composed.slice(0, sep)
            let label = composed.slice(sep + 1)

            board.markups[sgf.point2vertex(point)] = ['label', label]
        }
    }

    if ('L' in node) {
        for (let i = 0; i < node.L.length; i++) {
            let point = node.L[i]
            let label = alpha[i]
            if (label == null) return

            board.markups[sgf.point2vertex(point)] = ['label', label]
        }
    }

    for (let type of ['AR', 'LN']) {
        if (!(type in node)) continue

        for (let composed of node[type]) {
            let sep = composed.indexOf(':')
            let [v1, v2] = [composed.slice(0, sep), composed.slice(sep + 1)].map(sgf.point2vertex)

            board.lines.push([v1, v2, type === 'AR'])
        }
    }

    // Add variation overlays

    let addOverlay = (node, type) => {
        let v, sign

        if ('B' in node) {
            v = sgf.point2vertex(node.B[0])
            sign = 1
        } else if ('W' in node) {
            v = sgf.point2vertex(node.W[0])
            sign = -1
        } else {
            return
        }

        if (!board.hasVertex(v) || v in board.ghosts)
            return

        let types = []

        if (type === 'child') {
            types.push(`ghost_${sign}`)

            if ('BM' in node) {
                types.push('badmove')
            } else if ('DO' in node) {
                types.push('doubtfulmove')
            } else if ('IT' in node) {
                types.push('interestingmove')
            } else if ('TE' in node) {
                types.push('goodmove')
            }
        } else if (type === 'sibling') {
            types.push(`siblingghost_${sign}`)
        }

        board.ghosts[v] = types
    }

    if (index === tree.nodes.length - 1) {
        for (let subtree of tree.subtrees) {
            if (subtree.nodes.length === 0) continue
            addOverlay(subtree.nodes[0], 'child')
        }
    } else if (index < tree.nodes.length - 1) {
        addOverlay(tree.nodes[index + 1], 'child')
    }

    if (index === 0 && tree.parent) {
        for (let subtree of tree.parent.subtrees) {
            if (subtree.nodes.length == 0) continue
            addOverlay(subtree.nodes[0], 'sibling')
        }
    }

    node.board = board
    return board
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
    return helper.hash(`${tree.nodes.map(exports.getJson).join('-')}-${tree.subtrees.map(exports.getHash).join('-')}`)
}

exports.getMatrixHash = function(tree) {
    return helper.hash(`${tree.id}-${tree.nodes.length}-${tree.subtrees.map(exports.getMatrixHash).join('-')}`)
}
