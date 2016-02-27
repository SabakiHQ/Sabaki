(function(root) {

var sgf = root.sgf

if (typeof require != 'undefined') {
    sgf = require('./sgf')
}

var context = typeof module != 'undefined' ? module.exports : (window.shapes = {})

context.parseFile = function(filename) {
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

context.match = function(shape, board, vertex) {
    var sign = board.arrangement[vertex]

    for (var i = 0; i < shape.candidates.length; i++) {
        var anchor = shape.candidates[i]
        var hypotheses = Array.apply(null, new Array(8)).map(function() { return true })

        // Hypothesize vertex == anchor

        for (var j = 0; j < shape.points.length; j++) {
            var v = shape.points[j].slice(0, 2), s = shape.points[j][2]
            var diff = [v[0] - anchor[0], v[1] - anchor[1]]
            var symm = helper.getSymmetries(diff)

            for (var k = 0; k < symm.length; k++) {
                var w = [vertex[0] + symm[k][0], vertex[1] + symm[k][1]]

                if (board.arrangement[w] != s * sign)
                    hypotheses[k] = false
            }

            if (hypotheses.indexOf(true) < 0) break
        }

        if (hypotheses.indexOf(true) >= 0) return true
    }

    return false
}

}).call(null, typeof module != 'undefined' ? module : window)
