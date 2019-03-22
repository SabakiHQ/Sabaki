# Board

The `Board` module consists of a single class, which represents the current state of the game board. To access this module use:

~~~js
const {Board} = sabaki.modules
~~~

## Constructor

### new Board([width, height])

* `width` `<Integer>` *(optional)* - Default: `19`
* `height` `<Integer>` *(optional)* - Default: `19`

## Properties

### board.captures

An array consisting of the capture counts of the players. The value at index `0` represent the black player, while the value at index `1` represent the white player.

### board.markers

### board.lines

An array consisting of line and arrow information. Each line or arrow is represented by an array of length three

~~~js
{v1, v2, type}
~~~

where `v1` is the start [vertex](vertex.md), `v2` the end [vertex](vertex.md), and `type` either `'arrow'`, or `'line'`.

## Methods

### board.get(vertex)

* `vertex` [`<Vertex>`](vertex.md)

Returns a [sign](sign.md).

### board.set(vertex, sign)

* `vertex` [`<Vertex>`](vertex.md)
* `sign` [`<Sign>`](sign.md)

### board.clone()

Returns a positional clone of the current board, meaning the clone will retain the board arrangement and capture count, but not markups or lines.

### board.hasVertex(vertex)

* `vertex` [`<Vertex>`](vertex.md)

### board.clear()

### board.isSquare()

### board.isEmpty()

### board.getDistance(v, w)

* `v` [`<Vertex>`](vertex.md)
* `w` [`<Vertex>`](vertex.md)

Returns the Manhattan distance between `v` and `w`.

### board.getNeighbors(vertex)

* `vertex` [`<Vertex>`](vertex.md)

### board.getChain(vertex)

* `vertex` [`<Vertex>`](vertex.md)

### board.getLiberties(vertex)

* `vertex` [`<Vertex>`](vertex.md)

Returns an array of [vertices](vertex.md) that correspond to liberties of the chain of the given `vertex`.

### board.hasLiberties(vertex)

* `vertex` [`<Vertex>`](vertex.md)

This is functionally equivalent to

~~~js
board.getLiberties(vertex).length !== 0
~~~

but is faster.

### board.getRelatedChains(vertex)

* `vertex` [`<Vertex>`](vertex.md)

### board.getScore(areaMap[, options])

* `areaMap` - A precomputed area map or area estimate map using `board.getAreaMap()` or `board.getAreaEstimateMap()`
* `options` `<Object>` *(optional)*
    * `handicap` `<Integer>` - Default: `0`
    * `komi` `<Number>` - Default: `0`

Returns an object with the following keys:

* `area` `<Integer[]>`
* `territory` `<Integer[]>`
* `captures` `<Integer[]>`

The first index of the arrays denote the points of the black player, the second index denote those of the white player.

### board.vertex2coord(vertex)

* `vertex` [`<Vertex>`](vertex.md)

Turns the given `vertex` into a human readable format, i.e. `A1`.

### board.coord2vertex(coord)

* `coord` `<String>`

Turns a human readable coordinate string `coord` into a [vertex](vertex.md).

### board.isValid()

Returns whether the board has chains with no liberties.

### board.makeMove(sign, vertex)

* `sign` [`<Sign>`](sign.md)
* `vertex` [`<Vertex>`](vertex.md)

Creates a new `Board` object that represent the board arrangement when the player that corresponds to `sign` plays a stone at given `vertex`.

Positive `sign` corresponds to the black player, while negative `sign` corresponds to the white player. This will return a positional clone of current board if `vertex` is not on the board or `sign` is `0`.

### board.getHandicapPlacement(count)

* `count` `<Integer>`

### board.generateAscii()

### board.getPositionHash()

### board.getHash()
