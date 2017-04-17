# Game Tree

The game trees in Sabaki are represented by simple JavaScript objects with the following properties:

* `id` `<Integer>` - A unique id of the tree
* `nodes` `<Object[]>`
* `subtrees` `<GameTree[]>`
* `current` `<Integer>` | `<Null>` - The index of the corresponding subtree that is currently selected or `null` if `subtrees` is empty
* `parent` `<GameTree>` | `<Null>`

The nodes are also simple objects. Their keys correspond to node properties which closely matches the [SGF specification](http://www.red-bean.com/sgf/). Each key has an array of strings as value.

The `gametree` module also provides methods to work with game tree objects. To access this module use:

~~~js
const {gametree} = sabaki.modules
~~~

## Methods

### gametree.new()

Returns a new empty game tree object with a unique id.

### gametree.clone(tree[, parent])

* `tree` `<GameTree>`
* `parent` `<GameTree>` *(optional)* - Default: `null`

Creates a deep copy of the given `tree` and all its subtrees. The parent of the copy will be set to `parent`. The tree copies all have their own unique ids.

### gametree.getRoot(tree)

* `tree` `<GameTree>`

Traverses the given `tree` upwards and returns the ancestor with no parent.

### gametree.getHeight(tree)

* `tree` `<GameTree>`

### gametree.getCurrentHeight(tree)

* `tree` `<GameTree>`

### gametree.getTreesRecursive(tree)

* `tree` `<GameTree>`

Returns an array, consisting of `tree` and all of its descendant trees.

### gametree.getLevel(tree, index)

* `tree` `<GameTree>`
* `index` `<Integer>`

### gametree.getSection(tree, level)

* `tree` `<GameTree>`
* `level` `<Integer>`

### gametree.navigate(tree, index, step)

* `tree` `<GameTree>`
* `index` `<Integer>`
* `step` `<Integer>`

### gametree.makeHorizontalNavigator(tree, index)

* `tree` `<GameTree>`
* `index` `<Integer>`

### gametree.split(tree, index)

* `tree` `<GameTree>`
* `index` `<Integer>`

### gametree.reduce(tree)

* `tree` `<GameTree>`

### gametree.onCurrentTrack(tree)

* `tree` `<GameTree>`

### gametree.onMainTrack(tree)

* `tree` `<GameTree>`

### gametree.getMatrixDict(tree)

* `tree` `<GameTree>`

### gametree.getBoard(tree, index[, baseboard])

* `tree` `<GameTree>`
* `index` `<Integer>`
* `baseboard` [`<Board>`](board.md) *(optional)* - Default: Previous board

Returns a [board object](board.ms) at the given [tree position](treeposition.md) with the assumption that the previous board position is `baseboard`.

### gametree.getJson(tree)

* `tree` `<GameTree>`

### gametree.fromJson(json)

* `json` `<String>`

### gametree.getHash(tree)

* `tree` `<GameTree>`
