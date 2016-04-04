# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased][unreleased]

**Fixed**

* Fix missing WebGL libraries in Windows

**Changed**

* Faster startup
* Update to Electron v0.37.4

## [Sabaki v0.11.2][v0.11.2] (2016-04-01)

**Added**

* Guess mode
* Load SGF files from clipboard
* Copy SGF files to clipboard

**Changed**

* Show game result when at the end of main variation
* Update to Electron v0.37.3

## [Sabaki v0.11.1][v0.11.1] (2016-03-05)

**Added**

* SGF-compatible line and arrow markup
* Filter in 'Manage Games'
* More game info fields

**Changed**

* Update to Electron v0.36.10

## [Sabaki v0.11.0][v0.11.0] (2016-03-03)

**Added**

* Add opening data
* Add 'Go To Main Variation' menu item
* Supports SGF collections

**Changed**

* Smaller font size for larger board labels

**Fixed**

* Fix regression where saving SGF files does nothing
* Fix graph not updating when undoing
* Dragging slider outside window won't cause it to stop anymore

## [Sabaki v0.10.1][v0.10.1] (2016-02-27)

**Fixed**

* Fix regression where saving SGF files results in an exception
* Editing node title doesn't put cursor at the very end

## [Sabaki v0.10.0][v0.10.0] (2016-02-27)

**Added**

* Show SGF node name (`N` property) if available
* Show node & move annotations
* Add 'Go To Next/Previous Comment' menu items

**Changed**

* Change 'Bookmark' to 'Hotspot'
* 'Show Variations' shows next move as well
* Don't make current variation to main variation when saving
* Update to Electron v0.36.9

**Fixed**

* Fix incorrectly escaped `>` character in comment
* Prevent user from sliding out of viewport by selecting text

## [Sabaki v0.9.1][v0.9.1] (2016-02-24)

**Added**

* Add Mac OS X release
* Add bookmark indicator
* Ability to save into existing file
* Show basic move interpretation when no comment is provided

**Changed**

* Speed up SGF parsing
* Speed up scoring
* Show passes as squares in game graph
* Changed some menu shortcuts
* Bump electron@v0.36.8
* Bump gemini-scrollbar@v1.3.2
* Bump octicons@v3.5.0
* Bump sigma@v1.1.0

**Fixed**

* Fix regression when passing results in an uncatched exception sometimes
* Fix not being able to hide the indicator in find mode
* Clicking when busy does not have an effect now

## [Sabaki v0.8.1][v0.8.1] (2016-02-12)

**Added**

* Find menu
* Ability to find in comments
* Create bookmarks and jump to them

**Changed**

* Clicking on the player indicator results in a pass
* Enter scoring mode after two consecutive passes are created
* Change behavior of find buttons

**Fixed**

* Saving a game does not trigger 'File changed' flag
* Fix regression where a new variation is created when move already exists
* Fix regression where the slider doesn't jump when clicked

## [Sabaki v0.7.6][v0.7.6] (2016-01-30)

**Added**

* Autoscroll games

**Fixed**

* Fix weird `box-shadow` on stone overlays
* Fix not updating game graph sometimes when undoing
* Fix regression where a new variation is created when variation already exists
* Fix loading games with no player names not replacing old names
* Fix weird menu behavior

**Changed**

* Scale icons proportionally so they don't look weird
* Styled checkboxes
* Don't mark stones as dead in friendly territory
* Ability to directly enter engine path when adding an engine
* Detach engine before unloading
* More crisp SVG icons
* New slider design
* Update to Electron v0.36.7
* Update to Mootools v1.6.0

## [Sabaki v0.7.1][v0.7.1] (2015-12-31)

**Added**
* Find move
* Fullscreen mode
* Add GTP engines support
* Add preferences panel
* Undo 'Remove Node' and 'Clear All Overlays'
* Click current stone to remove node
* Ability to turn off 'Remove Node' warning

**Changed**
* More responsive game graph
* Touch-friendly slider
* Fix duplicate Taskbar icon in Windows
* Fix overlays being off-center
* Window has an icon in Linux

**Fixed**
* More crisp bar icons
* Fix engines not showing in preferences when removed but not saved
* Fix certain actions failing in scoring mode
* Update to Electron v0.36.2

## [Sabaki v0.5.0][v0.5.0] (2015-09-03)

**Added**
* Add 'Clear All Overlays' menu item
* Ask for saving file when closing a changed game
* Confirm remove node
* Add comment editing to edit mode
* Add Linux release

**Fixed**
* Always use system font
* Fix weird rendering artifacts
* Prevent new windows when Ctrl-clicking links

**Changed**
* Alpha and number tools use up lower, unused symbols before using higher symbols
* When opening Sabaki with a big file, the main window will show before loading file
* Update to Electron v0.31.2

## [Sabaki v0.4.2][v0.4.2] (2015-08-28)

**Added**
* Resizable comment view
* Comment view
* Add keyboard shortcut for 'Remove Node'
* Hovering over coordinates in a comment will show the corresponding position on the board

**Fixed**
* Avoid initial collision of fuzzily placed stones
* Mouse wheel navigation works when pointing at the game graph
* Fix slider arrow not being at the right place sometimes
* Fix a bug where saving games with comments could lead to unescaped characters

**Changed**
* Update to Electron v0.31.1
* Change name to Sabaki

## [Goban v0.3.7][v0.3.7] (2015-08-16)

**Added**
* Highlight current game track in graph

**Fixed**
* Fix wrong cross symbol on Windows 10
* Fix a bug where current game track is not correctly highlighted in the graph
* Fix a bug where stone sounds are not played immediately
* Fix graph performance issues
* Fix uncaught exception when playing in pruned subgraphs again
* Faster click response when playing in large graphs

**Changed**
* Update to Electron v0.30.4

## [Goban v0.3.5][v0.3.5] (2015-08-04)

**Added**
* Check for updates at startup
* Add move count indicator next to slider
* Ability to load a game by dropping file onto the board
* Show error message when file is unreadable
* Warn user about suicide moves
* Play capture sounds when making suicide moves
* Show taskbar progress when loading large SGF files
* Color-code collapsed subgraphs
* Color-code commented nodes
* Automatically expand collapsed subgraphs

**Fixed**
* Fix uncaught exception when playing in pruned subgraphs
* Fix a bug where the slider won't update when playing in pruned subgraphs
* Fix a bug where label tooltips are not removed
* Fix a bug where the game graph is not updated when adding/removing stones manually
* Fix a bug where the graph camera is not positioned correctly when opening sidebar
* Fix weird graph camera behavior
* Fix uncaught exception when saving SGF file

**Changed**
* Faster slider response
* Collapse game graph for performance
* Update to Electron v0.30.2

## [Goban v0.3.0][v0.3.0] (2015-07-22)

**Added**
* Game graph
* Resizable sidebar
* Detect and notify user about ko
* Ability to remove SGF nodes
* Add slider
* Add navigation to sibling variations

**Fixed**
* Prevent accidentally clicking on the board when dragging graph
* Fix a bug where removed variations show up on the board
* Fix an error where updating the score of a drawed game, the SGF result will not be correct
* Fix sudden disappearances of the game graph when dragged
* Fix unresponsiveness when clicking on a vertex on the game graph

**Changed**
* Improve camera panning of the game graph
* Update to Electron v0.30.0

## Goban v0.1.0 (2015-06-20)

First release

[unreleased]: https://github.com/yishn/Sabaki/compare/v0.11.2...master
[v0.11.2]: https://github.com/yishn/Sabaki/compare/v0.11.1...v0.11.2
[v0.11.1]: https://github.com/yishn/Sabaki/compare/v0.11.0...v0.11.1
[v0.11.0]: https://github.com/yishn/Sabaki/compare/v0.10.1...v0.11.0
[v0.10.1]: https://github.com/yishn/Sabaki/compare/v0.10.0...v0.10.1
[v0.10.0]: https://github.com/yishn/Sabaki/compare/v0.9.1...v0.10.0
[v0.9.1]: https://github.com/yishn/Sabaki/compare/v0.8.1...v0.9.1
[v0.8.1]: https://github.com/yishn/Sabaki/compare/v0.7.6...v0.8.1
[v0.7.6]: https://github.com/yishn/Sabaki/compare/v0.7.1...v0.7.6
[v0.7.1]: https://github.com/yishn/Sabaki/compare/v0.5.0...v0.7.1
[v0.5.0]: https://github.com/yishn/Sabaki/compare/v0.4.2...v0.5.0
[v0.4.2]: https://github.com/yishn/Sabaki/compare/v0.3.7...v0.4.2
[v0.3.7]: https://github.com/yishn/Sabaki/compare/v0.3.6...v0.3.7
[v0.3.6]: https://github.com/yishn/Sabaki/compare/v0.3.5...v0.3.6
[v0.3.5]: https://github.com/yishn/Sabaki/compare/v0.3.0...v0.3.5
[v0.3.0]: https://github.com/yishn/Sabaki/compare/v0.1.0...v0.3.0
