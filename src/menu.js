const nativeRequire = eval('require')

const {shell, clipboard, remote} = require('electron')
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
    engineGameOngoing
  } = props

  let data = [
    {
      id: 'file',
      label: i18n.t('menu.file', '&File'),
      submenu: [
        {
          label: i18n.t('menu.file', '&New'),
          accelerator: setting.get('shortcut.menu.file.new'),
          enabled: !disableGameLoading,
          click: () => sabaki.newFile({playSound: true, showInfo: true})
        },
        {
          label: i18n.t('menu.file', 'New &Window'),
          accelerator: setting.get('shortcut.menu.file.new_window'),
          clickMain: 'newWindow',
          neverDisable: true
        },
        {type: 'separator'},
        {
          label: i18n.t('menu.file', '&Open…'),
          accelerator: setting.get('shortcut.menu.file.open'),
          enabled: !disableGameLoading,
          click: () => sabaki.loadFile()
        },
        {
          label: i18n.t('menu.file', '&Save'),
          accelerator: setting.get('shortcut.menu.file.save'),
          click: () => sabaki.saveFile(sabaki.state.representedFilename)
        },
        {
          label: i18n.t('menu.file', 'Sa&ve As…'),
          accelerator: setting.get('shortcut.menu.file.save_as'),
          click: () => sabaki.saveFile()
        },
        {type: 'separator'},
        {
          label: i18n.t('menu.file', '&Clipboard'),
          submenu: [
            {
              label: i18n.t('menu.file', '&Load SGF'),
              accelerator: setting.get('shortcut.menu.file.clipboard.load_sgf'),
              enabled: !disableGameLoading,
              click: () => sabaki.loadContent(clipboard.readText(), 'sgf')
            },
            {
              label: i18n.t('menu.file', '&Copy SGF'),
              accelerator: setting.get('shortcut.menu.file.clipboard.copy_sgf'),
              click: () => clipboard.writeText(sabaki.getSGF())
            },
            {
              label: i18n.t('menu.file', 'Copy &ASCII Diagram'),
              accelerator: setting.get(
                'shortcut.menu.file.clipboard.copy_ascii_diagram'
              ),
              click: () => clipboard.writeText(sabaki.getBoardAscii())
            }
          ]
        },
        {type: 'separator'},
        {
          label: i18n.t('menu.file', 'Game &Info'),
          accelerator: setting.get('shortcut.menu.file.game_info'),
          click: () => sabaki.openDrawer('info')
        },
        {
          label: i18n.t('menu.file', '&Manage Games…'),
          accelerator: setting.get('shortcut.menu.file.manage_games'),
          enabled: !disableGameLoading,
          click: () => sabaki.openDrawer('gamechooser')
        },
        {type: 'separator'},
        {
          label: i18n.t('menu.file', '&Preferences…'),
          accelerator: setting.get('shortcut.menu.file.preferences'),
          click: () => sabaki.openDrawer('preferences')
        }
      ]
    },
    {
      id: 'play',
      label: i18n.t('menu.play', '&Play'),
      submenu: [
        {
          label: i18n.t('menu.play', '&Toggle Player'),
          accelerator: setting.get('shortcut.menu.play.toggle_player'),
          click: () =>
            sabaki.setPlayer(
              sabaki.state.treePosition,
              -sabaki.getPlayer(sabaki.state.treePosition)
            )
        },
        {type: 'separator'},
        {
          label: i18n.t('menu.play', 'Se&lect Point'),
          accelerator: setting.get('shortcut.menu.play.select_point'),
          click: async () => {
            let value = await dialog.showInputBox(
              i18n.t('menu.play', 'Enter a coordinate to select a point')
            )
            if (value == null) return

            sabaki.clickVertex(value)
          }
        },
        {
          label: i18n.t('menu.play', '&Pass'),
          accelerator: setting.get('shortcut.menu.play.pass'),
          click: () => sabaki.makeMove([-1, -1])
        },
        {
          label: i18n.t('menu.play', 'Resig&n'),
          accelerator: setting.get('shortcut.menu.play.resign'),
          click: () => sabaki.makeResign()
        },
        {type: 'separator'},
        {
          label: i18n.t('menu.play', '&Estimate'),
          accelerator: setting.get('shortcut.menu.play.estimate'),
          click: () =>
            sabaki.setMode(
              sabaki.state.mode === 'estimator' ? 'play' : 'estimator'
            )
        },
        {
          label: i18n.t('menu.play', 'Sco&re'),
          accelerator: setting.get('shortcut.menu.play.score'),
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
          label: i18n.t('menu.edit', '&Undo'),
          accelerator: setting.get('shortcut.menu.edit.undo'),
          click: () => sabaki.undo()
        },
        {
          label: i18n.t('menu.edit', 'Re&do'),
          accelerator: setting.get(
            process.platform === 'win32'
              ? 'shortcut.menu.edit.redo.win32'
              : 'shortcut.menu.edit.redo.not_windows'
          ),
          click: () => sabaki.redo()
        },
        {type: 'separator'},
        {
          label: i18n.t('menu.edit', 'Toggle &Edit Mode'),
          accelerator: setting.get('shortcut.menu.edit.toggle_edit_mode'),
          click: () =>
            sabaki.setMode(sabaki.state.mode === 'edit' ? 'play' : 'edit')
        },
        {
          label: i18n.t('menu.edit', '&Select Tool'),
          submenu: [
            {
              label: i18n.t('menu.edit', '&Stone Tool'),
              accelerator: setting.get(
                'shortcut.menu.edit.select_tool.stone_tool'
              ),
              click: () =>
                selectTool(
                  sabaki.state.mode !== 'edit' ||
                    sabaki.state.selectedTool !== 'stone_1'
                    ? 'stone_1'
                    : 'stone_-1'
                )
            },
            {
              label: i18n.t('menu.edit', '&Cross Tool'),
              accelerator: setting.get(
                'shortcut.menu.edit.select_tool.cross_tool'
              ),
              click: () => selectTool('cross')
            },
            {
              label: i18n.t('menu.edit', '&Triangle Tool'),
              accelerator: setting.get(
                'shortcut.menu.edit.select_tool.triangle_tool'
              ),
              click: () => selectTool('triangle')
            },
            {
              label: i18n.t('menu.edit', 'S&quare Tool'),
              accelerator: setting.get(
                'shortcut.menu.edit.select_tool.square_tool'
              ),
              click: () => selectTool('square')
            },
            {
              label: i18n.t('menu.edit', 'C&ircle Tool'),
              accelerator: setting.get(
                'shortcut.menu.edit.select_tool.circle_tool'
              ),
              click: () => selectTool('circle')
            },
            {
              label: i18n.t('menu.edit', '&Line Tool'),
              accelerator: setting.get(
                'shortcut.menu.edit.select_tool.line_tool'
              ),
              click: () => selectTool('line')
            },
            {
              label: i18n.t('menu.edit', '&Arrow Tool'),
              accelerator: setting.get(
                'shortcut.menu.edit.select_tool.arrow_tool'
              ),
              click: () => selectTool('arrow')
            },
            {
              label: i18n.t('menu.edit', 'La&bel Tool'),
              accelerator: setting.get(
                'shortcut.menu.edit.select_tool.label_tool'
              ),
              click: () => selectTool('label')
            },
            {
              label: i18n.t('menu.edit', '&Number Tool'),
              accelerator: setting.get(
                'shortcut.menu.edit.select_tool.number_tool'
              ),
              click: () => selectTool('number')
            }
          ]
        },
        {type: 'separator'},
        {
          label: i18n.t('menu.edit', '&Copy Variation'),
          accelerator: setting.get('shortcut.menu.edit.copy_variation'),
          click: () => sabaki.copyVariation(sabaki.state.treePosition)
        },
        {
          label: i18n.t('menu.edit', 'Cu&t Variation'),
          accelerator: setting.get('shortcut.menu.edit.cut_variation'),
          click: () => sabaki.cutVariation(sabaki.state.treePosition)
        },
        {
          label: i18n.t('menu.edit', '&Paste Variation'),
          accelerator: setting.get('shortcut.menu.edit.paste_variation'),
          click: () => sabaki.pasteVariation(sabaki.state.treePosition)
        },
        {type: 'separator'},
        {
          label: i18n.t('menu.edit', 'Make Main &Variation'),
          accelerator: setting.get('shortcut.menu.edit.make_main_variation'),
          click: () => sabaki.makeMainVariation(sabaki.state.treePosition)
        },
        {
          label: i18n.t('menu.edit', 'Shift &Left'),
          accelerator: setting.get('shortcut.menu.edit.shift_left'),
          click: () => sabaki.shiftVariation(sabaki.state.treePosition, -1)
        },
        {
          label: i18n.t('menu.edit', 'Shift Ri&ght'),
          accelerator: setting.get('shortcut.menu.edit.shift_right'),
          click: () => sabaki.shiftVariation(sabaki.state.treePosition, 1)
        },
        {type: 'separator'},
        {
          label: i18n.t('menu.edit', '&Flatten'),
          accelerator: setting.get('shortcut.menu.edit.flatten'),
          click: () => sabaki.flattenVariation(sabaki.state.treePosition)
        },
        {
          label: i18n.t('menu.edit', '&Remove Node'),
          accelerator: setting.get(
            process.platform === 'darwin'
              ? 'shortcut.menu.edit.remove_node.darwin'
              : 'shortcut.menu.edit.remove_node.not_darwin'
          ),
          click: () => sabaki.removeNode(sabaki.state.treePosition)
        },
        {
          label: i18n.t('menu.edit', 'Remove &Other Variations'),
          accelerator: setting.get(
            'shortcut.menu.edit.remove_other_variations'
          ),
          click: () => sabaki.removeOtherVariations(sabaki.state.treePosition)
        }
      ]
    },
    {
      id: 'find',
      label: i18n.t('menu.find', 'Fin&d'),
      submenu: [
        {
          label: i18n.t('menu.find', 'Toggle &Find Mode'),
          accelerator: setting.get('shortcut.menu.find.toggle_find_mode'),
          click: () =>
            sabaki.setMode(sabaki.state.mode === 'find' ? 'play' : 'find')
        },
        {
          label: i18n.t('menu.find', 'Find &Next'),
          accelerator: setting.get('shortcut.menu.find.find_next'),
          click: () => {
            sabaki.setMode('find')
            sabaki.findMove(1, {
              vertex: sabaki.state.findVertex,
              text: sabaki.state.findText
            })
          }
        },
        {
          label: i18n.t('menu.find', 'Find &Previous'),
          accelerator: setting.get('shortcut.menu.find.find_previous'),
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
          label: i18n.t('menu.find', 'Toggle &Hotspot'),
          accelerator: setting.get('shortcut.menu.find.toggle_hotspot'),
          click: () =>
            sabaki.setComment(sabaki.state.treePosition, {
              hotspot:
                sabaki.inferredState.gameTree.get(sabaki.state.treePosition)
                  .data.HO == null
            })
        },
        {
          label: i18n.t('menu.find', 'Jump to Ne&xt Hotspot'),
          accelerator: setting.get('shortcut.menu.find.jump_to_next_hotspot'),
          click: () => sabaki.findHotspot(1)
        },
        {
          label: i18n.t('menu.find', 'Jump to Pre&vious Hotspot'),
          accelerator: setting.get(
            'shortcut.menu.find.jump_to_previous_hotspot'
          ),
          click: () => sabaki.findHotspot(-1)
        }
      ]
    },
    {
      id: 'navigation',
      label: i18n.t('menu.navigation', '&Navigation'),
      submenu: [
        {
          label: i18n.t('menu.navigation', '&Back'),
          accelerator: setting.get('shortcut.menu.navigation.back'),
          click: () => sabaki.goStep(-1)
        },
        {
          label: i18n.t('menu.navigation', '&Forward'),
          accelerator: setting.get('shortcut.menu.navigation.down'),
          click: () => sabaki.goStep(1)
        },
        {type: 'separator'},
        {
          label: i18n.t('menu.navigation', 'Go to &Previous Fork'),
          accelerator: setting.get(
            'shortcut.menu.navigation.go_to_previous_fork'
          ),
          click: () => sabaki.goToPreviousFork()
        },
        {
          label: i18n.t('menu.navigation', 'Go to &Next Fork'),
          accelerator: setting.get('shortcut.menu.navigation.go_to_next_fork'),
          click: () => sabaki.goToNextFork()
        },
        {type: 'separator'},
        {
          label: i18n.t('menu.navigation', 'Go to Previous Commen&t'),
          accelerator: setting.get(
            'shortcut.menu.navigation.go_to_previous_comment'
          ),
          click: () => sabaki.goToComment(-1)
        },
        {
          label: i18n.t('menu.navigation', 'Go to Next &Comment'),
          accelerator: setting.get(
            'shortcut.menu.navigation.go_to_next_comment'
          ),
          click: () => sabaki.goToComment(1)
        },
        {type: 'separator'},
        {
          label: i18n.t('menu.navigation', 'Go to Be&ginning'),
          accelerator: setting.get('shortcut.menu.navigation.go_to_beginning'),
          click: () => sabaki.goToBeginning()
        },
        {
          label: i18n.t('menu.navigation', 'Go to &End'),
          accelerator: setting.get('shortcut.menu.navigation.go_to_end'),
          click: () => sabaki.goToEnd()
        },
        {type: 'separator'},
        {
          label: i18n.t('menu.navigation', 'Go to &Main Variation'),
          accelerator: setting.get(
            'shortcut.menu.navigation.go_to_main_variation'
          ),
          click: () => sabaki.goToMainVariation()
        },
        {
          label: i18n.t('menu.navigation', 'Go to Previous &Variation'),
          accelerator: setting.get(
            'shortcut.menu.navigation.go_to_previous_variation'
          ),
          click: () => sabaki.goToSiblingVariation(-1)
        },
        {
          label: i18n.t('menu.navigation', 'Go to Next Va&riation'),
          accelerator: setting.get(
            'shortcut.menu.navigation.go_to_next_variation'
          ),
          click: () => sabaki.goToSiblingVariation(1)
        },
        {type: 'separator'},
        {
          label: i18n.t('menu.navigation', 'Go to Move N&umber'),
          accelerator: setting.get(
            'shortcut.menu.navigation.go_to_move_number'
          ),
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
          label: i18n.t('menu.navigation', 'Go to Ne&xt Game'),
          accelerator: setting.get('shortcut.menu.navigation.go_to_next_game'),
          click: () => sabaki.goToSiblingGame(1)
        },
        {
          label: i18n.t('menu.navigation', 'Go to Previou&s Game'),
          accelerator: setting.get(
            'shortcut.menu.navigation.go_to_previous_game'
          ),
          click: () => sabaki.goToSiblingGame(-1)
        }
      ]
    },
    {
      id: 'engines',
      label: i18n.t('menu.engines', 'Eng&ines'),
      submenu: [
        {
          label: i18n.t('menu.engines', 'Show &Engines Sidebar'),
          accelerator: setting.get(
            'shortcut.menu.engines.show_engines_sidebar'
          ),
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
          label: i18n.t('menu.engines', 'Toggle &Analysis'),
          accelerator: setting.get('shortcut.menu.engines.toggle_analysis'),
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

            if (sabaki.state.analyzingEngineSyncerId == null) {
              sabaki.startAnalysis(syncerId)
            } else {
              sabaki.stopAnalysis()
            }
          }
        },
        {
          label: !engineGameOngoing
            ? i18n.t('menu.engines', 'Start Engine vs. Engine &Game')
            : i18n.t('menu.engines', 'Stop Engine vs. Engine &Game'),
          accelerator: setting.get(
            'shortcut.menu.engines.start_stop_engine_game'
          ),
          click: () => {
            sabaki.startStopEngineGame(sabaki.state.treePosition)
          }
        },
        {
          label: i18n.t('menu.engines', 'Generate &Move'),
          accelerator: setting.get('shortcut.menu.engines.generate_move'),
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
          label: i18n.t('menu.tools', 'Toggle Auto&play Mode'),
          accelerator: setting.get('shortcut.menu.tools.toggle_autoplay_mode'),
          click: () =>
            sabaki.setMode(
              sabaki.state.mode === 'autoplay' ? 'play' : 'autoplay'
            )
        },
        {
          label: i18n.t('menu.tools', 'Toggle &Guess Mode'),
          accelerator: setting.get('shortcut.menu.tools.toggle_guess_mode'),
          click: () =>
            sabaki.setMode(sabaki.state.mode === 'guess' ? 'play' : 'guess')
        },
        {type: 'separator'},
        {
          label: i18n.t('menu.tools', 'Clean &Markup…'),
          accelerator: setting.get('shortcut.menu.tools.clean_markup'),
          click: () => sabaki.openDrawer('cleanmarkup')
        },
        {
          label: i18n.t('menu.tools', '&Edit SGF Properties…'),
          accelerator: setting.get('shortcut.menu.tools.edit_sgf_properties'),
          click: () => sabaki.openDrawer('advancedproperties')
        }
      ]
    },
    {
      id: 'view',
      label: i18n.t('menu.view', '&View'),
      submenu: [
        {
          label: i18n.t('menu.view', 'Toggle Menu &Bar'),
          accelerator: setting.get('shortcut.menu.view.toggle_menu_bar'),
          click: () => toggleSetting('view.show_menubar')
        },
        {
          label: i18n.t('menu.view', 'Toggle &Full Screen'),
          accelerator: setting.get(
            process.platform === 'darwin'
              ? 'shortcut.menu.view.toggle_full_screen.darwin'
              : 'shortcut.menu.view.toggle_full_screen.not_darwin'
          ),
          click: () =>
            sabaki.setState(({fullScreen}) => ({fullScreen: !fullScreen}))
        },
        {type: 'separator'},
        {
          label: i18n.t('menu.view', 'Show &Coordinates'),
          submenu: [
            {
              label: i18n.t('menu.view', '&Don’t Show'),
              accelerator: setting.get(
                'shortcut.menu.view.coordinates.dont_show'
              ),
              type: 'checkbox',
              checked: !showCoordinates,
              click: () => toggleSetting('view.show_coordinates')
            },
            {type: 'separator'},
            {
              label: i18n.t('menu.view', '&A1 (Default)'),
              accelerator: setting.get('shortcut.menu.view.coordinates.a1'),
              type: 'checkbox',
              checked: !!showCoordinates && coordinatesType === 'A1',
              click: () => {
                setting.set('view.show_coordinates', true)
                setting.set('view.coordinates_type', 'A1')
              }
            },
            {
              label: i18n.t('menu.view', '&1-1'),
              accelerator: setting.get('shortcut.menu.view.coordinates.1_1'),
              type: 'checkbox',
              checked: !!showCoordinates && coordinatesType === '1-1',
              click: () => {
                setting.set('view.show_coordinates', true)
                setting.set('view.coordinates_type', '1-1')
              }
            },
            {
              label: i18n.t('menu.view', '&Relative'),
              accelerator: setting.get(
                'shortcut.menu.view.coordinates.relative'
              ),
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
          label: i18n.t('menu.view', 'Show Move N&umbers'),
          accelerator: setting.get('shortcut.menu.view.show_move_numbers'),
          type: 'checkbox',
          checked: !!showMoveNumbers,
          click: () => toggleSetting('view.show_move_numbers')
        },
        {
          label: i18n.t('menu.view', 'Show Move Colori&zation'),
          accelerator: setting.get('shortcut.menu.view.show_move_colorization'),
          type: 'checkbox',
          checked: !!showMoveColorization,
          click: () => toggleSetting('view.show_move_colorization')
        },
        {
          label: i18n.t('menu.view', 'Show &Next Moves'),
          accelerator: setting.get('shortcut.menu.view.show_next_moves'),
          type: 'checkbox',
          checked: !!showNextMoves,
          click: () => toggleSetting('view.show_next_moves')
        },
        {
          label: i18n.t('menu.view', 'Show &Sibling Variations'),
          accelerator: setting.get(
            'shortcut.menu.view.show_sibling_variations'
          ),
          type: 'checkbox',
          checked: !!showSiblings,
          click: () => toggleSetting('view.show_siblings')
        },
        {
          label: i18n.t('menu.view', 'Show &Heatmap'),
          submenu: [
            {
              label: i18n.t('menu.view', '&Don’t Show'),
              accelerator: setting.get(
                'shortcut.menu.view.show_heatmap.dont_show'
              ),
              type: 'checkbox',
              checked: !showAnalysis,
              click: () => toggleSetting('board.show_analysis')
            },
            {type: 'separator'},
            {
              label: i18n.t('menu.view', 'Show &Win Rate'),
              accelerator: setting.get(
                'shortcut.menu.view.show_heatmap.show_win_rate'
              ),
              type: 'checkbox',
              checked: !!showAnalysis && analysisType === 'winrate',
              click: () => {
                setting.set('board.show_analysis', true)
                setting.set('board.analysis_type', 'winrate')
              }
            },
            {
              label: i18n.t('menu.view', 'Show &Score Lead'),
              accelerator: setting.get(
                'shortcut.menu.view.show_heatmap.show_score_lead'
              ),
              type: 'checkbox',
              checked: !!showAnalysis && analysisType === 'scoreLead',
              click: () => {
                setting.set('board.show_analysis', true)
                setting.set('board.analysis_type', 'scoreLead')
              }
            }
          ]
        },
        {type: 'separator'},
        {
          label: i18n.t('menu.view', 'Show &Winrate Graph'),
          accelerator: setting.get('shortcut.menu.view.show_winrate_graph'),
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
          label: i18n.t('menu.view', 'Show Game &Tree'),
          accelerator: setting.get('shortcut.menu.view.show_game_tree'),
          type: 'checkbox',
          checked: !!showGameGraph,
          click: () => {
            toggleSetting('view.show_graph')
            sabaki.setState(({showGameGraph}) => ({
              showGameGraph: !showGameGraph
            }))
          }
        },
        {
          label: i18n.t('menu.view', 'Show Co&mments'),
          accelerator: setting.get('shortcut.menu.view.show_comments'),
          type: 'checkbox',
          checked: !!showCommentBox,
          click: () => {
            toggleSetting('view.show_comments')
            sabaki.setState(({showCommentBox}) => ({
              showCommentBox: !showCommentBox
            }))
          }
        },
        {type: 'separator'},
        {
          label: i18n.t('menu.view', 'Z&oom'),
          submenu: [
            {
              label: i18n.t('menu.view', '&Increase'),
              accelerator: setting.get('shortcut.menu.view.zoom.increase'),
              click: () =>
                setting.set(
                  'app.zoom_factor',
                  setting.get('app.zoom_factor') + 0.1
                )
            },
            {
              label: i18n.t('menu.view', '&Decrease'),
              accelerator: setting.get('shortcut.menu.view.zoom.decrease'),
              click: () =>
                setting.set(
                  'app.zoom_factor',
                  Math.max(0, setting.get('app.zoom_factor') - 0.1)
                )
            },
            {
              label: i18n.t('menu.view', '&Reset'),
              accelerator: setting.get('shortcut.menu.view.zoom.reset'),
              click: () => setting.set('app.zoom_factor', 1)
            }
          ]
        },
        {
          label: i18n.t('menu.view', 'T&ransform Board'),
          submenu: [
            {
              label: i18n.t('menu.tools', 'Rotate &Anticlockwise'),
              accelerator: setting.get(
                'shortcut.menu.view.transform_board.rotate_anticlockwise'
              ),
              click: () => sabaki.pushBoardTransformation('rrr')
            },
            {
              label: i18n.t('menu.tools', 'Rotate &Clockwise'),
              accelerator: setting.get(
                'shortcut.menu.view.transform_board.rotate_clockwise'
              ),
              click: () => sabaki.pushBoardTransformation('r')
            },
            {
              label: i18n.t('menu.tools', '&Flip Horizontally'),
              accelerator: setting.get(
                'shortcut.menu.view.transform_board.flip_horizontally'
              ),
              click: () => sabaki.pushBoardTransformation('f')
            },
            {
              label: i18n.t('menu.tools', 'Flip &Vertically'),
              accelerator: setting.get(
                'shortcut.menu.view.transform_board.flip_vertically'
              ),
              click: () => sabaki.pushBoardTransformation('rrf')
            },
            {
              label: i18n.t('menu.tools', '&Invert Colors'),
              accelerator: setting.get(
                'shortcut.menu.view.transform_board.invert_colors'
              ),
              click: () => sabaki.pushBoardTransformation('i')
            },
            {
              label: i18n.t('menu.tools', '&Reset'),
              accelerator: setting.get(
                'shortcut.menu.view.transform_board.reset'
              ),
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

    // Remove original 'Preferences' menu item

    let fileMenu = findMenuItem('file')
    let preferenceItem = fileMenu.submenu.splice(
      fileMenu.submenu.length - 2,
      2
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

  return processMenu(data)
}
