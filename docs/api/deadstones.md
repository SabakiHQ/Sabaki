# Dead Stones

The `deadstones` module includes Monte Carlo methods for determining dead stones on a given board position. To access this module use:

~~~js
const {deadstones} = sabaki.modules
~~~

## Methods

### deadstones.guess(board[, scoring[, iterations]])

* `board` [`<Board>`](board.md)
* `scoring` `<Boolean>` *(optional)* - Default: `false`
* `iterations` `<Integer>` *(optional)* - Default: `50`

Returns an array of [vertices](vertex.md) of stones that Sabaki thinks are dead.

### deadstones.getFloatingStones(board)

* `board` [`<Board>`](board.md)

A fast method that returns an array of [vertices](vertex.md) of stones that do not surround more than one point of territory.

### deadstones.playTillEnd(board, sign[, iterations])

* `board` [`<Board>`](board.md)
* `sign` [`<Sign>`](sign.md)
* `iterations` `<Integer>` *(optional)* - Default: `Infinity`

Makes random alternating moves, starting with the player corresponding to `sign`, until `iterations` is reached, or no more moves can be made, and returns the final board. This method doesn't mutate `board`.

### deadstones.getProbabilityMap(board, iterations)

* `board` [`<Board>`](board.md)
* `iterations` `<Integer>`
