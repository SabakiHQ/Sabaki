# Sabaki Object

`sabaki` is a global object, letting users to access the Sabaki API.

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
* `index` `<Number>`

The `navigating` event is triggered when Sabaki is about to load the game tree position at `index` in `tree`.

### Event: 'navigated'

The `navigated` event is emitted when Sabaki has finished loading a game tree position.

### Event: 'move-made'

The `move-made` event is emitted after a move has been played, either a stone has been placed or a pass has been made.

### Event: 'resigned'

* `player` `<Number>`

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

### sabaki.newFile([showInfo[, dontAsk]])

* `showInfo` `<Boolean>` - Default: `false`
* `dontAsk` `<Boolean>` - Default: `false`

Resets file name, returns to play mode, and replaces current file with an empty file. Set `showInfo` to `true` if you want the 'Game Info' drawer to show afterwards.

If there's a modified file opened, Sabaki will ask the user to save the file first depending whether `dontAsk` is `false`. Set `dontAsk` to `true` to supress this question.

### sabaki.loadFile([filename[, dontAsk[, callback]]])

* `filename` `<String>`
* `dontAsk` `<Boolean>` - Default: `false`
* `callback` `<Function>`

Resets file name, returns to play mode, and replaces current file with the file specified in `filename`. If `filename` is not set, Sabaki will show a open file dialog. On the web version, `filename` is ignored and treated as if not set.

If there's a modified file opened, Sabaki will ask the user to save the file first depending whether `dontAsk` is `false`. Set `dontAsk` to `true` to supress this question.

### sabaki.loadFileFromSgf(sgf[, dontAsk[, ignoreEncoding[, callback]]])

* `sgf` `<String>`
* `dontAsk` `<Boolean>` - Default: `false`
* `ignoreEncoding` `<Boolean>` - Default: `false`
* `callback` `<Function>`

Returns to play mode and replaces current file with the SGF specified in `sgf`. If `ignoreEncoding` is set to `true`, Sabaki will ignore the `CA` property.

If there's a modified file opened, Sabaki will ask the user to save the file first depending whether `dontAsk` is `false`. Set `dontAsk` to `true` to supress this question.
