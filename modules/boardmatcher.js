const sgf = require('./sgf')
const helper = require('./helper')

exports.readShapes = function(filename) {
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

exports.shapeMatch = function(shape, board, vertex) {
    if (!board.hasVertex(vertex)) return false
    let sign = board.get(vertex)
    if (sign == 0) return false

    for (let anchor of shape.candidates) {
        let hypotheses = [...Array(8)].map(() => true)

        // Hypothesize vertex == anchor

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

    return false
}
