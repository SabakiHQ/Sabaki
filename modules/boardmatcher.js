const {sgf} = require('./fileformats')
const helper = require('./helper')

exports.shapes = null

exports.readShapes = function(filename) {
    let tree = sgf.parseFile(filename)[0]
    let result = []

    for (let i = 0; i < tree.subtrees.length; i++) {
        let node = tree.subtrees[i].nodes[0]
        let points = ('AB' in node ? node.AB.map(x => [...sgf.point2vertex(x), 1]) : [])
            .concat('AW' in node ? node.AW.map(x => [...sgf.point2vertex(x), -1]) : [])
        let data = {}

        if ('CR' in node) {
            for (let value of node.CR) {
                let vs = sgf.compressed2list(value)

                for (let v of vs) {
                    if (!points.some(w => helper.vertexEquals(w, v)))
                        points.push([...v, 0])
                }
            }
        }

        if ('C' in node) {
            for (let [key, value] of node.C[0].trim().split(', ').map(x => x.split(': '))) {
                data[key] = value
            }
        }

        result.push(Object.assign({
            name: node.N[0],
            points,
            candidates: node.AB.map(sgf.point2vertex)
        }, data))
    }

    return result
}

exports.cornerMatch = function(points, target) {
    let hypotheses = [...Array(8)].map(x => true)
    let hypothesesInvert = [...Array(8)].map(x => true)

    for (let [x, y, sign] of points) {
        let representatives = target.getSymmetries([x, y])

        for (let i = 0; i < hypotheses.length; i++) {
            if (hypotheses[i] && target.get(representatives[i]) !== sign)
                hypotheses[i] = false
            if (hypothesesInvert[i] && target.get(representatives[i]) !== -sign)
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

    let corner = 'type' in shape && shape.type === 'corner'

    for (let anchor of shape.candidates) {
        let hypotheses = Array(8).fill(true)
        let i = 0

        // Hypothesize vertex === anchor

        if (corner && board.getSymmetries(anchor).every(v => !helper.vertexEquals(v, vertex)))
            continue

        for (let j = 0; j < shape.points.length; j++) {
            let v = shape.points[j].slice(0, 2), s = shape.points[j][2]
            let diff = [v[0] - anchor[0], v[1] - anchor[1]]
            let symm = helper.getSymmetries(diff)

            for (let k = 0; k < symm.length; k++) {
                if (!hypotheses[k]) continue
                let w = [vertex[0] + symm[k][0], vertex[1] + symm[k][1]]

                if (!board.hasVertex(w) || board.get(w) !== s * sign)
                    hypotheses[k] = false
            }

            i = hypotheses.indexOf(true)
            if (i < 0) break
        }

        if (i >= 0) return [i, sign < 0]
    }

    return null
}

exports.getMoveInterpretation = function(board, vertex, {shapes = null} = {}) {
    if (!board.hasVertex(vertex)) return 'Pass'

    if (shapes == null) {
        if (exports.shapes == null) {
            exports.shapes = exports.readShapes(`${__dirname}/../data/shapes.sgf`)
        }

        shapes = exports.shapes
    }

    let sign = board.get(vertex)
    let neighbors = board.getNeighbors(vertex)

    // Check atari

    if (neighbors.some(v => board.get(v) === -sign && board.getLiberties(v).length === 1))
        return 'Atari'

    // Check connection

    let friendly = neighbors.filter(v => board.get(v) === sign)
    if (friendly.length === neighbors.length) return 'Fill'
    if (friendly.length >= 2) return 'Connect'

    // Match shape

    for (let shape of shapes) {
        if ('size' in shape && (board.width !== board.height || board.width !== +shape.size))
            continue

        if (exports.shapeMatch(shape, board, vertex))
            return shape.name
    }

    if (friendly.length === 1) return 'Stretch'

    // Determine position to edges

    if (helper.vertexEquals(vertex, [(board.width - 1) / 2, (board.height - 1) / 2]))
        return 'Tengen'

    let diff = board.getCanonicalVertex(vertex).map(x => x + 1)

    if (!helper.vertexEquals(diff, [4, 4]) && board.getHandicapPlacement(9).some(v => helper.vertexEquals(v, vertex)))
        return 'Hoshi'

    if (diff[1] <= 6)
        return diff.join('-') + ' point'

    return null
}
