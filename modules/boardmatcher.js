const sgf = require('./sgf')
const helper = require('./helper')

exports.readShapes = function(filename) {
    let tree = sgf.parseFile(filename).subtrees[0]
    let result = []

    for (let i = 0; i < tree.subtrees.length; i++) {
        let node = tree.subtrees[i].nodes[0]
        let points = ('AB' in node ? node.AB.map(x => sgf.point2vertex(x).concat([1])) : [])
            .concat('AW' in node ? node.AW.map(x => sgf.point2vertex(x).concat([-1])) : [])

        if ('CR' in node) {
            node.CR.forEach(value => {
                let vs = sgf.compressed2list(value)
                vs.forEach(v => {
                    if (!points.some(w => w[0] == v[0] && w[1] == v[1]))
                        points.push(v.concat([0]))
                })
            })
        }

        result.push({
            name: node.N[0],
            points: points,
            candidates: node.AB.map(sgf.point2vertex)
        })
    }

    return result
}

exports.cornerMatch = function(area, source, target) {
    let hypotheses = Array.apply(null, new Array(8)).map(x => true)
    let hypothesesInvert = Array.apply(null, new Array(8)).map(x => true)

    area.sort((v, w) => Math.abs(source.arrangement[w]) - Math.abs(source.arrangement[v]))

    for (let j = 0; j < area.length; j++) {
        let vertex = area[j]
        let sign = source.arrangement[vertex]
        let representatives = target.getSymmetries(vertex)

        for (let i = 0; i < hypotheses.length; i++) {
            if (hypotheses[i] && target.arrangement[representatives[i]] != sign)
                hypotheses[i] = false
            if (hypothesesInvert[i] && target.arrangement[representatives[i]] != -sign)
                hypothesesInvert[i] = false
        }

        if (hypotheses.indexOf(true) < 0 && hypothesesInvert.indexOf(true) < 0)
            return null
    }

    let i = hypotheses.concat(hypothesesInvert).indexOf(true)
    return i < 8 ? [i, false] : [i - 8, true]
}

exports.shapeMatch = function(shape, board, vertex) {
    if (!board.hasVertex(vertex)) return false
    let sign = board.arrangement[vertex]
    if (sign == 0) return false

    for (let i = 0; i < shape.candidates.length; i++) {
        let anchor = shape.candidates[i]
        let hypotheses = Array.apply(null, new Array(8)).map(() => true)

        // Hypothesize vertex == anchor

        for (let j = 0; j < shape.points.length; j++) {
            let v = shape.points[j].slice(0, 2), s = shape.points[j][2]
            let diff = [v[0] - anchor[0], v[1] - anchor[1]]
            let symm = helper.getSymmetries(diff)

            for (let k = 0; k < symm.length; k++) {
                if (!hypotheses[k]) continue
                let w = [vertex[0] + symm[k][0], vertex[1] + symm[k][1]]

                if (board.arrangement[w] != s * sign)
                    hypotheses[k] = false
            }

            if (hypotheses.indexOf(true) < 0) break
        }

        let symm = hypotheses.indexOf(true)
        if (symm >= 0) return [symm, sign]
    }

    return false
}
