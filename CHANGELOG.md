# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased][unreleased]

**Added**
* Add 'Clear All Overlays' menu item
* Ask for saving file when closing a changed game
* Confirm remove node

**Changed**
* Alpha and number tools use up lower, unused symbols before using higher symbols
* When opening Sabaki with a big file, the main window will show before loading file

## [Sabaki v0.4.2][v0.4.2] (2015-08-28)

**Added**
* Add keyboard shortcut for 'Remove Node'
* Hovering over coordinates in a comment will show the corresponding position on the board

**Fixed**
* Avoid initial collision of fuzzily placed stones
* Mouse wheel navigation works when pointing at the game graph
* Fix slider arrow not being at the right place sometimes

**Changed**
* Update to Electron v0.31.1

## [Sabaki v0.4.1][v0.4.1] (2015-08-28)

**Added**
* Resizable comment view

**Changed**
* Change name to Sabaki

## [Goban v0.4.0][v0.4.0] (2015-08-24)

**Added**
* Comment view

**Fixed**
* Fix a bug where saving games with comments could lead to unescaped characters

**Changed**
* Update to Electron v0.31.0

## [Goban v0.3.7][v0.3.7] (2015-08-16)

**Fixed**
* Fix wrong cross symbol on Windows 10
* Fix a bug where current game track is not correctly highlighted in the graph
* Fix a bug where stone sounds are not played immediately
* Fix graph performance issues

**Changed**
* Update to Electron v0.30.4

## [Goban v0.3.6][v0.3.6] (2015-08-07)

**Added**
* Highlight current game track in graph

**Fixed**
* Fix uncaught exception when playing in pruned subgraphs again
* Faster click response when playing in large graphs

## [Goban v0.3.5][v0.3.5] (2015-08-04)

**Added**
* Show taskbar progress when loading large SGF files
* Color-code collapsed subgraphs
* Color-code commented nodes
* Automatically expand collapsed subgraphs

**Fixed**
* Fix uncaught exception when playing in pruned subgraphs
* Fix a bug where the slider won't update when playing in pruned subgraphs
* Fix a bug where label tooltips are not removed

## [Goban v0.3.4][v0.3.4] (2015-08-01)

**Added**
* Check for updates at startup

**Changed**
* Collapse game graph for performance
* Update to Electron v0.30.2

## [Goban v0.3.3][v0.3.3] (2015-07-29)

**Added**
* Ability to load a game by dropping file onto the board
* Show error message when file is unreadable
* Warn user about suicide moves
* Play capture sounds when making suicide moves

**Fixed**
* Fix a bug where the game graph is not updated when adding/removing stones manually
* Fix weird graph camera behavior

## [Goban v0.3.2][v0.3.2] (2015-07-24)

**Added**
* Add move count indicator next to slider

**Fixed**
* Fix uncaught exception when saving SGF file
* Fix a bug where the graph camera is not positioned correctly when opening sidebar

**Changed**
* Faster slider response
* Update to Electron v0.30.1

## [Goban v0.3.0][v0.3.0] (2015-07-22)

**Added**
* Add slider
* Add navigation to sibling variations

**Fixed**
* Prevent accidentally clicking on the board when dragging graph
* Fix a bug where removed variations show up on the board

**Changed**
* Improve camera panning of the game graph

## [Goban v0.2.2][v0.2.2] (2015-07-16)

**Added**
* Game graph
* Resizable sidebar
* Detect and notify user about ko
* Ability to remove SGF nodes

**Fixed**
* Fix an error where updating the score of a drawed game, the SGF result will not be correct
* Fix sudden disappearances of the game graph when dragged
* Fix unresponsiveness when clicking on a vertex on the game graph

**Changed**
* Update to Electron v0.30.0

## Goban v0.1.0 (2015-06-20)

First release

[unreleased]: https://github.com/yishn/Sabaki/compare/v0.4.2...master
[v0.4.2]: https://github.com/yishn/Sabaki/compare/v0.4.1...v0.4.2
[v0.4.1]: https://github.com/yishn/Sabaki/compare/v0.4.0...v0.4.1
[v0.4.0]: https://github.com/yishn/Sabaki/compare/v0.3.7...v0.4.0
[v0.3.7]: https://github.com/yishn/Sabaki/compare/v0.3.6...v0.3.7
[v0.3.6]: https://github.com/yishn/Sabaki/compare/v0.3.5...v0.3.6
[v0.3.5]: https://github.com/yishn/Sabaki/compare/v0.3.4...v0.3.5
[v0.3.4]: https://github.com/yishn/Sabaki/compare/v0.3.3...v0.3.4
[v0.3.3]: https://github.com/yishn/Sabaki/compare/v0.3.2...v0.3.3
[v0.3.2]: https://github.com/yishn/Sabaki/compare/v0.3.0...v0.3.2
[v0.3.0]: https://github.com/yishn/Sabaki/compare/v0.2.2...v0.3.0
[v0.2.2]: https://github.com/yishn/Sabaki/compare/v0.1.0...v0.2.2
