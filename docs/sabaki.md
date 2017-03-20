Integer# Sabaki Object

`sabaki` is a global object, giving users access to the Sabaki API.

## Events

To listen to events, use the [`EventEmitter`](https://nodejs.org/api/events.html#events_class_eventemitter) `sabaki.events` like this:

~~~js
sabaki.events.on('preparation-complete', () => {
    console.log('Preparation complete!')
})
~~~

### Event: 'preparation-complete'

The `preparation-complete` event is emitted after the page is ready, Sabaki has loaded all settings, and all components are ready to use.

### Event: 'navigating'

* `tree` [`<GameTree>`](gametree.md)
* `index` `<Integer>`

The `navigating` event is triggered when Sabaki is about to load the game tree position at `index` in `tree`.

### Event: 'navigated'

The `navigated` event is emitted when Sabaki has finished loading a game tree position.

### Event: 'move-made'

The `move-made` event is emitted after a move has been played, either a stone has been placed or a pass has been made.

### Event: 'resigned'

* `player` `<Integer>`

The `resigned` event is triggered after someone resigns. `player` is `1` if black resigns, otherwise `-1`.

### Event: 'tool-used'

* `tool` `<String>`

The `tool-used` event is triggered after the user used `tool` by clicking on the board in edit mode. `tool` can be one of the following: `stone_1`, `stone_-1`, `cross`, `triangle`, `square`, `circle`, `line`, `arrow`, `label`, `number`.

### Event: 'commenttext-updated'

The `commenttext-updated` event is emitted when Sabaki tries to update the comment text or title on the current node.

### Event: 'gameinfo-updated'

The `gameinfo-updated` event is triggered when the user updates the data in the game info drawer.

### Event: 'sgf-loaded'

The `sgf-loaded` event is triggered when Sabaki finishes loading some SGF.

## Methods

### File Management

#### sabaki.newFile([showInfo[, dontAsk]])

* `showInfo` `<Boolean>` - Default: `false`
* `dontAsk` `<Boolean>` - Default: `false`

Resets file name, returns to play mode, and replaces current file with an empty file. Set `showInfo` to `true` if you want the 'Game Info' drawer to show afterwards.

If there's a modified file opened, Sabaki will ask the user to save the file first depending whether `dontAsk` is `false`. Set `dontAsk` to `true` to supress this question.

#### sabaki.loadFile([filename[, dontAsk[, callback]]])

* `filename` `<String>`
* `dontAsk` `<Boolean>` - Default: `false`
* `callback` `<Function>`

Resets file name, returns to play mode, and replaces current file with the file specified in `filename`. If `filename` is not set, Sabaki will show an open file dialog. On the web version, `filename` is ignored and treated as if not set.

If there's a modified file opened, Sabaki will ask the user to save the file first depending whether `dontAsk` is `false`. Set `dontAsk` to `true` to supress this question.

#### sabaki.loadFileFromSgf(sgf[, dontAsk[, ignoreEncoding[, callback]]])

* `sgf` `<String>`
* `dontAsk` `<Boolean>` - Default: `false`
* `ignoreEncoding` `<Boolean>` - Default: `false`
* `callback` `<Function>`

Returns to play mode and replaces current file with the SGF specified in `sgf`. If `ignoreEncoding` is set to `true`, Sabaki will ignore the `CA` property.

If there's a modified file opened, Sabaki will ask the user to save the file first depending whether `dontAsk` is `false`. Set `dontAsk` to `true` to supress this question.

#### sabaki.saveFile([filename])

* `filename` `<String>`

Saves current file in given `filename`. If `filename` is not set, Sabaki will show a save file dialog. On the web version `filename` is ignored and treated as if not set.

#### sabaki.saveFileToSgf()

Returns the SGF of the current file as a string.

#### sabaki.askForSave()

If there's a modified file opened, Sabaki will ask the user to save the file first or to cancel the action. Returns `true` if the user saved the file or wants to proceed without saving, and `false` if the user wants to cancel the action.

### Playing

#### sabaki.vertexClick(vertex[, buttonIndex[, ctrlKey[, position]]])

* `vertex` [`<Vertex>`](vertex.md) or `<String>`
* `buttonIndex` `<Integer>` - Default: `0`
* `ctrlKey` `<Boolean>` - Default: `false`
* `position` `<Integer[]>` - Default: `null`

Performs a click on the given vertex position on the board with given button index, whether the control key is pressed, and the mouse position. The mouse position is only needed for showing context menus.

#### sabaki.makeMove(vertex)

* `vertex` [`<Vertex>`](vertex.md) or `<String>`

Makes a proper move on the given vertex on the current board as the current player. If `vertex` is occupied, the game tree doesn't change. If `vertex` is not on the board, Sabaki will make a pass instead.

Depending on the settings, Sabaki may notify the user about ko and suicide, plays a sound, or/and sends a command to the attached GTP engine.

#### sabaki.makeResign()

Updates game information that the current player has resigned and shows the game info drawer for the user.

#### sabaki.useTool(vertex[, tool[, buttonIndex]])

* `vertex` [`<Vertex>`](vertex.md) or `<String>`
* `tool` `<String>` - One of `stone_1`, `stone_-1`, `cross`, `triangle`, `square`, `circle`, `line`, `arrow`, `label`, `number`. Default is currently selected tool.
* `buttonIndex` `<Integer>` - Default: `0`

### Updating User Interface

#### sabaki.updateSidebar()

#### sabaki.updateGraph()

#### sabaki.updateSlider()

#### sabaki.updateCommentText()

#### sabaki.centerGraphCameraAt(node)

* `node` [`<GameTreeNode>`](gametree.md)

### Navigation

#### sabaki.goBack()
#### sabaki.goForward()
#### sabaki.goMoveNumber(number)

* `number` `<Integer>`

#### sabaki.goToNextFork()
#### sabaki.goToPreviousFork()
#### sabaki.goToComment(step)

* `step` `<Integer>`

#### sabaki.goToBeginning()
#### sabaki.goToEnd()
#### sabaki.goToNextVariation()
#### sabaki.goToPreviousVariation()
#### sabaki.goToMainVariation()

#### sabaki.findPosition(step, condition[, callback])

* `step` `<Integer>`
* `condition` `<Function>`
* `callback` `<Function>`

#### sabaki.findHotspot(step[, callback])

* `step` `<Integer>`
* `callback` `<Function>`

#### sabaki.findMove(vertex, text, step[, callback])

* `vertex` [`<Vertex>`](vertex.md)
* `text` `<String>`
* `step` `<Integer>`
* `callback` `<Function>`
