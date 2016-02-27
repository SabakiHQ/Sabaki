(function(root) {

var sgf = root.sgf

if (typeof require != 'undefined') {
    sgf = require('./sgf')
}

var context = typeof module != 'undefined' ? module.exports : (window.shapes = {})

context.parseFile = function(filename) {
    var tree = sgf.parseFile(filename).subtrees[0]
    var result = {}

    for (var i = 0; i < tree.subtrees.length; i++) {
        var node = sgf.addBoard(tree.subtrees[i], 0).nodes[0]
        var name = node.N[0]
        var area = node.CR.map(function(x) { return sgf.point2vertex(x) })
        var board = node.board

        result[name] = {
            area: area,
            board: board
        }
    }

    return result
}

}).call(null, typeof module != 'undefined' ? module : window)
