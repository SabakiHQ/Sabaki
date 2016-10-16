# Sabaki Object

## Events

### Event: 'preparation-complete'

The `preparation-complete` event is emitted after the page is ready, Sabaki has loaded all settings, and all components are ready to use.

### Event: 'navigating'

* `tree` [`<GameTree>`](gametree.md)
* `index` `<Number>`

The `navigating` event is triggered when Sabaki is about to load the game tree position at `index` in `tree`.

### Event: 'navigated'

The `navigated` event is emitted when Sabaki has finished loading a game tree position.
