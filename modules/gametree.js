const Board = require('./board')

const helper = require('./helper')
const setting = require('./setting')
const sgf = require('./sgf')

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

exports.clone = function(tree, newIds = false, parent = null) {
    let c = {
        id: newIds ? helper.getId() : tree.id,
        nodes: [],
        subtrees: [],
        current: tree.current,
        parent,
        collapsed: tree.collapsed
    }

    for (let node of tree.nodes) {
        let cn = {}

        for (let key in node) {
            if (key == 'board') continue

            if (Object.prototype.toString.call(node[key]) == '[object Array]') {
                cn[key] = [...node[key]]
            } else {
                cn[key] = node[key]
            }
        }

        c.nodes.push(cn)
    }

    for (let subtree of tree.subtrees) {
        c.subtrees.push(exports.clone(subtree, newIds, c))
    }

    return c
}

exports.getRoot = function(tree) {
    while (tree.parent != null) tree = tree.parent
    return tree
}

exports.getPlayerName = function(tree, sign, fallback = '') {
    tree = exports.getRoot(tree)
    let color = sign > 0 ? 'B' : 'W'

    if (tree.nodes.length == 0) return fallback

    let result = ''
    if (('P' + color) in tree.nodes[0]) result = tree.nodes[0]['P' + color][0]
    else if ((color + 'T') in tree.nodes[0]) result = tree.nodes[0][color + 'T'][0]

    return result.trim() == '' ? fallback : result
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

    if (tree.current != null)
        height += exports.getCurrentHeight(tree.subtrees[tree.current])

    return height
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

exports.getMatrixDict = function(tree, matrix, dict = {}, xshift = 0, yshift = 0) {
    if (!matrix) matrix = Array.apply(null, new Array(exports.getHeight(tree))).map(() => [])

    let hasCollisions = true
    while (hasCollisions) {
        hasCollisions = false

        for (let y = 0; y < Math.min(tree.nodes.length + 1, matrix.length - yshift); y++) {
            if (xshift >= matrix[yshift + y].length - Math.max(0, y + 1 - tree.nodes.length)) continue

            hasCollisions = true
            xshift++
            break
        }
    }

    for (let y = 0; y < tree.nodes.length; y++) {
        while (xshift >= matrix[yshift + y].length) {
            matrix[yshift + y].push(null)
        }

        matrix[yshift + y][xshift] = [tree, y]
        dict[tree.id + '-' + y] = [xshift, yshift + y]
    }

    if (!tree.collapsed) {
        for (let k = 0; k < tree.subtrees.length; k++) {
            let subtree = tree.subtrees[k]
            exports.getMatrixDict(subtree, matrix, dict, xshift, yshift + tree.nodes.length)
        }
    }

    return [matrix, dict]
}

exports.getTreesRecursive = function(tree) {
    let result = [tree]

    for (let subtree of tree.subtrees) {
        result.push(...exports.getTreesRecursive(subtree))
    }

    return result
}

exports.navigate = function(tree, index, step) {
    if (index + step >= 0 && index + step < tree.nodes.length) {
        return [tree, index + step]
    } else if (index + step < 0 && tree.parent != null) {
        let prev = tree.parent
        let newstep = index + step + 1

        return exports.navigate(prev, prev.nodes.length - 1, newstep)
    } else if (index + step >= tree.nodes.length && tree.current != null) {
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

    if (newtree.parent)
        newtree.parent.subtrees[newtree.parent.subtrees.indexOf(tree)] = newtree

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

exports.getMatrixWidth = function(y, matrix) {
    let keys = Object.keys(new Int8Array(10))
        .map(i => parseFloat(i) + y - 4)
        .filter(i => i >= 0 && i < matrix.length)

    let padding = Math.min(...keys.map(i => {
        for (let j = 0; j < matrix[i].length; j++)
            if (matrix[i][j] != null) return j
        return 0
    }))

    let width = Math.max(...keys.map(i => matrix[i].length)) - padding

    return [width, padding]
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

exports.matrixdict2graph = function([matrix, dict]) {
    let graph = {nodes: [], edges: []}
    let currentTrack = []
    let notCurrentTrack = []
    let width = Math.max(...matrix.map(x => x.length))
    let gridSize = setting.get('graph.grid_size')

    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < width; x++) {
            if (!matrix[y][x]) continue

            let [tree, index] = matrix[y][x]
            let id = tree.id + '-' + index
            let commentproperties = setting.get('sgf.comment_properties')

            let node = {
                id: id,
                x: x * gridSize,
                y: y * gridSize,
                size: setting.get('graph.node_size'),
                data: matrix[y][x],
                originalColor: setting.get('graph.node_color')
            }

            // Show passes as squares

            if ('B' in tree.nodes[index] && tree.nodes[index].B[0] == ''
            || 'W' in tree.nodes[index] && tree.nodes[index].W[0] == '') {
                node.type = 'square'
                node.size++
            }

            // Show non-moves as diamonds

            if (!('B' in tree.nodes[index] || 'W' in tree.nodes[index])) {
                node.type = 'diamond'
                node.size++
            }

            // Set color

            if (commentproperties.some(x => x in tree.nodes[index]))
                node.originalColor = setting.get('graph.node_comment_color')
            if ('HO' in tree.nodes[index])
                node.originalColor = setting.get('graph.node_bookmark_color')

            if (currentTrack.includes(tree.id)) {
                node.color = node.originalColor
            } else if (!notCurrentTrack.includes(tree.id)) {
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

            // Add helper nodes & edges

            let prev = exports.navigate(tree, index, -1)
            if (!prev) continue

            let prevId = prev[0].id + '-' + prev[1]
            let prevPos = dict[prevId]

            let thickness = setting.get('graph.edge_inactive_size')
            let edgeColor = setting.get('graph.edge_inactive_color')
            let method = 'unshift'

            if (currentTrack.includes(tree.id)) {
                thickness = setting.get('graph.edge_size')
                edgeColor = setting.get('graph.edge_color')
                method = 'push'
            }

            if (prevPos[0] != x) {
                graph.nodes.push({
                    id: id + '-h',
                    x: (x - 1) * gridSize,
                    y: (y - 1) * gridSize,
                    size: 0
                })

                graph.edges[method]({
                    id: id + '-e1',
                    source: id,
                    target: id + '-h',
                    size: thickness,
                    color: edgeColor
                })

                graph.edges[method]({
                    id: id + '-e2',
                    source: id + '-h',
                    target: prevId,
                    size: thickness,
                    color: edgeColor
                })
            } else {
                graph.edges[method]({
                    id: id + '-e1',
                    source: id,
                    target: prevId,
                    size: thickness,
                    color: edgeColor
                })
            }
        }
    }

    return graph
}

exports.getBoard = function(tree, index = 0, baseboard = null) {
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
                size = node.SZ[0]

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

    if ('B' in node) {
        vertex = sgf.point2vertex(node.B[0])
        board = baseboard.makeMove(1, vertex)
    } else if ('W' in node) {
        vertex = sgf.point2vertex(node.W[0])
        board = baseboard.makeMove(-1, vertex)
    }

    if (!board) board = baseboard.clone()

    // Add markup

    let ids = ['AW', 'AE', 'AB']

    for (let i = 0; i < ids.length; i++) {
        if (!(ids[i] in node)) continue

        for (let value of node[ids[i]]) {
            for (let vertex of sgf.compressed2list(value)) {
                board.set(vertex, i - 1)
            }
        }
    }

    if (vertex != null) {
        board.markups[vertex] = ['point', '']
    }

    ids = ['CR', 'MA', 'SQ', 'TR']
    let classes = ['circle', 'cross', 'square', 'triangle']

    for (let i = 0; i < ids.length; i++) {
        if (!(ids[i] in node)) continue

        for (let value of node[ids[i]]) {
            for (let vertex of sgf.compressed2list(value)) {
                board.markups[vertex] = [classes[i], '']
            }
        }
    }

    if ('LB' in node) {
        for (let composed of node.LB) {
            let sep = composed.indexOf(':')
            let point = composed.slice(0, sep)
            let label = composed.slice(sep + 1).replace(/\s+/, ' ')

            board.markups[sgf.point2vertex(point)] = ['label', label]
        }
    }

    for (let type of ['AR', 'LN']) {
        if (!(type in node)) continue

        for (let composed of node[type]) {
            let sep = composed.indexOf(':')
            let p1 = composed.slice(0, sep)
            let p2 = composed.slice(sep + 1)

            board.lines.push([sgf.point2vertex(p1), sgf.point2vertex(p2), type == 'AR'])
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

        if (board.ghosts.some(([w]) => w[0] == v[0] && w[1] == v[1]))
            return

        let types = [type]

        if (type == 'child') {
            if ('BM' in node) {
                types.push('badmove')
            } else if ('DO' in node) {
                types.push('doubtfulmove')
            } else if ('IT' in node) {
                types.push('interestingmove')
            } else if ('TE' in node) {
                types.push('goodmove')
            }
        }

        if (!board.hasVertex(v)) return
        board.ghosts.push([v, sign, types])
    }

    if (index == tree.nodes.length - 1) {
        for (let subtree of tree.subtrees) {
            if (subtree.nodes.length == 0) continue
            addOverlay(subtree.nodes[0], 'child')
        }
    } else if (index < tree.nodes.length - 1) {
        addOverlay(tree.nodes[index + 1], 'child')
    }

    if (index == 0 && tree.parent) {
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
        let list = ['id', 'board', 'parent', 'collapsed', 'current']
        return list.includes(name) ? undefined : val
    })
}

exports.fromJson = function(json) {
    let addInformation = tree => {
        tree.id = helper.getId()
        tree.collapsed = false

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
    return helper.hash(sgf.stringify(tree))
}
