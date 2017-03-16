const sgf = require('./sgf')
const helper = require('./helper')

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
                    if (!points.some(w => w[0] == v[0] && w[1] == v[1]))
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
            if (hypotheses[i] && target.get(representatives[i]) != sign)
                hypotheses[i] = false
            if (hypothesesInvert[i] && target.get(representatives[i]) != -sign)
                hypothesesInvert[i] = false
        }

        if (!hypotheses.includes(true) && !hypothesesInvert.includes(true))
            return null
    }

    let i = [...hypotheses, ...hypothesesInvert].indexOf(true)
    return i < 8 ? [i, false] : [i - 8, true]
}

exports.shapeMatch = function(shape, board, vertex, corner = false) {
    if (!board.hasVertex(vertex)) return null
    let sign = board.get(vertex)
    if (sign == 0) return null

    for (let anchor of shape.candidates) {
        let hypotheses = [...Array(8)].map(() => true)

        // Hypothesize vertex == anchor

        if (corner && board.getSymmetries(anchor).every(([x, y]) => x != vertex[0] || y != vertex[1]))
            continue

        for (let j = 0; j < shape.points.length; j++) {
            let v = shape.points[j].slice(0, 2), s = shape.points[j][2]
            let diff = [v[0] - anchor[0], v[1] - anchor[1]]
            let symm = helper.getSymmetries(diff)

            for (let k = 0; k < symm.length; k++) {
                if (!hypotheses[k]) continue
                let w = [vertex[0] + symm[k][0], vertex[1] + symm[k][1]]

                if (!board.hasVertex(w) || board.get(w) != s * sign)
                    hypotheses[k] = false
            }

            if (!hypotheses.includes(true)) break
        }

        let symm = hypotheses.indexOf(true)
        if (symm >= 0) return [symm, sign]
    }

    return null
}
