(function(root) {

var sgf = root.sgf
var helper = root.helper

if (typeof require != 'undefined') {
    sgf = require('./sgf')
    helper = require('./helper')
}

var context = typeof module != 'undefined' ? module.exports : (window.shapes = {})

context.readFuseki = function(filename) {
    var tree = sgf.parseFile(filename).subtrees[0]
    var result = []

    for (var i = 0; i < tree.subtrees.length; i++) {
        var node = sgf.addBoard(tree.subtrees[i], 0).nodes[0]

        result.push({
            name: node.N[0],
            area: sgf.compressed2list(node.CR[0]),
            board: node.board
        })
    }

    return result
}

context.readShapes = function(filename) {
    var tree = sgf.parseFile(filename).subtrees[0]
    var result = []

    for (var i = 0; i < tree.subtrees.length; i++) {
        var node = tree.subtrees[i].nodes[0]
        var points = ('AB' in node ? node.AB.map(function(x) { return sgf.point2vertex(x).concat([1]) }) : [])
            .concat('AW' in node ? node.AW.map(function(x) { return sgf.point2vertex(x).concat([-1]) }) : [])
            .concat('CR' in node ? node.CR.map(function(x) { return sgf.point2vertex(x).concat([0]) }) : [])

        result.push({
            name: node.N[0],
            points: points,
            candidates: node.AB.map(sgf.point2vertex)
        })
    }

    return result
}

context.cornerMatch = function(area, source, target) {
    var hypotheses = Array.apply(null, new Array(8)).map(function() { return true })
    var hypothesesInvert = Array.apply(null, new Array(8)).map(function() { return true })

    area.sort(function(v, w) {
        return Math.abs(source.arrangement[w]) - Math.abs(source.arrangement[v])
    })

    for (var j = 0; j < area.length; j++) {
        var vertex = area[j]
        var sign = source.arrangement[vertex]
        var representatives = target.getSymmetries(vertex)

        for (var i = 0; i < hypotheses.length; i++) {
            if (!hypotheses[i] && !hypothesesInvert[i])
                continue
            if (target.arrangement[representatives[i]] != sign)
                hypotheses[i] = false
            if (target.arrangement[representatives[i]] != -sign)
                hypothesesInvert[i] = false
        }

        if (hypotheses.indexOf(true) < 0 && hypothesesInvert.indexOf(true) < 0)
            return null
    }

    var i = hypotheses.concat(hypothesesInvert).indexOf(true)
    return i < 8 ? [i, false] : [i - 8, true]
}

context.shapeMatch = function(shape, board, vertex) {
    if (!board.hasVertex(vertex)) return false
    var sign = board.arrangement[vertex]
    if (sign == 0) return false

    for (var i = 0; i < shape.candidates.length; i++) {
        var anchor = shape.candidates[i]
        var hypotheses = Array.apply(null, new Array(8)).map(function() { return true })

        // Hypothesize vertex == anchor

        for (var j = 0; j < shape.points.length; j++) {
            var v = shape.points[j].slice(0, 2), s = shape.points[j][2]
            var diff = [v[0] - anchor[0], v[1] - anchor[1]]
            var symm = helper.getSymmetries(diff)

            for (var k = 0; k < symm.length; k++) {
                if (!hypotheses[k]) continue
                var w = [vertex[0] + symm[k][0], vertex[1] + symm[k][1]]

                if (board.arrangement[w] != s * sign)
                    hypotheses[k] = false
            }

            if (hypotheses.indexOf(true) < 0) break
        }

        var symm = hypotheses.indexOf(true)
        if (symm >= 0) return [symm, sign]
    }

    return false
}

}).call(null, typeof module != 'undefined' ? module : window)
