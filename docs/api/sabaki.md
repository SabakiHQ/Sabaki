# Sabaki Object

`sabaki` is a global object, giving users access to the Sabaki API.

## Events

To listen to events, use the [`EventEmitter`](https://nodejs.org/api/events.html#events_class_eventemitter) `sabaki.events` like this:

~~~js
sabaki.events.on('ready', () => {
    console.log('Preparation complete!')
})
~~~

### Event: 'ready'

The `ready` event is emitted after the page is ready, Sabaki has loaded all settings, and all components are ready to use.

### Event: 'modeChange'

The `modeChange` event is emitted after Sabaki changes its mode.

### Event: 'navigate'

The `navigate` event is emitted when Sabaki has finished loading a game tree position.

### Event: 'vertexClick'

* `evt` `<Object>`
    * `vertex` [`<Vertex>`](vertex.md)
    * `options` `<Object>`
        * `button` `<Integer>`
        * `ctrlKey` `<Boolean>`
        * `x` `<Integer>`
        * `y` `<Integer>`

The `vertexClick` event is emitted when the user clicks on the board.

### Event: 'makeMove'

* `evt` `<Object>`
    * `pass` `<Boolean>` - Specifies whether the move was a pass
    * `capture` `<Boolean>` - Specifies whether the move has captured some stones
    * `suicide` `<Boolean>` - Specifies whether the move was a suicide
    * `ko` `<Boolean>` - Specifies whether the move violates the simple ko rule

The `makeMove` event is emitted after a move has been played, either a stone has been placed or a pass has been made.

### Event: 'resign'

* `player` `<Integer>`

The `resign` event is triggered after someone resigns. `player` is `1` if black resigns, otherwise `-1`.

### Event: 'toolUsed'

* `evt` `<Object>`
    * `tool` `<String>`
    * `vertex` [`<Vertex>`](vertex.md)
    * `argument` [`<Vertex>`](vertex.md)

The `toolUsed` event is triggered after the user used `tool` by clicking on `vertex`. `tool` can be one of the following: `'stone_1'`, `'stone_'-1`, `'cross'`, `'triangle'`, `'square'`, `'circle'`, `'line'`, `'arrow'`, `'label'`, `'number'`. If `tool` is `'line'` or `'arrow'`, `argument` is the end vertex. If `tool` is `'label'` or `'number'`, `argument` is the label text.

### Event: 'fileLoad'

The `fileLoad` event is triggered when Sabaki finishes loading some file.

## Methods

### User Interface

#### sabaki.setMode(mode)

* `mode` `<String>` - One of `'play'`, `'edit'`, `'find'`, `'scoring'`, `'estimator'`, `'guess'`, `'autoplay'`

#### sabaki.openDrawer(drawer)

* `drawer` `<String>` - One of `'info'`, `'gamechooser'`, `'cleanmarkup'`, `'score'`, `'preferences'`

The score drawer should only be opened in scoring mode or estimator mode.

#### sabaki.closeDrawer()

### File Management

#### sabaki.getEmptyGameTree()

Returns an empty [game tree](gametree.md) with the default board size, komi, and handicap settings.

#### sabaki.newFile([options])

* `options` `<Object>` *(optional)*
    * `playSound` `<Boolean>` *(optional)* - Default: `false`
    * `showInfo` `<Boolean>` *(optional)* - Default: `false`
    * `suppressAskForSave` `<Boolean>` *(optional)* - Default: `false`

Resets file name, returns to play mode, and replaces current file with an empty file. Set `showInfo` to `true` if you want the 'Game Info' drawer to show afterwards.

If there's a modified file opened, Sabaki will ask the user to save the file first depending whether `suppressAskForSave` is `false`. Set `suppressAskForSave` to `true` to suppress this question.

#### sabaki.loadFile([filename[, options]])

* `filename` `<String>` *(optional)*
* `options` `<Object>` *(optional)*
    * `suppressAskForSave` `<Boolean>` *(optional)* - Default: `false`

Resets file name, returns to play mode, and replaces current file with the file specified in `filename`. If `filename` is not set, Sabaki will show an open file dialog. On the web version, `filename` is ignored and treated as if not set.

If there's a modified file opened, Sabaki will ask the user to save the file first depending whether `suppressAskForSave` is `false`. Set `suppressAskForSave` to `true` to suppress this question.

#### sabaki.loadContent(content, format[, options])

* `content` `<String>`
* `extension` `<String>` - File extension, e.g. `'sgf'`
* `options` `<Object>` *(optional)*
    * `suppressAskForSave` `<Boolean>` *(optional)* - Default: `false`
    * `ignoreEncoding` `<Boolean>` *(optional)* - Default: `false`
    * `callback` `<Function>` *(optional)*

Returns to play mode and parses `content` which replaces current file. Sabaki will automatically detect file format by `extension`. If `extension` is `'sgf'` and `ignoreEncoding` is set to `true`, Sabaki will ignore the `CA` property.

If there's a modified file opened, Sabaki will ask the user to save the file first depending whether `suppressAskForSave` is `false`. Set `suppressAskForSave` to `true` to suppress this question.

#### sabaki.saveFile([filename])

* `filename` `<String>` *(optional)*

Saves current file in given `filename` as SGF. If `filename` is not set, Sabaki will show a save file dialog. On the web version `filename` is ignored and treated as if not set.

#### sabaki.getSGF()

Returns the SGF of the current file as a string.

#### sabaki.askForSave()

If there's a modified file opened, Sabaki will ask the user to save the file first or to cancel the action. Returns `true` if the user saved the file or wants to proceed without saving, and `false` if the user wants to cancel the action.

### Playing

#### sabaki.clickVertex(vertex[, options])

* `vertex` [`<Vertex>`](vertex.md)
* `options` `<Object>` *(optional)*
    * `button` `<Integer>` *(optional)* - Default: `0`
    * `ctrlKey` `<Boolean>` *(optional)* - Default: `false`
    * `x` `<Boolean>` *(optional)* - Default: `0`
    * `y` `<Boolean>` *(optional)* - Default: `0`

Performs a click on the given vertex position on the board with given button index, whether the control key is pressed, and the mouse position. The mouse position is only needed for displaying the context menu.

#### sabaki.makeMove(vertex[, options])

* `vertex` [`<Vertex>`](vertex.md)
* `options` `<Object>` *(optional)*
    * `player` `<Integer>` *(optional)* - One of `-1` or `1`. Default: Current player
    * `clearUndoPoint` `<Boolean>` *(optional)* - Default: `true`

Makes a proper move on the given vertex on the current board as given `player`. If `vertex` is not on the board, Sabaki will make a pass instead.

Depending on the settings, Sabaki may notify the user about ko and suicide, plays a sound, or/and sends a command to the attached GTP engine.

#### sabaki.makeResign()

Updates game information that the current player has resigned and shows the game info drawer for the user.

#### sabaki.useTool(tool, vertex[, argument])

* `tool` `<String>` - One of `'stone_1'`, `'stone_'-1`, `'cross'`, `'triangle'`, `'square'`, `'circle'`, `'line'`, `'arrow'`, `'label'`, `'number'`
* `vertex` [`<Vertex>`](vertex.md)
* `argument`

Uses `tool` to mark the board at `vertex`. If `tool` is `'arrow'` or `'line'`, `argument` has to be set as the second [vertex](vertex.md). Otherwise `argument` is optional. If `tool` is `label`, `argument` can be a string specifying the label text.

### Undo

#### sabaki.setUndoPoint([undoText])

* `undoText` `<String>` *(optional)*

#### sabaki.clearUndoPoint()
#### sabaki.undo()

### Navigation

#### sabaki.setCurrentTreePosition(tree, index)

* `tree` [`<GameTree>`](gametree.md)
* `index` `<Integer>`

Jumps to the position specified by `tree` and `index`.

#### sabaki.goStep(step)

* `step` `<Integer>`

#### sabaki.goToMoveNumber(number)

* `number` `<Integer>`

#### sabaki.goToNextFork()
#### sabaki.goToPreviousFork()
#### sabaki.goToComment(step)

* `step` `<Integer>`

#### sabaki.goToBeginning()
#### sabaki.goToEnd()
#### sabaki.goToSiblingVariation(step)

* `step` `<Integer>`

#### sabaki.goToMainVariation()

### Find Methods

#### sabaki.findPosition(step, condition[, callback])

* `step` `<Integer>`
* `condition` `<Function>`
* `callback` `<Function>` *(optional)*

#### sabaki.findHotspot(step[, callback])

* `step` `<Integer>`
* `callback` `<Function>` *(optional)*

#### sabaki.findMove(step, data[, callback])

* `step` `<Integer>`
* `data` `<Object>`
    * `vertex` [`<Vertex>`](vertex.md) *(optional)*
    * `text` `<String>` *(optional)*
* `callback` `<Function>` *(optional)*

### Node Actions

#### sabaki.getGameInfo(tree)

* `tree` [`<GameTree>`](gametree.md)

Returns an object with the following values:

* `blackName` `<String>`
* `blackRank` `<String>`
* `whiteName` `<String>`
* `whiteRank` `<String>`
* `gameName` `<String>`
* `eventName` `<String>`
* `date` `<String>`
* `result` `<String>`
* `komi` `<Float>`
* `handicap` `<Integer>`
* `size` `<Integer[]>` - An array of two numbers, representing the width and height of the game board

#### sabaki.setGameInfo(tree, data)

* `tree` [`<GameTree>`](gametree.md)
* `data` `<Object>`
    * `blackName` `<String>` *(optional)*
    * `blackRank` `<String>` *(optional)*
    * `whiteName` `<String>` *(optional)*
    * `whiteRank` `<String>` *(optional)*
    * `gameName` `<String>` *(optional)*
    * `eventName` `<String>` *(optional)*
    * `date` `<String>` *(optional)*
    * `result` `<String>` *(optional)*
    * `komi` `<Float>` *(optional)*
    * `handicap` `<Integer>` *(optional)*
    * `size` `<Integer[]>` *(optional)* - An array of two numbers, representing the width and height of the game board

Don't provide keys in `data` to leave corresponding information unchanged in the game tree. Set corresponding keys in `data` to `null` to remove the data from the game tree.

#### sabaki.getPlayer(tree, index)

* `tree` [`<GameTree>`](gametree.md)
* `index` `<Integer>`

Returns a sign corresponding to the player that should be playing at the given tree position.

#### sabaki.setPlayer(tree, index, sign)

* `tree` [`<GameTree>`](gametree.md)
* `index` `<Integer>`
* `sign` `<Integer>`

#### sabaki.setComment(tree, index, data)

* `tree` [`<GameTree>`](gametree.md)
* `index` `<Integer>`
* `data` `<Object>`
    * `title` `<String>` *(optional)*
    * `comment` `<String>` *(optional)*
    * `hotspot` `<Boolean>` *(optional)*
    * `moveAnnotation` `<String>` *(optional)* - One of `'BM'`, `'DO'`, `'IT'`, and `'TE'`
    * `positionAnnotation` `<String>` *(optional)* - One of `'UC'`, `'GW'`, `'GB'`, and `'DM'`

Don't provide keys in `data` to leave corresponding information unchanged in the game tree. Set corresponding keys in `data` to `null` to remove the data from the game tree.

#### sabaki.copyVariation(tree, index)

* `tree` [`<GameTree>`](gametree.md)
* `index` `<Integer>`

#### sabaki.cutVariation(tree, index[, options])

* `tree` [`<GameTree>`](gametree.md)
* `index` `<Integer>`
* `options` `<Object>` *(optional)*
    * `setUndoPoint` `<Boolean>` - Default: `true`

#### sabaki.pasteVariation(tree, index[, options])

* `tree` [`<GameTree>`](gametree.md)
* `index` `<Integer>`
* `options` `<Object>` *(optional)*
    * `setUndoPoint` `<Boolean>` - Default: `true`

#### sabaki.flattenVariation(tree, index[, options])

* `tree` [`<GameTree>`](gametree.md)
* `index` `<Integer>`
* `options` `<Object>` *(optional)*
    * `setUndoPoint` `<Boolean>` - Default: `true`

#### sabaki.makeMainVariation(tree, index[, options])

* `tree` [`<GameTree>`](gametree.md)
* `index` `<Integer>`
* `options` `<Object>` *(optional)*
    * `setUndoPoint` `<Boolean>` - Default: `true`

#### sabaki.shiftVariation(tree, index, step, [, options])

* `tree` [`<GameTree>`](gametree.md)
* `index` `<Integer>`
* `step` `<Integer>`
* `options` `<Object>` *(optional)*
    * `setUndoPoint` `<Boolean>` - Default: `true`

#### sabaki.removeNode(tree, index[, options])

* `tree` [`<GameTree>`](gametree.md)
* `index` `<Integer>`
* `options` `<Object>` *(optional)*
    * `suppressConfirmation` `<Boolean>` - Default: `false`
    * `setUndoPoint` `<Boolean>` - Default: `true`

#### sabaki.removeOtherVariations(tree, index[, options])

* `tree` [`<GameTree>`](gametree.md)
* `index` `<Integer>`
* `options` `<Object>` *(optional)*
    * `suppressConfirmation` `<Boolean>` - Default: `false`
    * `setUndoPoint` `<Boolean>` - Default: `true`
