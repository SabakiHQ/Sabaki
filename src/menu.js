const nativeRequire = eval('require')

const {shell, clipboard} = require('electron')
var remote = null
try {
  remote = require('@electron/remote')
} catch (e) {}
const isRenderer = remote != null
const {app} = isRenderer ? remote : require('electron')

const i18n = require('./i18n')
const sabaki = isRenderer ? require('./modules/sabaki').default : null
const dialog = isRenderer ? require('./modules/dialog') : null
const setting = isRenderer
  ? remote.require('./setting')
  : nativeRequire('./setting')

exports.get = function(props = {}) {
  let toggleSetting = key => setting.set(key, !setting.get(key))
  let selectTool = tool => (
    sabaki.setMode('edit'), sabaki.setState({selectedTool: tool})
  )

  let {
    disableAll,
    disableGameLoading,
    analysisType,
    showAnalysis,
    showInfluence,
    showCoordinates,
    coordinatesType,
    showMoveNumbers,
    showMoveColorization,
    showNextMoves,
    showSiblings,
    showWinrateGraph,
    showGameGraph,
    showCommentBox,
    showLeftSidebar,
    engineGameOngoing,
    analysisEngineStatus
  } = props

  let data = [
    {
      id: 'file',
      label: i18n.t('menu.file', '&File'),
      submenu: [
        {
          shortcut: 'new',
          label: i18n.t('menu.file', '&New'),
          accelerator: 'CmdOrCtrl+N',
          enabled: !disableGameLoading,
          click: () => sabaki.newFile({playSound: true, showInfo: true})
        },
        {
          shortcut: 'new-window',
          label: i18n.t('menu.file', 'New &Window'),
          accelerator: 'CmdOrCtrl+Shift+N',
          clickMain: 'newWindow',
          neverDisable: true
        },
        {type: 'separator'},
        {
          shortcut: 'open',
          label: i18n.t('menu.file', '&Open…'),
          accelerator: 'CmdOrCtrl+O',
          enabled: !disableGameLoading,
          click: () => sabaki.loadFile()
        },
        {
          shortcut: 'save',
          label: i18n.t('menu.file', '&Save'),
          accelerator: 'CmdOrCtrl+S',
          click: () => sabaki.saveFile(sabaki.state.representedFilename)
        },
        {
          shortcut: 'save-as',
          label: i18n.t('menu.file', 'Sa&ve As…'),
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => sabaki.saveFile()
        },
        {type: 'separator'},
        {
          id: 'clip',
          label: i18n.t('menu.file', '&Clipboard'),
          submenu: [
            {
              shortcut: 'load-sgf',
              label: i18n.t('menu.file', '&Load SGF'),
              enabled: !disableGameLoading,
              click: () => sabaki.loadContent(clipboard.readText(), 'sgf')
            },
            {
              shortcut: 'copy-sgf',
              label: i18n.t('menu.file', '&Copy SGF'),
              click: () => clipboard.writeText(sabaki.getSGF())
            },
            {
              shortcut: 'copy-ascii',
              label: i18n.t('menu.file', 'Copy &ASCII Diagram'),
              click: () => clipboard.writeText(sabaki.getBoardAscii())
            }
          ]
        },
        {type: 'separator'},
        {
          shortcut: 'game-info',
          label: i18n.t('menu.file', 'Game &Info'),
          accelerator: 'CmdOrCtrl+I',
          click: () => sabaki.openDrawer('info')
        },
        {
          shortcut: 'game-manager',
          label: i18n.t('menu.file', '&Manage Games…'),
          accelerator: 'CmdOrCtrl+Shift+M',
          enabled: !disableGameLoading,
          click: () => sabaki.openDrawer('gamechooser')
        },
        {type: 'separator'},
        {
          shortcut: 'preferences',
          label: i18n.t('menu.file', '&Preferences…'),
          accelerator: 'CmdOrCtrl+,',
          click: () => sabaki.openDrawer('preferences')
        },
        {type: 'separator'},
        {
          shortcut: 'quit',
          label: i18n.t('menu.file', '&Quit'),
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      id: 'play',
      label: i18n.t('menu.play', '&Play'),
      submenu: [
        {
          shortcut: 'toggle-player',
          label: i18n.t('menu.play', '&Toggle Player'),
          click: () =>
            sabaki.setPlayer(
              sabaki.state.treePosition,
              -sabaki.getPlayer(sabaki.state.treePosition)
            )
        },
        {type: 'separator'},
        {
          shortcut: 'select-point',
          label: i18n.t('menu.play', 'Se&lect Point'),
          accelerator: 'CmdOrCtrl+L',
          click: async () => {
            let value = await dialog.showInputBox(
              i18n.t('menu.play', 'Enter a coordinate to select a point')
            )
            if (value == null) return

            sabaki.clickVertex(value)
          }
        },
        {
          shortcut: 'pass',
          label: i18n.t('menu.play', '&Pass'),
          accelerator: 'CmdOrCtrl+P',
          click: () => sabaki.makeMove([-1, -1])
        },
        {
          shortcut: 'resign',
          label: i18n.t('menu.play', 'Resig&n'),
          click: () => sabaki.makeResign()
        },
        {type: 'separator'},
        {
          shortcut: 'estimate',
          label: i18n.t('menu.play', '&Estimate'),
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () =>
            sabaki.setMode(
              sabaki.state.mode === 'estimator' ? 'play' : 'estimator'
            )
        },
        {
          shortcut: 'score',
          label: i18n.t('menu.play', 'Sco&re'),
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () =>
            sabaki.setMode(sabaki.state.mode === 'scoring' ? 'play' : 'scoring')
        }
      ]
    },
    {
      id: 'edit',
      label: i18n.t('menu.edit', '&Edit'),
      submenu: [
        {
          shortcut: 'undo',
          label: i18n.t('menu.edit', '&Undo'),
          accelerator: 'CmdOrCtrl+Z',
          click: () => sabaki.undo()
        },
        {
          shortcut: 'redo',
          label: i18n.t('menu.edit', 'Re&do'),
          accelerator:
            process.platform === 'win32' ? 'CmdOrCtrl+Y' : 'CmdOrCtrl+Shift+Z',
          click: () => sabaki.redo()
        },
        {type: 'separator'},
        {
          shortcut: 'mode',
          label: i18n.t('menu.edit', 'Toggle &Edit Mode'),
          accelerator: 'CmdOrCtrl+E',
          click: () =>
            sabaki.setMode(sabaki.state.mode === 'edit' ? 'play' : 'edit')
        },
        {
          id: 'tool',
          label: i18n.t('menu.edit', '&Select Tool'),
          submenu: [
            {
              shortcut: 'stone',
              label: i18n.t('menu.edit', '&Stone Tool'),
              accelerator: 'CmdOrCtrl+1',
              click: () =>
                selectTool(
                  sabaki.state.mode !== 'edit' ||
                    sabaki.state.selectedTool !== 'stone_1'
                    ? 'stone_1'
                    : 'stone_-1'
                )
            },
            {
              shortcut: 'cross',
              label: i18n.t('menu.edit', '&Cross Tool'),
              accelerator: 'CmdOrCtrl+2',
              click: () => selectTool('cross')
            },
            {
              shortcut: 'triangle',
              label: i18n.t('menu.edit', '&Triangle Tool'),
              accelerator: 'CmdOrCtrl+3',
              click: () => selectTool('triangle')
            },
            {
              shortcut: 'square',
              label: i18n.t('menu.edit', 'S&quare Tool'),
              accelerator: 'CmdOrCtrl+4',
              click: () => selectTool('square')
            },
            {
              shortcut: 'circle',
              label: i18n.t('menu.edit', 'C&ircle Tool'),
              accelerator: 'CmdOrCtrl+5',
              click: () => selectTool('circle')
            },
            {
              shortcut: 'line',
              label: i18n.t('menu.edit', '&Line Tool'),
              accelerator: 'CmdOrCtrl+6',
              click: () => selectTool('line')
            },
            {
              shortcut: 'arrow',
              label: i18n.t('menu.edit', '&Arrow Tool'),
              accelerator: 'CmdOrCtrl+7',
              click: () => selectTool('arrow')
            },
            {
              shortcut: 'label',
              label: i18n.t('menu.edit', 'La&bel Tool'),
              accelerator: 'CmdOrCtrl+8',
              click: () => selectTool('label')
            },
            {
              shortcut: 'number',
              label: i18n.t('menu.edit', '&Number Tool'),
              accelerator: 'CmdOrCtrl+9',
              click: () => selectTool('number')
            }
          ]
        },
        {type: 'separator'},
        {
          shortcut: 'variation-copy',
          label: i18n.t('menu.edit', '&Copy Variation'),
          click: () => sabaki.copyVariation(sabaki.state.treePosition)
        },
        {
          shortcut: 'variation-cut',
          label: i18n.t('menu.edit', 'Cu&t Variation'),
          click: () => sabaki.cutVariation(sabaki.state.treePosition)
        },
        {
          shortcut: 'variation-paste',
          label: i18n.t('menu.edit', '&Paste Variation'),
          click: () => sabaki.pasteVariation(sabaki.state.treePosition)
        },
        {type: 'separator'},
        {
          shortcut: 'variation-make-main',
          label: i18n.t('menu.edit', 'Make Main &Variation'),
          click: () => sabaki.makeMainVariation(sabaki.state.treePosition)
        },
        {
          shortcut: 'variation-shift-left',
          label: i18n.t('menu.edit', 'Shift &Left'),
          click: () => sabaki.shiftVariation(sabaki.state.treePosition, -1)
        },
        {
          shortcut: 'variation-shift-right',
          label: i18n.t('menu.edit', 'Shift Ri&ght'),
          click: () => sabaki.shiftVariation(sabaki.state.treePosition, 1)
        },
        {type: 'separator'},
        {
          shortcut: 'variation-flatten',
          label: i18n.t('menu.edit', '&Flatten'),
          click: () => sabaki.flattenVariation(sabaki.state.treePosition)
        },
        {
          shortcut: 'node-remove',
          label: i18n.t('menu.edit', '&Remove Node'),
          accelerator:
            process.platform === 'darwin'
              ? 'CmdOrCtrl+Backspace'
              : 'CmdOrCtrl+Delete',
          click: () => sabaki.removeNode(sabaki.state.treePosition)
        },
        {
          shortcut: 'variation-remove-others',
          label: i18n.t('menu.edit', 'Remove &Other Variations'),
          click: () => sabaki.removeOtherVariations(sabaki.state.treePosition)
        }
      ]
    },
    {
      id: 'find',
      label: i18n.t('menu.find', 'Fin&d'),
      submenu: [
        {
          shortcut: 'mode',
          label: i18n.t('menu.find', 'Toggle &Find Mode'),
          accelerator: 'CmdOrCtrl+F',
          click: () =>
            sabaki.setMode(sabaki.state.mode === 'find' ? 'play' : 'find')
        },
        {
          shortcut: 'next',
          label: i18n.t('menu.find', 'Find &Next'),
          accelerator: 'F3',
          click: () => {
            sabaki.setMode('find')
            sabaki.findMove(1, {
              vertex: sabaki.state.findVertex,
              text: sabaki.state.findText
            })
          }
        },
        {
          shortcut: 'previous',
          label: i18n.t('menu.find', 'Find &Previous'),
          accelerator: 'Shift+F3',
          click: () => {
            sabaki.setMode('find')
            sabaki.findMove(-1, {
              vertex: sabaki.state.findVertex,
              text: sabaki.state.findText
            })
          }
        },
        {type: 'separator'},
        {
          shortcut: 'hotspot-toggle',
          label: i18n.t('menu.find', 'Toggle &Hotspot'),
          accelerator: 'CmdOrCtrl+B',
          click: () =>
            sabaki.setComment(sabaki.state.treePosition, {
              hotspot:
                sabaki.inferredState.gameTree.get(sabaki.state.treePosition)
                  .data.HO == null
            })
        },
        {
          shortcut: 'hotspot-next',
          label: i18n.t('menu.find', 'Jump to Ne&xt Hotspot'),
          accelerator: 'F2',
          click: () => sabaki.findHotspot(1)
        },
        {
          shortcut: 'hotspot-previous',
          label: i18n.t('menu.find', 'Jump to Pre&vious Hotspot'),
          accelerator: 'Shift+F2',
          click: () => sabaki.findHotspot(-1)
        }
      ]
    },
    {
      id: 'navigation',
      label: i18n.t('menu.navigation', '&Navigation'),
      submenu: [
        {
          shortcut: 'back',
          label: i18n.t('menu.navigation', '&Back'),
          accelerator: 'Up',
          click: () => sabaki.goStep(-1)
        },
        {
          shortcut: 'forward',
          label: i18n.t('menu.navigation', '&Forward'),
          accelerator: 'Down',
          click: () => sabaki.goStep(1)
        },
        {type: 'separator'},
        {
          shortcut: 'fork-previous',
          label: i18n.t('menu.navigation', 'Go to &Previous Fork'),
          accelerator: 'CmdOrCtrl+Up',
          click: () => sabaki.goToPreviousFork()
        },
        {
          shortcut: 'fork-next',
          label: i18n.t('menu.navigation', 'Go to &Next Fork'),
          accelerator: 'CmdOrCtrl+Down',
          click: () => sabaki.goToNextFork()
        },
        {type: 'separator'},
        {
          shortcut: 'comment-previous',
          label: i18n.t('menu.navigation', 'Go to Previous Commen&t'),
          accelerator: 'CmdOrCtrl+Shift+Up',
          click: () => sabaki.goToComment(-1)
        },
        {
          shortcut: 'comment-next',
          label: i18n.t('menu.navigation', 'Go to Next &Comment'),
          accelerator: 'CmdOrCtrl+Shift+Down',
          click: () => sabaki.goToComment(1)
        },
        {type: 'separator'},
        {
          shortcut: 'beginning',
          label: i18n.t('menu.navigation', 'Go to Be&ginning'),
          accelerator: 'Home',
          click: () => sabaki.goToBeginning()
        },
        {
          shortcut: 'end',
          label: i18n.t('menu.navigation', 'Go to &End'),
          accelerator: 'End',
          click: () => sabaki.goToEnd()
        },
        {type: 'separator'},
        {
          shortcut: 'variation-main',
          label: i18n.t('menu.navigation', 'Go to &Main Variation'),
          accelerator: 'CmdOrCtrl+Left',
          click: () => sabaki.goToMainVariation()
        },
        {
          shortcut: 'variation-previous',
          label: i18n.t('menu.navigation', 'Go to Previous &Variation'),
          accelerator: 'Left',
          click: () => sabaki.goToSiblingVariation(-1)
        },
        {
          shortcut: 'variation-next',
          label: i18n.t('menu.navigation', 'Go to Next Va&riation'),
          accelerator: 'Right',
          click: () => sabaki.goToSiblingVariation(1)
        },
        {type: 'separator'},
        {
          shortcut: 'move',
          label: i18n.t('menu.navigation', 'Go to Move N&umber'),
          accelerator: 'CmdOrCtrl+G',
          click: async () => {
            let value = await dialog.showInputBox(
              i18n.t('menu.navigation', 'Enter a move number to go to')
            )
            if (value == null) return

            sabaki.closeDrawer()
            sabaki.goToMoveNumber(value)
          }
        },
        {type: 'separator'},
        {
          shortcut: 'game-next',
          label: i18n.t('menu.navigation', 'Go to Ne&xt Game'),
          accelerator: 'CmdOrCtrl+PageDown',
          click: () => sabaki.goToSiblingGame(1)
        },
        {
          shortcut: 'game-previous',
          label: i18n.t('menu.navigation', 'Go to Previou&s Game'),
          accelerator: 'CmdOrCtrl+PageUp',
          click: () => sabaki.goToSiblingGame(-1)
        }
      ]
    },
    {
      id: 'engines',
      label: i18n.t('menu.engines', 'Eng&ines'),
      submenu: [
        {
          shortcut: 'sidebar',
          label: i18n.t('menu.engines', 'Show &Engines Sidebar'),
          type: 'checkbox',
          checked: !!showLeftSidebar,
          click: () => {
            toggleSetting('view.show_leftsidebar')
            sabaki.setState(({showLeftSidebar}) => ({
              showLeftSidebar: !showLeftSidebar
            }))
          }
        },
        {type: 'separator'},
        {
          shortcut: 'analysis',
          label: i18n.t(
            'menu.engines',
            analysisEngineStatus == 'busy'
              ? 'Pause &Analysis'
              : analysisEngineStatus == 'started'
              ? 'Stop &Analysis'
              : analysisEngineStatus == 'waiting'
              ? 'Deepen &Analysis'
              : 'Start &Analysis'
          ),
          enabled: !!analysisEngineStatus,
          accelerator: 'F4',
          click: () => {
            let syncerId =
              sabaki.lastAnalyzingEngineSyncerId ||
              sabaki.state.attachedEngineSyncers
                .filter(syncer =>
                  syncer.commands.some(x =>
                    setting.get('engines.analyze_commands').includes(x)
                  )
                )
                .map(syncer => syncer.id)[0]

            if (syncerId == null) {
              dialog.showMessageBox(
                i18n.t(
                  'menu.engines',
                  'None of the attached engines support analysis.'
                ),
                'info'
              )
              return
            }

            sabaki.togglePauseAnalysis(syncerId)
          }
        },
        {
          shortcut: 'game',
          label: !engineGameOngoing
            ? i18n.t('menu.engines', 'Start Engine vs. Engine &Game')
            : i18n.t('menu.engines', 'Stop Engine vs. Engine &Game'),
          accelerator: 'F5',
          click: () => {
            sabaki.startStopEngineGame(sabaki.state.treePosition)
          }
        },
        {
          shortcut: 'move',
          label: i18n.t('menu.engines', 'Generate &Move'),
          accelerator: 'F10',
          enabled: !engineGameOngoing,
          click: () => {
            let sign = sabaki.getPlayer(sabaki.state.treePosition)
            let syncerId =
              sign > 0
                ? sabaki.state.blackEngineSyncerId
                : sabaki.state.whiteEngineSyncerId

            if (syncerId == null) {
              dialog.showMessageBox(
                i18n.t(
                  'menu.engines',
                  'Please assign an engine to the player first.'
                ),
                'info'
              )
            }

            sabaki.generateMove(syncerId, sabaki.state.treePosition)
          }
        }
      ]
    },
    {
      id: 'tools',
      label: i18n.t('menu.tools', '&Tools'),
      submenu: [
        {
          shortcut: 'autoplay',
          label: i18n.t('menu.tools', 'Toggle Auto&play Mode'),
          click: () =>
            sabaki.setMode(
              sabaki.state.mode === 'autoplay' ? 'play' : 'autoplay'
            )
        },
        {
          shortcut: 'guess',
          label: i18n.t('menu.tools', 'Toggle &Guess Mode'),
          click: () =>
            sabaki.setMode(sabaki.state.mode === 'guess' ? 'play' : 'guess')
        },
        {type: 'separator'},
        {
          shortcut: 'clean-markup',
          label: i18n.t('menu.tools', 'Clean &Markup…'),
          click: () => sabaki.openDrawer('cleanmarkup')
        },
        {
          shortcut: 'edit-sgf',
          label: i18n.t('menu.tools', '&Edit SGF Properties…'),
          click: () => sabaki.openDrawer('advancedproperties')
        }
      ]
    },
    {
      id: 'view',
      label: i18n.t('menu.view', '&View'),
      submenu: [
        {
          shortcut: 'menubar',
          label: i18n.t('menu.view', 'Toggle Menu &Bar'),
          click: () => toggleSetting('view.show_menubar')
        },
        {
          shortcut: 'full-screen',
          label: i18n.t('menu.view', 'Toggle &Full Screen'),
          accelerator:
            process.platform === 'darwin' ? 'CmdOrCtrl+Shift+F' : 'F11',
          click: () =>
            sabaki.setState(({fullScreen}) => ({fullScreen: !fullScreen}))
        },
        {type: 'separator'},
        {
          id: 'coordinates',
          label: i18n.t('menu.view', 'Show &Coordinates'),
          submenu: [
            {
              shortcut: 'show',
              label: i18n.t('menu.view', '&Don’t Show'),
              accelerator: 'CmdOrCtrl+Shift+C',
              type: 'checkbox',
              checked: !showCoordinates,
              click: () => toggleSetting('view.show_coordinates')
            },
            {type: 'separator'},
            {
              shortcut: 'A1',
              label: i18n.t('menu.view', '&A1 (Default)'),
              type: 'checkbox',
              checked: !!showCoordinates && coordinatesType === 'A1',
              click: () => {
                setting.set('view.show_coordinates', true)
                setting.set('view.coordinates_type', 'A1')
              }
            },
            {
              shortcut: '1-1',
              label: i18n.t('menu.view', '&1-1'),
              type: 'checkbox',
              checked: !!showCoordinates && coordinatesType === '1-1',
              click: () => {
                setting.set('view.show_coordinates', true)
                setting.set('view.coordinates_type', '1-1')
              }
            },
            {
              shortcut: 'relative',
              label: i18n.t('menu.view', '&Relative'),
              type: 'checkbox',
              checked: !!showCoordinates && coordinatesType === 'relative',
              click: () => {
                setting.set('view.show_coordinates', true)
                setting.set('view.coordinates_type', 'relative')
              }
            }
          ]
        },
        {
          shortcut: 'move-numbers',
          label: i18n.t('menu.view', 'Show Move N&umbers'),
          type: 'checkbox',
          checked: !!showMoveNumbers,
          click: () => toggleSetting('view.show_move_numbers')
        },
        {
          shortcut: 'move-colorize',
          label: i18n.t('menu.view', 'Show Move Colori&zation'),
          type: 'checkbox',
          checked: !!showMoveColorization,
          click: () => toggleSetting('view.show_move_colorization')
        },
        {
          shortcut: 'move-next',
          label: i18n.t('menu.view', 'Show &Next Moves'),
          type: 'checkbox',
          checked: !!showNextMoves,
          click: () => toggleSetting('view.show_next_moves')
        },
        {
          shortcut: 'variation-sibling',
          label: i18n.t('menu.view', 'Show &Sibling Variations'),
          type: 'checkbox',
          checked: !!showSiblings,
          click: () => toggleSetting('view.show_siblings')
        },
        {
          id: 'heatmap',
          label: i18n.t('menu.view', 'Show &Heatmap'),
          submenu: [
            {
              shortcut: 'show',
              label: i18n.t('menu.view', '&Don’t Show'),
              type: 'checkbox',
              checked: !showAnalysis,
              accelerator: 'CmdOrCtrl+H',
              click: () => toggleSetting('board.show_analysis')
            },
            {type: 'separator'},
            {
              shortcut: 'winrate',
              label: i18n.t('menu.view', 'Show &Win Rate'),
              type: 'checkbox',
              checked: !!showAnalysis && analysisType === 'winrate',
              accelerator: 'CmdOrCtrl+Shift+H',
              click: () => {
                setting.set('board.show_analysis', true)
                setting.set(
                  'board.analysis_type',
                  setting.get('board.analysis_type') === 'winrate'
                    ? 'scoreLead'
                    : 'winrate'
                )
              }
            },
            {
              shortcut: 'score',
              label: i18n.t('menu.view', 'Show &Score Lead'),
              type: 'checkbox',
              checked: !!showAnalysis && analysisType === 'scoreLead',
              accelerator: 'CmdOrCtrl+Shift+H',
              click: () => {
                setting.set('board.show_analysis', true)
                setting.set(
                  'board.analysis_type',
                  setting.get('board.analysis_type') === 'scoreLead'
                    ? 'winrate'
                    : 'scoreLead'
                )
              }
            }
          ]
        },
        {
          shortcut: 'influence',
          label: i18n.t('menu.view', 'Show &Influence Map'),
          type: 'checkbox',
          checked: !!showInfluence,
          accelerator: 'CmdOrCtrl+.',
          click: () => toggleSetting('board.show_influence')
        },
        {type: 'separator'},
        {
          shortcut: 'graph',
          label: i18n.t('menu.view', 'Show &Winrate Graph'),
          type: 'checkbox',
          checked: !!showWinrateGraph,
          enabled: !!showGameGraph || !!showCommentBox,
          click: () => {
            toggleSetting('view.show_winrategraph')
            sabaki.setState(({showWinrateGraph}) => ({
              showWinrateGraph: !showWinrateGraph
            }))
          }
        },
        {
          shortcut: 'tree',
          label: i18n.t('menu.view', 'Show Game &Tree'),
          type: 'checkbox',
          checked: !!showGameGraph,
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            toggleSetting('view.show_graph')
            sabaki.setState(({showGameGraph}) => ({
              showGameGraph: !showGameGraph
            }))
          }
        },
        {
          shortcut: 'comments',
          label: i18n.t('menu.view', 'Show Co&mments'),
          type: 'checkbox',
          checked: !!showCommentBox,
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => {
            toggleSetting('view.show_comments')
            sabaki.setState(({showCommentBox}) => ({
              showCommentBox: !showCommentBox
            }))
          }
        },
        {type: 'separator'},
        {
          id: 'zoom',
          label: i18n.t('menu.view', 'Z&oom'),
          submenu: [
            {
              shortcut: 'increase',
              label: i18n.t('menu.view', '&Increase'),
              accelerator: 'CmdOrCtrl+Plus',
              click: () =>
                setting.set(
                  'app.zoom_factor',
                  setting.get('app.zoom_factor') + 0.1
                )
            },
            {
              shortcut: 'decrease',
              label: i18n.t('menu.view', '&Decrease'),
              accelerator: 'CmdOrCtrl+-',
              click: () =>
                setting.set(
                  'app.zoom_factor',
                  Math.max(0, setting.get('app.zoom_factor') - 0.1)
                )
            },
            {
              shortcut: 'reset',
              label: i18n.t('menu.view', '&Reset'),
              accelerator: 'CmdOrCtrl+0',
              click: () => setting.set('app.zoom_factor', 1)
            }
          ]
        },
        {
          id: 'board',
          label: i18n.t('menu.view', 'T&ransform Board'),
          submenu: [
            {
              shortcut: 'rotate-anticlockwise',
              label: i18n.t('menu.tools', 'Rotate &Anticlockwise'),
              accelerator: 'CmdOrCtrl+Alt+Left',
              click: () => sabaki.pushBoardTransformation('rrr')
            },
            {
              shortcut: 'rotate-clockwise',
              label: i18n.t('menu.tools', 'Rotate &Clockwise'),
              accelerator: 'CmdOrCtrl+Alt+Right',
              click: () => sabaki.pushBoardTransformation('r')
            },
            {
              shortcut: 'flip-horizontally',
              label: i18n.t('menu.tools', '&Flip Horizontally'),
              accelerator: 'CmdOrCtrl+Alt+Down',
              click: () => sabaki.pushBoardTransformation('f')
            },
            {
              shortcut: 'flip-vertically',
              label: i18n.t('menu.tools', 'Flip &Vertically'),
              accelerator: 'CmdOrCtrl+Alt+Shift+Down',
              click: () => sabaki.pushBoardTransformation('rrf')
            },
            {
              shortcut: 'invert-colors',
              label: i18n.t('menu.tools', '&Invert Colors'),
              accelerator: 'CmdOrCtrl+Alt+Up',
              click: () => sabaki.pushBoardTransformation('i')
            },
            {
              shortcut: 'reset',
              label: i18n.t('menu.tools', '&Reset'),
              accelerator: 'CmdOrCtrl+Alt+0',
              click: () => sabaki.setBoardTransformation('')
            }
          ]
        }
      ]
    },
    process.platform === 'darwin' && {
      submenu: [
        {
          label: i18n.t('menu.file', 'New &Window'),
          clickMain: 'newWindow',
          neverDisable: true
        },
        {role: 'minimize'},
        {role: 'close'},
        {type: 'separator'},
        {role: 'front'}
      ],
      role: 'window'
    },
    {
      id: 'help',
      label: i18n.t('menu.help', '&Help'),
      submenu: [
        {
          label: i18n.t('menu.help', p => `${p.appName} v${p.version}`, {
            appName: app.name,
            version: app.getVersion()
          }),
          enabled: false
        },
        {
          label: i18n.t('menu.help', 'Check for &Updates'),
          clickMain: 'checkForUpdates',
          neverDisable: true
        },
        {type: 'separator'},
        {
          label: i18n.t('menu.help', 'GitHub &Repository'),
          click: () =>
            shell.openExternal(`https://github.com/SabakiHQ/${sabaki.appName}`)
        },
        {
          label: i18n.t('menu.help', 'Report &Issue'),
          click: () =>
            shell.openExternal(
              `https://github.com/SabakiHQ/${sabaki.appName}/issues`
            )
        }
      ]
    },
    setting.get('debug.dev_tools') && {
      id: 'developer',
      label: i18n.t('menu.developer', 'Devel&oper'),
      submenu: [
        {
          label: i18n.t('menu.developer', 'Open Settings &Folder'),
          click: () => shell.showItemInFolder(setting.settingsPath),
          neverDisable: true
        },
        {
          label: i18n.t('menu.developer', 'Toggle &Developer Tools'),
          click: () => sabaki.window.webContents.toggleDevTools(),
          neverDisable: true
        },
        {type: 'separator'},
        {
          label: i18n.t('menu.developer', 'Load &Language File…'),
          click: () => {
            let t = i18n.context('menu.developer')

            dialog.showMessageBox(
              t(
                [
                  'A language file is basically a JavaScript file and can be used to execute arbitrary code on your computer.',
                  'It can be extremely dangerous, so it is recommended to only load language files from authors you trust.'
                ].join('\n\n')
              ),
              'warning',
              [t('I understand')]
            )

            let result = dialog.showOpenDialog({
              properties: ['openFile'],
              filters: [
                {
                  name: i18n.t('menu.developer', 'JavaScript Files'),
                  extensions: ['js']
                }
              ]
            })
            if (!result || result.length === 0) return

            i18n.loadFile(result[0])
          }
        },
        {
          label: i18n.t('menu.developer', '&Unload Language File'),
          click: () => {
            i18n.loadFile(null)
          }
        }
      ]
    }
  ].filter(x => !!x)

  let findMenuItem = str => data.find(item => item.id === str)

  // Modify menu for macOS

  if (process.platform === 'darwin') {
    // Add 'App' menu

    let appMenu = [{role: 'about'}]
    let helpMenu = findMenuItem('help')
    let items = helpMenu.submenu.splice(0, 3)

    appMenu.push(...items.slice(0, 2))

    // Remove original 'Preferences' and 'Quit' menu items

    let fileMenu = findMenuItem('file')
    let preferenceItem = fileMenu.submenu.splice(
      fileMenu.submenu.length - 4,
      4
    )[1]

    appMenu.push(
      {type: 'separator'},
      preferenceItem,
      {type: 'separator'},
      {submenu: [], role: 'services'},
      {
        label: i18n.t('menu.macos', 'Text'),
        submenu: [
          {role: 'cut'},
          {role: 'copy'},
          {role: 'paste'},
          {role: 'selectall'}
        ]
      },
      {type: 'separator'},
      {role: 'hide'},
      {role: 'hideothers'},
      {type: 'separator'},
      {role: 'quit'}
    )

    data.unshift({
      label: app.name,
      submenu: appMenu
    })

    // Remove 'Toggle Menu Bar' menu item

    let viewMenu = findMenuItem('view')
    viewMenu.submenu.splice(0, 1)
  }

  let processMenu = (menu, idPrefix = '') => {
    menu.forEach((item, i) => {
      // Generate id

      if (item.id == null) {
        item.id = idPrefix + i
      }

      // Advertize or get accelerator in settings

      let shortcut = item.shortcut
      if (shortcut) {
        shortcut = idPrefix + shortcut

        if (shortcut in shortcuts) {
          if (shortcuts[shortcut]) item.accelerator = shortcuts[shortcut]
          else {
            delete item.accelerator
          }
        }

        shortcuts[shortcut] = item.accelerator ? item.accelerator : ''
      }

      // Handle disableAll prop

      if (
        disableAll &&
        !item.neverDisable &&
        !('submenu' in item || 'role' in item)
      ) {
        item.enabled = false
      }

      if ('submenu' in item) {
        processMenu(item.submenu, `${item.id}-`)
      }
    })

    return menu
  }

  let shortcuts = setting.get('app.shortcuts')
  let menu = processMenu(data)
  setting.set('app.shortcuts', shortcuts)

  return menu
}
