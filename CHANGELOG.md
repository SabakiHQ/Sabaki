# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased][unreleased]

**Added**
* Ability to load game by dropping file onto the board
* Show error message when file is unreadable
* Play capture sounds when making suicide moves

**Fixed**
* Fix a bug where the game graph is not updated when adding/removing stones manually
* Fix weird graph camera behavior

## [Goban v0.3.2][v0.3.2] (2015-07-24)

**Added**
* Add move count indicator next to slider

**Fixed**
* Fix a bug where the graph camera is not positioned correctly when opening sidebar

**Changed**
* Faster slider response
* Update to Electron v0.30.1

## [Goban v0.3.1][v0.3.1] (2015-07-22)

**Fixed**
* Fix uncaught exception when saving SGF file

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
* Ability to remove SGF nodes

**Fixed**
* Fix unresponsiveness when clicking on a vertex on the game graph

**Changed**
* Update to Electron v0.30.0

## [Goban v0.2.1][v0.2.1] (2015-07-13)

**Added**
* Resizable sidebar

**Fixed**
* Fix an error where updating the score of a drawed game, the SGF result will not be correct
* Fix sudden disappearances of the game graph when dragged

## [Goban v0.2.0][v0.2.0] (2015-07-12)

**Added**
* Game graph
* Detect and notify user about ko

**Changed**
* Update to Electron v0.28.3

## Goban v0.1.0 (2015-06-20)

First release

[unreleased]: https://github.com/yishn/Goban/compare/v0.3.2...master
[v0.3.2]: https://github.com/yishn/Goban/compare/v0.3.1...v0.3.2
[v0.3.1]: https://github.com/yishn/Goban/compare/v0.3.0...v0.3.1
[v0.3.0]: https://github.com/yishn/Goban/compare/v0.2.2...v0.3.0
[v0.2.2]: https://github.com/yishn/Goban/compare/v0.2.1...v0.2.2
[v0.2.1]: https://github.com/yishn/Goban/compare/v0.2.0...v0.2.1
[v0.2.0]: https://github.com/yishn/Goban/compare/v0.1.0...v0.2.0
