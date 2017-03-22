Integer# Sabaki Object

`sabaki` is a global object, giving users access to the Sabaki API.

## Events

To listen to events, use the [`EventEmitter`](https://nodejs.org/api/events.html#events_class_eventemitter) `sabaki.events` like this:

~~~js
sabaki.events.on('preparation-complete', () => {
    console.log('Preparation complete!')
})
~~~

### Event: 'ready'

The `ready` event is emitted after the page is ready, Sabaki has loaded all settings, and all components are ready to use.

### Event: 'navigating'

* `evt` `<Object>`
    * `tree` [`<GameTree>`](gametree.md)
    * `index` `<Integer>`

The `navigating` event is triggered when Sabaki is about to load the game tree position at `index` in `tree`.

### Event: 'navigated'

The `navigated` event is emitted when Sabaki has finished loading a game tree position.

### Event: 'move-made'

* `evt` `<Object>`
    * `pass` `<Boolean>` - Specifies whether the move was a pass
    * `capture` `<Boolean>` - Specifies whether the move has captured some stones
    * `suicide` `<Boolean>` - Specifies whether the move was a suicide
    * `ko` `<Boolean>` - Specifies whether the move violates the simple ko rule

The `move-made` event is emitted after a move has been played, either a stone has been placed or a pass has been made.

### Event: 'resigned'

* `player` `<Integer>`

The `resigned` event is triggered after someone resigns. `player` is `1` if black resigns, otherwise `-1`.

### Event: 'tool-used'

* `evt` `<Object>`
    * `tool` `<String>`
    * `vertex` [`<Vertex>`](vertex.md)
    * `endVertex` [`<Vertex>`](vertex.md)

The `tool-used` event is triggered after the user used `tool` by clicking on `vertex`. `tool` can be one of the following: `stone_1`, `stone_-1`, `cross`, `triangle`, `square`, `circle`, `line`, `arrow`, `label`, `number`. If `tool` is `line` or `arrow`, `endVertex` is specified as well.

### Event: 'file-loaded'

The `file-loaded` event is triggered when Sabaki finishes loading some file.

## Methods

### File Management

#### sabaki.newFile([options])

* `options` `<Object>` *(optional)*
    * `sound` `<Boolean>` *(optional)* - Default: `false`
    * `showInfo` `<Boolean>` *(optional)* - Default: `false`
    * `suppressAskForSave` `<Boolean>` *(optional)* - Default: `false`

Resets file name, returns to play mode, and replaces current file with an empty file. Set `showInfo` to `true` if you want the 'Game Info' drawer to show afterwards.

If there's a modified file opened, Sabaki will ask the user to save the file first depending whether `suppressAskForSave` is `false`. Set `suppressAskForSave` to `true` to suppress this question.

#### sabaki.loadFile([filename[, options]])

* `filename` `<String>` *(optional)*
* `options` `<Object>` *(optional)*
    * `suppressAskForSave` `<Boolean>` *(optional)* - Default: `false`
    * `callback` `<Function>` *(optional)*

Resets file name, returns to play mode, and replaces current file with the file specified in `filename`. If `filename` is not set, Sabaki will show an open file dialog. On the web version, `filename` is ignored and treated as if not set.

If there's a modified file opened, Sabaki will ask the user to save the file first depending whether `suppressAskForSave` is `false`. Set `suppressAskForSave` to `true` to suppress this question.

#### sabaki.loadContent(content, format[, options])

* `content` `<String>`
* `format` `<String>` - One of `'sgf'`, `'ngf'`, `'gib'`
* `options` `<Object>` *(optional)*
    * `suppressAskForSave` `<Boolean>` *(optional)* - Default: `false`
    * `ignoreEncoding` `<Boolean>` *(optional)* - Default: `false`
    * `callback` `<Function>` *(optional)*

Returns to play mode and parses `content` as `format`, whicch replaces current file. If `format` is `'sgf'` and `ignoreEncoding` is set to `true`, Sabaki will ignore the `CA` property.

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

#### sabaki.makeMove(vertex)

* `vertex` [`<Vertex>`](vertex.md)

Makes a proper move on the given vertex on the current board as the current player. If `vertex` is occupied, the game tree doesn't change. If `vertex` is not on the board, Sabaki will make a pass instead.

Depending on the settings, Sabaki may notify the user about ko and suicide, plays a sound, or/and sends a command to the attached GTP engine.

#### sabaki.makeResign()

Updates game information that the current player has resigned and shows the game info drawer for the user.

#### sabaki.useTool(tool, vertex[, endVertex])

* `tool` `<String>` - One of `'stone_1'`, `'stone_'-1`, `'cross'`, `'triangle'`, `'square'`, `'circle'`, `'line'`, `'arrow'`, `'label'`, `'number'`
* `vertex` [`<Vertex>`](vertex.md)
* `endVertex` [`<Vertex>`](vertex.md) *(optional)*

### Undo

#### sabaki.setUndoPoint([undoText])

* `undoText` `<String>` *(optional)*

#### sabaki.clearUndoPoint()
#### sabaki.undo()

### Navigation

#### sabaki.setCurrentTreePosition(tree, index)

* `tree` [`<GameTree>`](gametree.md)
* `index` `Integer`

Jumps to the position specified by `tree` and `index`.

#### sabaki.goStep(step)

* `step` `<Integer>`

#### sabaki.goMoveNumber(number)

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
