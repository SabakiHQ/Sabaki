# Board Matcher

The `boardmatcher` module provides methods to determine whether a given board position matches a certain pattern. To access this module use:

~~~js
const {boardmatcher} = sabaki.modules
~~~

## Methods

### boardmatcher.getSymmetries(vertex)

* `vertex` [`<Vertex>`](vertex.md)

Let `vertex == [x, y]`. This method returns an array of [vertices](vertex.md):

~~~js
[[x, y], [-x, y], [x, -y], [-x, -y], [y, x], [-y, x], [y, -x], [-y, -x]]
~~~

### boardmatcher.getBoardSymmetries(board, vertex)

* `board` [`<Board>`](board.md)
* `vertex` [`<Vertex>`](vertex.md)

Returns an array like in `boardmatcher.getSymmetries(vertex)`, except that values are turned into valid board vertices where negative values wrap around the board.

### boardmatcher.readShapes(filename)

* `filename` `<String>`

Returns an array of [shapes](goshape.md) included in the given SGF file. The SGF file should have a specific structure. On the web version, `filename` is ignored.

### boardmatcher.cornerMatch(points, board)

* `vertices` [`<SignedVertex[]>`](vertex.md)
* `board` [`<Board>`](board.md)

Tries to match the given signed `vertices` to `board` with regard to their distances to the board border. Returns `null` if no match is found, otherwise an array `[symmetryClass, invert]` where `symmetryClass` is an integer from `0` to `7` representing the symmetry class found on `board`, and a boolean `invert` whether the position on `board` is inverted or not.

### boardmatcher.shapeMatch(shape, board, vertex)

* `shape` [`<GoShape>`](goshape.md)
* `board` [`<Board>`](board.md)
* `vertex` [`<Vertex>`](vertex.md)

Tries to match the given `shape` to `board`, where given `vertex` is part of the shape anchors. Returns `null` if no match is found, otherwise an array `[symmetryClass, invert]` where `symmetryClass` is an integer from `0` to `7` representing the symmetry class found on `board`, and a boolean `invert` whether the position on `board` is inverted or not.

### boardmatcher.getMoveInterpretation(board, vertex[, options])

* `board` [`<Board>`](board.md)
* `vertex` [`<Vertex>`](vertex.md)
* `options` `<Object>` *(optional)*
    * `shapes` [`<GoShape[]>`](goshape.md) *(optional)*

Returns a string that describes the move at `vertex` on `board` using the given list of `shapes`.
