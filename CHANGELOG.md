# Changelog

All notable changes to this project will be documented in this file.

## [Sabaki v0.52.1][v0.52.1]

**Fixed**

- "Navigate>Go to Main Variation" now works again
  ([#801](https://github.com/SabakiHQ/Sabaki/issues/801))

## [Sabaki v0.52.0][v0.52.0] (2021-07-05)

**Added**

- Leapfrogged from Electron 8 to Electron 13, which among other performance and
  stability improvements, brings native Apple Silicon (M1) support to Mac builds
- Added support for PandaNet UGF format files
- Added 'Quit' option to File menu (thanks to @HiggsTardigradeTau, #746)
- Add Linux ARM64 build (thanks to @borongyuan #735)
- Support relative paths to engines (thanks to @ebifrier, #698)

**Fixed**

- Comment box was still in edit mode layout, even if disabled (thanks to
  @FanJeldmann, #784)
- Markdown tables would hang edit mode, now tables are correctly rendered (#788)
- Detach all engines when the window is closed (thanks to @ebifrier, #700)
- Analysis variation replay was not removed when navigating to a different node
  (thanks to @ebifrier, #712)
- Comment display was incorrect when navigating while Edit mode is active
  (thanks to @ebifrier, #711)
- Failed to load external links in comments (thanks to @baldor-f, #754)

**Changed**

- <kbd>Ctrl+H</kbd> toggles the visibility of the analysis heatmap, and
  <kbd>Ctrl+Shift+H</kbd> cycles through the different types of heatmap labels
  (#752)

## [Sabaki v0.51.1][v0.51.1] (2020-04-12)

**Added**

- Portable version for Windows (thanks to @ivysrono)
- French language support (thanks to @romton843)

**Fixed**

- Fix relative coordinates representation

## [Sabaki v0.51.0][v0.51.0] (2020-04-02)

**Added**

- Ability to hide heat map in analysis mode (#649)
- Ability to disable heat map variation replay (thanks to @ebifrier, #668)
- Ability to show score lead on board in analysis mode for engines that support
  it, e.g. KataGo (#589)
- Ability to show alternate coordinate labels (thanks to @ebifrier, #665)
- Ability to preserve window state (thanks to @ivysrono, #670)
- Multilanguage support thanks to
  [our translators](https://github.com/SabakiHQ/sabaki-i18n/graphs/contributors)
  (#647)

**Fixed**

- Fix a bug where captured stones are counted towards the wrong player (#658)

## [Sabaki v0.50.1][v0.50.1] (2020-03-13)

**Fixed**

- Fix a regression where SGF decoding didn't work (SabakiHQ/sgf#7)
- Fix Zen engine not working (#643)
- Fix board transformation not working (#644)
- Fix loading language files not working

## [Sabaki v0.50.0][v0.50.0] (2020-03-11)

**Added**

- Complete overhaul of the engine handling system, more than two engines can be
  attached and given player/analyzer roles, also not blocking the user from
  editing while generating moves
- Support for KataGo's non-square boards
- Ability to hide the winrate graph (#608)
- Display winrate and winrate change above the winrate graph (#620)
- Add macOS specific standard keyboard shortcut to close window with
  <kbd>Command+W</kbd> (#625)
- Add keyboard shortcuts for scoring/estimation (#345)

**Changed**

- Board transformations (rotation/flip/inversion) are now temporary and faster,
  transforms coordinates as well, located in the 'View' main menu, and have
  dedicated keyboard shortcuts
- Removing root node will now delete all other nodes and clear the board

**Fixed**

- Fix 'Update Result' not working in the score drawer (#580)
- Fix comment not updating when exiting edit mode too fast (#584)
- Fix comment text getting erased while in engine analysis mode (#637)

## [Sabaki v0.43.3][v0.43.3] (2019-05-13)

**Added**

- Node flattening operation now preserves player's turn (Thanks to
  [@dfannius](https://github.com/dfannius))
- Add ability to see and edit game comment (`GC` SGF property) in the info
  drawer (Thanks to [@fohristiwhirl](https://github.com/fohristiwhirl))

**Fixed**

- Files with really long variations don't freeze the app anymore
- Fix adding SGF properties via the 'Edit SGF Properties' drawer not working
- Fix handicap stones in wrong positions when changing board size
- Fix encoding detection not working

## [Sabaki v0.43.2][v0.43.2] (2019-04-27)

**Added**

- Ability to flip board horizontally/vertically (Thanks to
  [@fohristiwhirl](https://github.com/fohristiwhirl))
- Ability to invert colors (Thanks to
  [@fohristiwhirl](https://github.com/fohristiwhirl))
- Ability to invert winrate graph (Thanks to
  [@fohristiwhirl](https://github.com/fohristiwhirl))

**Changed**

- Create compressed SGF with no unnecessary whitespace by default

**Fixed**

- Don't clear edit history on reloading file when file has been changed
  externally
- Fix clearing certain game info fields not working
- Fix engines making three consecutive passes in engine vs. engine games
- Fix engine vs. engine games getting stuck in analysis mode
- Fix engine synchronization problems with passing moves

## [Sabaki v0.43.1][v0.43.1] (2019-03-17)

**Fixed**

- Fix setting handicap stones not working

## [Sabaki v0.43.0][v0.43.0] (2019-03-16)

**Added**

- Ability to undo/redo all of your edits
- Ability to display move numbers on the board
- Ability to highlight relevant stones for automatically generated move names
- Link to Sensei's Library for some automatically generated move names

**Changed**

- New next/previous variation switch behavior

**Fixed**

- Fix Sabaki not being able to append space characters in comment titles

## [Sabaki v0.42.0][v0.42.0] (2019-01-22)

**Added**

- Winrate graph is now resizable (Thanks to
  [@dbosst](https://github.com/dbosst))
- GTP console logging (Thanks to [@dbosst](https://github.com/dbosst))

**Changed**

- More precise navigation when navigating by pressing up/down arrow keys
- In area scoring, number of handicap stones are added to white's score,
  according to Chinese scoring (Thanks to [@dbosst](https://github.com/dbosst))

**Fixed**

- Fix Sabaki hanging sometimes when analysis variations contain pass moves
  (Thanks to [@dbosst](https://github.com/dbosst))

## [Sabaki v0.41.0][v0.41.0] (2018-11-29)

**Added**

- When adding analysis variation to the game tree, SGF move annotation will be
  supplied automatically
- Color coded game tree nodes according to their move annotation

**Changed**

- Continuous analysis when navigating the game in analysis mode
- Record winrate values when generating moves even if analysis mode is turned
  off

**Fixed**

- Better error handling regarding GTP engine crashes
- Fix incremental engine synchronization not working properly when handicap
  stones are involved
- Fix freeze when starting analysis after suspending an engine

## [Sabaki v0.40.1][v0.40.1] (2018-11-06)

**Added**

- Add setting for Sabaki to play out analysis variations instantly

**Fixed**

- Fix Sabaki incorrectly not detecting analysis capabilities when engine hasn't
  fully initialized yet
- Fix engine synchronization not working when engine has been suspended
- Fix analysis heatmap disappearing when Leela Zero reaches maximum
  visits/playouts
- Fix board rendering issues
- Fix Sabaki accidentally saving into non-SGF files

## [Sabaki v0.40.0][v0.40.0] (2018-11-04)

**Added**

- Ability to analyze Go board using analysis GTP commands
- Save winrate values and visualizes them in a graph
- Support [GoKibitz](https://gokibitz.com/)-style variations in comments
- Setting to turn off engine auto move generation
- Ability to set custom board image without userstyles

**Changed**

- **Breaking:** New future-proof theming strategy; old themes may not work in
  this release anymore
- More efficient engine syncing
- No GTP commands are blocked in the GTP console anymore
- GTP console is now faster
- Warn user when GTP can't support board size
- Suspending engines is now allowed while engine is thinking

**Fixed**

- Navigating by pressing up/down keys doesn't stutter anymore
- Fix extemely slow starting time on Linux (Thanks to
  [@hadim](https://github.com/hadim))

## [Sabaki v0.35.1][v0.35.1] (2018-08-04)

**Fixed**

- Finally fix that misspelling of 'Repository' in the menu (Thanks to
  [@dpflug](https://github.com/dpflug))
- When copying the root node, Sabaki will automatically strip root node specific
  properties upon pasting
- Generated SGFs will not contain subtrees with no siblings anymore

## [Sabaki v0.35.0][v0.35.0] (2018-07-17)

**Added**

- Add advanced SGF properties editor
- Ability to generate one move from one engine player only

**Changed**

- When entering edit mode, Sabaki will now focus the comment box automatically
- Send custom initial GTP commands to engines after sending basic meta commands

**Fixed**

- Correctly send handicap stones to GTP engines
- Retain board size when flattening board arrangement (Thanks to
  [@dfannius](https://github.com/dfannius))

## [Sabaki v0.34.1][v0.34.1] (2018-06-03)

**Changed**

- Updater links directly to the appropriate download URL when an update is
  available

**Fixed**

- Fix engine not working when having empty initial commands

## [Sabaki v0.34.0][v0.34.0] (2018-05-29)

**Added**

- Add board rotation tools (Thanks to
  [@fohristiwhirl](https://github.com/fohristiwhirl))
- Add an option to disable hardware acceleration (Thanks to
  [@ohyou](https://github.com/ohyou))
- Add an option to always show game result in the info drawer (Thanks to
  [@fohristiwhirl](https://github.com/fohristiwhirl))
- Ability to sort games by game length (Thanks to
  [@gcentauri](https://github.com/gcentauri))

**Changed**

- Moved some features to 'Tools' menu
- Gracefully ending engines with `quit` command when detaching
- [Dead stones detector](https://github.com/SabakiHQ/deadstones) rewritten in
  Rust & WebAssembly to be faster and more accurate
- Improved [influence map generator](https://github.com/SabakiHQ/influence)
  which fixes ragged areas
- Formatted SGF output
- Update to Electron v2.0.2

**Fixed**

- Trying to execute blocked GTP commands will show properly in the console
- Fix mismatch of commands and responses in the GTP console

## [Sabaki v0.33.4][v0.33.4] (2018-04-03)

**Added**

- Show player ranks on the play bar, next to the player names

**Changed**

- Change default placement of handicap stones in a three-handicap game
- Update to Electron v1.8.4

**Fixed**

- When exiting edit mode using <kbd>Ctrl+E</kbd>, the cursor won't be stuck as a
  crosshair anymore
- Navigating the game using arrow keys isn't blocked anymore after closing game
  manager drawer

## [Sabaki v0.33.3][v0.33.3] (2018-02-10)

**Fixed**

- Fix game tree crashing when showing after branching the game tree
- Fix stones with labels not showing up in ASCII diagrams

## [Sabaki v0.33.2][v0.33.2] (2018-01-23)

**Fixed**

- Fix color of hoshi points not being themed
- Fix Markdown links not working properly

**Changed**

- Update to Electron v1.7.11

## [Sabaki v0.33.1][v0.33.1] (2018-01-09)

**Fixed**

- Fix board markups not being displayed on stones

## [Sabaki v0.33.0][v0.33.0] (2018-01-09)

**Added**

- Allow engines to send heatmaps and visualizes them
- Ability to specify commands that are sent to engines right after they start
- Add option whether Sabaki should start a game right after attaching engines

**Changed**

- The command history limit has been reinstated, but raised
- Update to Electron v1.7.10

**Fixed**

- Fix comment input area not being visible in edit mode sometimes
- Fix engine color indicator of GTP console being wrong when swapping engine
  color mid-game
- Up and down keys for traversing command history in the GTP console are working
  again
- Fix Sabaki trying to add engine variations while in scoring mode after a
  double pass
- Fix engine passes not getting passed on to opponent engine

## [Sabaki v0.32.2][v0.32.2] (2018-01-01)

**Added**

- Add engine integration protocol
- Add 'Synchronize' menu item in 'Engines' menu

**Changed**

- When updating engine boards, Sabaki will try to replay moves in game order
  first
- The command history limit of the GTP console has been lifted
- Focus find input when entering find mode
- Sabaki allows 2×2 boards

**Fixed**

- Fix Sabaki not continue generating moves in bot vs. bot games where only one
  of them passes
- Selecting 'Stone Tool' from the menu is now able to toggle stone color

## [Sabaki v0.31.5][v0.31.5] (2017-10-31)

**Changed**

- Pre-fill date field in new games with current date
- In the info drawer, show game result after user's affirmation
- Inactive nodes in the game tree get comment and hotspot coloring (Thanks to
  [@geovens](https://github.com/geovens))
- When selecting engines, player names are automatically filled unless changed
  by the user
- Change 'Remove Node' shortcut to <kbd>Command+Backspace</kbd> on macOS
- Change 'Fullscreen' shortcut to <kbd>F11</kbd> on Linux and Windows
- Lift the arbitrary maximum limit of autoplay's 'sec per move' (Thanks to
  [@emauton](https://github.com/emauton))
- Per-window sidebars (see
  [#265](https://github.com/SabakiHQ/Sabaki/issues/265))
- Add support for outdated `L` property
- Add menu items for going to next/previous game
- Update to Electron v1.7.9

**Fixed**

- Clicking 'Download Update' button opens the correct URL
- Fix encoding problems in shape names
- Fix updated komi values not being sent to GTP engines during the game
- Fix pass moves not being sent to GTP engines
- Fix Sabaki crashing when pressing enter in autoplay mode
- Fix 'Clear Annotations' not working
- Fix Sabaki not sending pass command to attached engines
- Fix cursor jumping to the end of comment text when editing
- Fix 'Jump to end after loading file' not working
- Fix theme uninstallation failing on Windows with disabled recycle bin

## [Sabaki v0.31.0][v0.31.0] (2017-05-27)

**Added**

- Themes (Thanks to [@Seth-Rothschild](https://github.com/Seth-Rothschild))
- Ability to adjust UI zoom

**Changed**

- Update to Electron v1.7.2 beta
- Rename 'Pause' engines command to 'Suspend'

**Fixed**

- Fix player names not displaying in the game chooser drawer
- Fix Sabaki displaying 'Please wait...' forever after a two engines match ends
  in resignation
- Fix GTP console sending invalid commands
- Fix 'Go To Move Number' not working
- Fix move/position annotations being incorrectly applied

## [Sabaki v0.30.3][v0.30.3] (2017-05-10)

**Added**

- Ability to pause engines

**Fixed**

- Fix Sabaki not being able to undo a flatten node operation
- Fix Sabaki incorrectly setting `HA` and `AB` properties when there are no
  handicap stones
- Fix Sabaki sometimes not saving comments when comment box is focused
- Fix Sabaki crashing when checking for updates without internet connection

## [Sabaki v0.30.2][v0.30.2] (2017-05-03)

**Changed**

- Update to Electron v1.6.8 beta
- Reduce mouse wheel navigation sensitivity

**Fixed**

- Fix Sabaki being unresponsive for a short time during update checking
- Fix setting white player rank not working in info drawer

## [Sabaki v0.30.1][v0.30.1] (2017-04-25)

**Added**

- The game graph has been rewritten from scratch and is now more efficient with
  large game trees without the need to collapse subtrees. The graph is more
  accessible, the nodes have a bigger click surface and dragging the graph can
  go beyond the component.
- The game collection manager includes support for `ngf` and `gib` files. It
  also sports a slick board animation, which is very slick. Did I mention it's
  slick?
- You can assign custom label texts to a vertex on the board by selecting the
  label or number tool and clicking 'Edit Label' in the context menu.
- You can attach two engines to Sabaki and let them play each other while you
  can sip tea comfortably and watch them fight. The GTP console has been
  redesigned so you are able to address both engines separately. It also
  displays (usually) useful `stderr` information from the engines. Command
  autocompletion is more obvious now.
- Drawing with the line/arrow tool makes it clear that drawing over an existing
  line/arrow removes that line/arrow.
- Ability to hide menu bar on Windows and Linux.

**Changed**

- Update to Electron v1.6.7 beta

**Fixed**

- When encoding is not specified, Sabaki tries to infer the encoding from
  content instead of assuming ISO-8859-1 (Thanks to
  [@fohristiwhirl](https://github.com/fohristiwhirl)).
- When `CA` property is missing from an opened file, Sabaki previously saves it
  without correct UTF-8 `CA` property. This results in Sabaki opening these
  files in ISO-8859-1, not correctly displaying text. This is fixed now.
- When attaching engines, Sabaki previously sends the `boardsize` command after
  `clear_board` which technically can result in arbitrary board positions on the
  engine. This is fixed now.
- Other Go software may specify the same property multiple times on a tree node,
  which technically makes the SGF invalid. Sabaki can handle these files now.

## [Sabaki v0.21.0][v0.21.0] (2017-03-30)

**Added**

- Support for Tygem `gib` files and WBaduk `ngf` files (Thanks to
  [@fohristiwhirl](https://github.com/fohristiwhirl))
- Move spots on the board are getting colored according to its move annotation
  (Thanks to [@dfannius](https://github.com/dfannius))
- Move annotation context menu on the last played stone (Thanks to
  [@dfannius](https://github.com/dfannius))
- Sabaki Web can load and copy SGF files from/to the clipboard (Thanks to
  [@C0DEHERO](https://github.com/C0DEHERO))
- Use Monte Carlo algorithm for better dead stones estimation
- Ability to change the order of variations
- Ability to remove certain node information from the whole game or current
  position
- Ability to sort games in a game container
- Add compact and big style game tree

**Changed**

- Update to Electron v1.6.2
- Board grid lines are now vector images
- Sabaki Web saves settings in local storage
- Current variation is more distinguishable from other variations in the game
  tree

**Fixed**

- Windows installers create app folder if necessary
- Fix Sabaki being unresponsive when adding invalid files to a game collection
- Fix wrong initial `SZ` property value, thus resulting in an invalid SGF file
- Fix issue where Sabaki is inserting a ton of unnecessary empty lines in SGF
  files on Windows
- Fix GitHub and 'Report Issue' menu items not working
- Fix move interpretation stuck at '3-3 point' sometimes
- Fix reload file warning showing if the file has been removed
- Sabaki uses `\r\n` as linebreaks on Windows
- Fix 'Download' button when an update is available

## [Sabaki v0.19.3][v0.19.3] (2017-01-11)

**Added**

- Sabaki remembers board setup, i.e. komi, board size, and handicap stones
- Sabaki offers to reload an opened file if it has been changed externally
- Ability to remove all variations apart from the active one
- Ability to flatten nodes
- Add 'Play' menu
- Add 'Go To Move Number' menu item
- Ability to select points by keyboard input
- Ability to copy/cut/paste variations

**Changed**

- Change keyboard shortcuts for toggling sidebar elements
- Update to Electron v1.4.13
- Update to Octicons v5.0.1
- Remove gemini-scrollbar dependency

**Fixed**

- Fix copy to clipboard not working
- Fix board arrows not pointing in the right direction
- Fix incorrectly interpreting openings on boards other than 19&times;19
- Fix Sabaki closing even if user cancels
- Fix game graph not being updated when pasting variations sometimes
- Fix handicap stones being placed incorrectly
- Fix not being able to select executables for engines

## [Sabaki v0.18.3][v0.18.3] (2016-10-26)

**Added**

- Add support for non-UTF8 encodings (Thanks to
  [@apetresc](https://github.com/apetresc))
- Add basic text editing keyboard shortcuts when editing/writing comments on
  macOS

**Changed**

- Sidebar lag is reduced
- More intuitive 'Go To Next/Previous Variation'
- Update application icon
- Update to Electron v1.4.4

**Fixed**

- Fix 'Load From Clipboard' encoding issue
- Fix graph not displaying diamond shapes
- Fix arrow keys not working in open/save file dialog on macOS
- Fix guess mode when an engine is attached
- Fix removing nodes resulting in invalid game graphs sometimes
- Fix regression where guess mode stopped working

## [Sabaki v0.17.2][v0.17.2] (2016-09-10)

**Added**

- Autoplay mode
- `Ctrl`-click position to insert coordinates when in edit mode
- Add keyboard shortcut for 'Pass' (`Ctrl+P` or `Command+P`)

**Changed**

- Clicking on the current player indicator switches current player without
  passing
- Update to Electron v1.3.5
- Bump gemini-scrollbar@v1.4.3
- Bump octicons@v4.3.0

**Fixed**

- Fix `PL[B]` not working
- Fix scrollbar in engines list not updating correctly
- Fix system paths not being honored in macOS
- Fix autoplay stopping at non-move nodes
- Fix autoplay not working with non-alternating color moves
- Fix regression where swapping player names wouldn't work
- Fix performance issue where a huge amount of games inside a SGF collection can
  slow down Sabaki
- Fix games vanishing in 'Manage Games...' when dragging
- Fix unresponsiveness when cancelling adding files to games
- Fix adding files to games being impossible under Mac
- Fix GTP console being unusable under Mac when native overlay scrollbars are
  turned on

## [Sabaki v0.15.3][v0.15.3] (2016-06-16)

**Added**

- Create ASCII diagrams
- Ability to animate fuzzy placement of stones
- Ability to add existing files to SGF collection
- 'Resign' menu item under 'Pass'
- Ability to turn off automatic move titles in the preferences
- Add keyboard shortcut for 'Show Coordinates'
- Score estimator
- Ability to select multiple existing files to add to SGF collection

**Changed**

- Board adapts size, looking more natural
- Current stone markers resize with board
- Change 'Go To Beginning' and 'Go To End' keyboard shortcuts to `Home`/`End`
- Doesn't leave scoring mode when closing score table
- Change keyboard shortcut for 'Generate Move' to `F5`
- Remove keyboard shortcut for 'GTP console'
- Press `Esc` to exit full screen mode
- Update to Electron v1.2.2

**Fixed**

- Fix rounding errors regarding hoshi points
- Fix komi not updated for GTP engine
- Fix sending invalid GTP command when passing

## [Sabaki v0.14.0][v0.14.0] (2016-05-14)

**Added**

- Ability to add dates to games
- Ability to create games on small boards
- Ability to style Sabaki with userstyles (see
  [wiki](https://github.com/SabakiHQ/Sabaki/wiki/Userstyle-Tutorial))
- Support for non-square boards
- Ability to show sibling variations on the board
- Display result in scoring table

**Changed**

- Display non-moves as diamonds in the game graph
- Update to Electron v1.0.2

**Fixed**

- Fix coordinates in console not being styled correctly
- Fix weird grid lines behavior with small board sizes
- Fix deselecting vertex when finding moves
- Fix occasional crash when opening small files at startup
- Fix label markup cutting off content or truncating three digit numbers

## [Sabaki v0.12.4][v0.12.4] (2016-05-03)

**Added**

- Now board markup scales with board size
- Add edit button to comments section
- Allow a subset of Markdown in the comments section
- Ability to choose GTP engine directly inside the 'New Game' drawer
- Ability to link to move numbers in the comments (see
  [wiki](https://github.com/SabakiHQ/Sabaki/wiki/Markdown-in-Sabaki))
- Support for old SGF 'long property ids' (see
  [#68](https://github.com/SabakiHQ/Sabaki/issues/68))

**Changed**

- Doesn't clear GTP console when detaching engines
- Significant SGF parsing speed increase; parses Kogo's Joseki Dictionary in
  around one second
- Significant graph updating speed increase
- Update to Electon v0.37.7

**Fixed**

- Fix misplaced triangle markup under OS X
- Fix incorrect parsing of backslashes in comments
- Fix engines menu list not updating when adding/removing engines
- Fix comments textbox scrolling to top when editing
- Fix navigation shortcuts not working after closing drawers
- Fix conflicting auto-links in the comments section
- Slider doesn't stop halfway anymore when sliding over the end

## [Sabaki v0.11.5][v0.11.5] (2016-04-15)

**Changed**

- Add 'New Window' menu item
- Closing all windows doesn't quit the app in OS X
- Associate SGF files with Sabaki in OS X
- Faster startup
- Update to Electron v0.37.5

**Fixed**

- Fix missing WebGL libraries in Windows
- Fix crash while saving files
- Opening an unreadable file doesn't set represented filename anymore
- Fix repeated exceptions when opening an empty game tree
- Fix editing compressed point lists for AB/AW/AE properties not working

## [Sabaki v0.11.2][v0.11.2] (2016-04-01)

**Added**

- Guess mode
- Load SGF files from clipboard
- Copy SGF files to clipboard
- SGF-compatible line and arrow markup
- Filter in 'Manage Games'
- More game info fields
- Add opening data
- Add 'Go To Main Variation' menu item
- Supports SGF collections

**Changed**

- Show game result when at the end of main variation
- Smaller font size for larger board labels
- Update to Electron v0.37.3

**Fixed**

- Fix regression where saving SGF files does nothing
- Fix graph not updating when undoing
- Dragging slider outside window won't cause it to stop anymore

## [Sabaki v0.10.1][v0.10.1] (2016-02-27)

**Added**

- Show SGF node name (`N` property) if available
- Show node & move annotations
- Add 'Go To Next/Previous Comment' menu items

**Changed**

- Change 'Bookmark' to 'Hotspot'
- 'Show Variations' shows next move as well
- Don't make current variation to main variation when saving
- Update to Electron v0.36.9

**Fixed**

- Fix incorrectly escaped `>` character in comment
- Prevent user from sliding out of viewport by selecting text
- Fix regression where saving SGF files results in an exception

## [Sabaki v0.9.1][v0.9.1] (2016-02-24)

**Added**

- Add Mac OS X release
- Add bookmark indicator
- Ability to save into existing file
- Show basic move interpretation when no comment is provided

**Changed**

- Speed up SGF parsing
- Speed up scoring
- Show passes as squares in game graph
- Changed some menu shortcuts
- Bump electron@v0.36.8
- Bump gemini-scrollbar@v1.3.2
- Bump octicons@v3.5.0
- Bump sigma@v1.1.0

**Fixed**

- Fix regression when passing results in an uncatched exception sometimes
- Fix not being able to hide the indicator in find mode
- Clicking when busy does not have an effect now

## [Sabaki v0.8.1][v0.8.1] (2016-02-12)

**Added**

- Find menu
- Ability to find in comments
- Create bookmarks and jump to them

**Changed**

- Clicking on the player indicator results in a pass
- Enter scoring mode after two consecutive passes are created
- Change behavior of find buttons

**Fixed**

- Saving a game does not trigger 'File changed' flag
- Fix regression where a new variation is created when move already exists
- Fix regression where the slider doesn't jump when clicked

## [Sabaki v0.7.6][v0.7.6] (2016-01-30)

**Added**

- Autoscroll games

**Fixed**

- Fix weird `box-shadow` on stone overlays
- Fix not updating game graph sometimes when undoing
- Fix regression where a new variation is created when variation already exists
- Fix loading games with no player names not replacing old names
- Fix weird menu behavior

**Changed**

- Scale icons proportionally so they don't look weird
- Styled checkboxes
- Don't mark stones as dead in friendly territory
- Ability to directly enter engine path when adding an engine
- Detach engine before unloading
- More crisp SVG icons
- New slider design
- Update to Electron v0.36.7
- Update to Mootools v1.6.0

## [Sabaki v0.7.1][v0.7.1] (2015-12-31)

**Added**

- Find move
- Fullscreen mode
- Add GTP engines support
- Add preferences panel
- Undo 'Remove Node' and 'Clear All Overlays'
- Click current stone to remove node
- Ability to turn off 'Remove Node' warning

**Changed**

- More responsive game graph
- Touch-friendly slider
- Fix duplicate Taskbar icon in Windows
- Fix overlays being off-center
- Window has an icon in Linux

**Fixed**

- More crisp bar icons
- Fix engines not showing in preferences when removed but not saved
- Fix certain actions failing in scoring mode
- Update to Electron v0.36.2

## [Sabaki v0.5.0][v0.5.0] (2015-09-03)

**Added**

- Add 'Clear All Overlays' menu item
- Ask for saving file when closing a changed game
- Confirm remove node
- Add comment editing to edit mode
- Add Linux release

**Fixed**

- Always use system font
- Fix weird rendering artifacts
- Prevent new windows when Ctrl-clicking links

**Changed**

- Alpha and number tools use up lower, unused symbols before using higher
  symbols
- When opening Sabaki with a big file, the main window will show before loading
  file
- Update to Electron v0.31.2

## [Sabaki v0.4.2][v0.4.2] (2015-08-28)

**Added**

- Resizable comment view
- Comment view
- Add keyboard shortcut for 'Remove Node'
- Hovering over coordinates in a comment will show the corresponding position on
  the board

**Fixed**

- Avoid initial collision of fuzzily placed stones
- Mouse wheel navigation works when pointing at the game graph
- Fix slider arrow not being at the right place sometimes
- Fix a bug where saving games with comments could lead to unescaped characters

**Changed**

- Update to Electron v0.31.1
- Change name to Sabaki

## [Goban v0.3.7][v0.3.7] (2015-08-16)

**Added**

- Highlight current game track in graph

**Fixed**

- Fix wrong cross symbol on Windows 10
- Fix a bug where stone sounds are not played immediately
- Fix graph performance issues
- Fix uncaught exception when playing in pruned subgraphs again
- Faster click response when playing in large graphs

**Changed**

- Update to Electron v0.30.4

## [Goban v0.3.5][v0.3.5] (2015-08-04)

**Added**

- Check for updates at startup
- Add move count indicator next to slider
- Ability to load a game by dropping file onto the board
- Show error message when file is unreadable
- Warn user about suicide moves
- Play capture sounds when making suicide moves
- Show taskbar progress when loading large SGF files
- Color-code collapsed subgraphs
- Color-code commented nodes
- Automatically expand collapsed subgraphs

**Fixed**

- Fix uncaught exception when playing in pruned subgraphs
- Fix a bug where the slider won't update when playing in pruned subgraphs
- Fix a bug where label tooltips are not removed
- Fix a bug where the game graph is not updated when adding/removing stones
  manually
- Fix a bug where the graph camera is not positioned correctly when opening
  sidebar
- Fix weird graph camera behavior
- Fix uncaught exception when saving SGF file

**Changed**

- Faster slider response
- Collapse game graph for performance
- Update to Electron v0.30.2

## [Goban v0.3.0][v0.3.0] (2015-07-22)

**Added**

- Game graph
- Resizable sidebar
- Detect and notify user about ko
- Ability to remove SGF nodes
- Add slider
- Add navigation to sibling variations

**Fixed**

- Prevent accidentally clicking on the board when dragging graph
- Fix a bug where removed variations show up on the board
- Fix an error where updating the score of a drawed game, the SGF result will
  not be correct
- Fix sudden disappearances of the game graph when dragged
- Fix unresponsiveness when clicking on a vertex on the game graph

**Changed**

- Update to Electron v0.30.0

## Goban v0.1.0 (2015-06-20)

First release

[unreleased]: https://github.com/SabakiHQ/Sabaki/compare/v0.51.0...master
[v0.51.0]: https://github.com/SabakiHQ/Sabaki/compare/v0.50.1...v0.51.0
[v0.50.1]: https://github.com/SabakiHQ/Sabaki/compare/v0.50.0...v0.50.1
[v0.50.0]: https://github.com/SabakiHQ/Sabaki/compare/v0.43.3...v0.50.0
[v0.43.3]: https://github.com/SabakiHQ/Sabaki/compare/v0.43.2...v0.43.3
[v0.43.2]: https://github.com/SabakiHQ/Sabaki/compare/v0.43.1...v0.43.2
[v0.43.1]: https://github.com/SabakiHQ/Sabaki/compare/v0.43.0...v0.43.1
[v0.43.0]: https://github.com/SabakiHQ/Sabaki/compare/v0.42.0...v0.43.0
[v0.42.0]: https://github.com/SabakiHQ/Sabaki/compare/v0.41.0...v0.42.0
[v0.41.0]: https://github.com/SabakiHQ/Sabaki/compare/v0.40.1...v0.41.0
[v0.40.1]: https://github.com/SabakiHQ/Sabaki/compare/v0.40.0...v0.40.1
[v0.40.0]: https://github.com/SabakiHQ/Sabaki/compare/v0.35.1...v0.40.0
[v0.35.1]: https://github.com/SabakiHQ/Sabaki/compare/v0.35.0...v0.35.1
[v0.35.0]: https://github.com/SabakiHQ/Sabaki/compare/v0.34.1...v0.35.0
[v0.34.1]: https://github.com/SabakiHQ/Sabaki/compare/v0.34.0...v0.34.1
[v0.34.0]: https://github.com/SabakiHQ/Sabaki/compare/v0.33.4...v0.34.0
[v0.33.4]: https://github.com/SabakiHQ/Sabaki/compare/v0.33.3...v0.33.4
[v0.33.3]: https://github.com/SabakiHQ/Sabaki/compare/v0.33.2...v0.33.3
[v0.33.2]: https://github.com/SabakiHQ/Sabaki/compare/v0.33.1...v0.33.2
[v0.33.1]: https://github.com/SabakiHQ/Sabaki/compare/v0.33.0...v0.33.1
[v0.33.0]: https://github.com/SabakiHQ/Sabaki/compare/v0.32.2...v0.33.0
[v0.32.2]: https://github.com/SabakiHQ/Sabaki/compare/v0.31.5...v0.32.2
[v0.31.5]: https://github.com/SabakiHQ/Sabaki/compare/v0.31.0...v0.31.5
[v0.31.0]: https://github.com/SabakiHQ/Sabaki/compare/v0.30.3...v0.31.0
[v0.30.3]: https://github.com/SabakiHQ/Sabaki/compare/v0.30.2...v0.30.3
[v0.30.2]: https://github.com/SabakiHQ/Sabaki/compare/v0.30.1...v0.30.2
[v0.30.1]: https://github.com/SabakiHQ/Sabaki/compare/v0.21.0...v0.30.1
[v0.21.0]: https://github.com/SabakiHQ/Sabaki/compare/v0.19.3...v0.21.0
[v0.19.3]: https://github.com/SabakiHQ/Sabaki/compare/v0.18.3...v0.19.3
[v0.18.3]: https://github.com/SabakiHQ/Sabaki/compare/v0.17.2...v0.18.3
[v0.17.2]: https://github.com/SabakiHQ/Sabaki/compare/v0.15.3...v0.17.2
[v0.15.3]: https://github.com/SabakiHQ/Sabaki/compare/v0.14.0...v0.15.3
[v0.14.0]: https://github.com/SabakiHQ/Sabaki/compare/v0.12.4...v0.14.0
[v0.12.4]: https://github.com/SabakiHQ/Sabaki/compare/v0.11.5...v0.12.4
[v0.11.5]: https://github.com/SabakiHQ/Sabaki/compare/v0.11.2...v0.11.5
[v0.11.2]: https://github.com/SabakiHQ/Sabaki/compare/v0.10.1...v0.11.2
[v0.10.1]: https://github.com/SabakiHQ/Sabaki/compare/v0.9.1...v0.10.1
[v0.9.1]: https://github.com/SabakiHQ/Sabaki/compare/v0.8.1...v0.9.1
[v0.8.1]: https://github.com/SabakiHQ/Sabaki/compare/v0.7.6...v0.8.1
[v0.7.6]: https://github.com/SabakiHQ/Sabaki/compare/v0.7.1...v0.7.6
[v0.7.1]: https://github.com/SabakiHQ/Sabaki/compare/v0.5.0...v0.7.1
[v0.5.0]: https://github.com/SabakiHQ/Sabaki/compare/v0.4.2...v0.5.0
[v0.4.2]: https://github.com/SabakiHQ/Sabaki/compare/v0.3.7...v0.4.2
[v0.3.7]: https://github.com/SabakiHQ/Sabaki/compare/v0.3.6...v0.3.7
[v0.3.6]: https://github.com/SabakiHQ/Sabaki/compare/v0.3.5...v0.3.6
[v0.3.5]: https://github.com/SabakiHQ/Sabaki/compare/v0.3.0...v0.3.5
[v0.3.0]: https://github.com/SabakiHQ/Sabaki/compare/v0.1.0...v0.3.0
