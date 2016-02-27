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
        var name = node.N[0]
        var area = node.CR.map(function(x) { return sgf.point2vertex(x) })
        var anchor = [3, 3]

        var calculateDiff = function(xs) {
            var vs = xs.map(sgf.point2vertex)
            var result = []

            for (var j = 0; j < vs.length; j++) {
                var anchor = vs[j]
                var diffs = []

                for (var k = 0; k < vs.length; k++) {
                    if (k == j) continue
                    diffs.push([vs[k][0] - anchor[0], vs[k][1] - anchor[1]])
                }

                result.push(diffs)
            }

            return result
        }

        result.push({
            name: name,
            area: area,
            "1": 'AB' in node ? calculateDiff(node.AB) : [],
            "-1": 'AW' in node ? calculateDiff(node.AW) : []
        })
    }

    return result
}

}).call(null, typeof module != 'undefined' ? module : window)
