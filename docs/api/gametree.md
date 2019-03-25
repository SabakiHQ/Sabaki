# Game Tree

Sabaki uses [@sabaki/immutable-gametree](https://github.com/SabakiHQ/immutable-gametree) as the data type for representing our game trees. They are immutable. Each game tree node has a unique id, also called tree position.

~~~js
const {gametree} = sabaki.modules
~~~

## Methods

### gametree.new()

Returns a new empty game tree that automatically merges nodes that represent the same move.

### gametree.getRootProperty(tree, property[, fallback])

* `tree` `<GameTree>`
* `property` `<String>`
* `fallback` `<String>`

### gametree.getMatrixDict(tree)

* `tree` `<GameTree>`

### gametree.getBoard(tree, treePosition[, baseboard])

* `tree` `<GameTree>`
* `treePosition` [`<TreePosition>`](treeposition.md)
* `baseboard` [`<Board>`](board.md) *(optional)* - Default: Previous board

Returns a [board object](board.md) at the given [tree position](treeposition.md) with the assumption that the previous board position is `baseboard`.

### gametree.getHash(tree)

* `tree` `<GameTree>`
