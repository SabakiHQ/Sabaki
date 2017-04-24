# Sound

The `sound` module provides methods to play Go related sounds. To access this module use:

~~~js
const {sound} = sabaki.modules
~~~

## sound.playPachi([delay])

* `delay` `<Integer>` *(optional)* - Default: `0`

Plays the sound of placing a Go stone on the board.

## sound.playCapture([delay])

* `delay` `<Integer>` *(optional)* - Default: `0`

Plays the sound of a Go stone dropping in a bowl lid.

## sound.playPass([delay])

* `delay` `<Integer>` *(optional)* - Default: `0`

Plays the sound of closing the lid of a bowl.

## sound.playNewGame([delay])

* `delay` `<Integer>` *(optional)* - Default: `0`

Plays the sound of Go stones pouring back in the bowl.
