const {sgf} = require('./fileformats')

let _shapes = null
let equals = v => w => w[0] === v[0] && w[1] === v[1]

exports.getSymmetries = function([x, y]) {
    let f = ([x, y]) => [[x, y], [-x, y], [x, -y], [-x, -y]]
    return [...f([x, y]), ...f([y, x])]
}

exports.getBoardSymmetries = function(board, vertex) {
    let [mx, my] = [board.width - 1, board.height - 1]
    let mod = (x, m) => (x % m + m) % m

    return exports.getSymmetries(vertex).map(([x, y]) => [mod(x, mx), mod(y, my)])
}

exports.readShapes = function(content) {
    let tree = sgf.parse(content)[0]
    let result = []

    for (let i = 0; i < tree.subtrees.length; i++) {
        let node = tree.subtrees[i].nodes[0]
        let anchors = node.MA.map(x => [...sgf.point2vertex(x), node.AB.includes(x) ? 1 : -1])
        let vertices = ['AW', 'CR', 'AB']
            .map((x, i) => (node[x] || []).map(y => [...sgf.point2vertex(y), i - 1]))
            .reduce((acc, x) => [...acc, ...x], [])

        let data = {}

        if ('C' in node) {
            for (let [key, value] of node.C[0].trim().split(', ').map(x => x.split(': '))) {
                data[key] = value
            }
        }

        result.push(Object.assign({
            name: node.N[0],
            anchors,
            vertices
        }, data))
    }

    return result
}

exports.cornerMatch = function(vertices, board) {
    let hypotheses = Array(8).fill(true)
    let hypothesesInvert = Array(8).fill(true)

    for (let [x, y, sign] of vertices) {
        let representatives = exports.getBoardSymmetries(board, [x, y])

        for (let i = 0; i < hypotheses.length; i++) {
            if (hypotheses[i] && board.get(representatives[i]) !== sign)
                hypotheses[i] = false
            if (hypothesesInvert[i] && board.get(representatives[i]) !== -sign)
                hypothesesInvert[i] = false
        }

        if (!hypotheses.includes(true) && !hypothesesInvert.includes(true))
            return null
    }

    let i = [...hypotheses, ...hypothesesInvert].indexOf(true)
    return i < 8 ? [i, false] : [i - 8, true]
}

exports.shapeMatch = function(shape, board, vertex) {
    if (!board.hasVertex(vertex)) return null

    let sign = board.get(vertex)
    if (sign === 0) return null
    let equalsVertex = equals(vertex)

    for (let anchor of shape.anchors) {
        let hypotheses = Array(8).fill(true)
        let i = 0

        if (shape.size != null && (board.width !== board.height || board.width !== +shape.size))
            continue

        if (shape.type === 'corner' && !exports.getBoardSymmetries(board, anchor.slice(0, 2)).some(equalsVertex))
            continue

        // Hypothesize vertex === anchor

        for (let [x, y, s] of shape.vertices) {
            let diff = [x - anchor[0], y - anchor[1]]
            let symm = exports.getSymmetries(diff)

            for (let k = 0; k < symm.length; k++) {
                if (!hypotheses[k]) continue
                let w = [vertex[0] + symm[k][0], vertex[1] + symm[k][1]]

                if (!board.hasVertex(w) || board.get(w) !== s * sign * anchor[2])
                    hypotheses[k] = false
            }

            i = hypotheses.indexOf(true)
            if (i < 0) break
        }

        if (i >= 0) return [i, sign !== anchor[2]]
    }

    return null
}

exports.getMoveInterpretation = function(board, vertex, {shapes = null} = {}) {
    if (!board.hasVertex(vertex)) return 'Pass'

    let sign = board.get(vertex)
    let neighbors = board.getNeighbors(vertex)

    // Check atari

    if (neighbors.some(v => board.get(v) === -sign && board.getLiberties(v).length === 1))
        return 'Atari'

    // Check connection

    let friendly = neighbors.filter(v => board.get(v) === sign)
    if (friendly.length === neighbors.length) return 'Fill'
    if (friendly.length >= 2) return 'Connect'

    // Load shape library if needed

    if (shapes == null) {
        if (_shapes == null) {
            _shapes = exports.readShapes(require('../../data/shapes.sgf'))
        }

        shapes = _shapes
    }

    // Match shape

    for (let shape of shapes) {
        if (exports.shapeMatch(shape, board, vertex))
            return shape.name
    }

    // Determine position to edges

    let equalsVertex = equals(vertex)

    if (equalsVertex([(board.width - 1) / 2, (board.height - 1) / 2]))
        return 'Tengen'

    let diff = board.getCanonicalVertex(vertex).map(x => x + 1)

    if (!equals(diff)([4, 4]) && board.getHandicapPlacement(9).some(equalsVertex))
        return 'Hoshi'

    if (diff[1] <= 6)
        return diff.join('-') + ' point'

    return null
}
