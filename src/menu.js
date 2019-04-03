const nativeRequire = eval('require')

const {shell, clipboard, remote} = require('electron')
const isRenderer = remote != null
const {app} = isRenderer ? remote : require('electron')

const i18n = require('./i18n')
const t = i18n.t
const setting = isRenderer ? remote.require('./setting') : nativeRequire('./setting')

const sabaki = isRenderer ? window.sabaki : null
const dialog = isRenderer ? require('./modules/dialog') : null
const gametree = isRenderer ? require('./modules/gametree') : null

let toggleSetting = key => setting.set(key, !setting.get(key))
let selectTool = tool => (sabaki.setMode('edit'), sabaki.setState({selectedTool: tool}))
let treePosition = () => [sabaki.state.gameTrees[sabaki.state.gameIndex], sabaki.state.treePosition]

let menu = null

exports.buildMenu = function() {
    let data = [
        {
            id: 'file',
            label: t('menu.file', '&File'),
            submenu: [
                {
                    label: t('menu.file', '&New'),
                    accelerator: 'CmdOrCtrl+N',
                    click: () => sabaki.newFile({playSound: true, showInfo: true})
                },
                {
                    label: t('menu.file', 'New &Window'),
                    accelerator: 'CmdOrCtrl+Shift+N',
                    clickMain: 'newWindow',
                    enabled: true
                },
                {type: 'separator'},
                {
                    label: t('menu.file', '&Open…'),
                    accelerator: 'CmdOrCtrl+O',
                    click: () => sabaki.loadFile()
                },
                {
                    label: t('menu.file', '&Save'),
                    accelerator: 'CmdOrCtrl+S',
                    click: () => sabaki.saveFile(sabaki.state.representedFilename)
                },
                {
                    label: t('menu.file', 'Sa&ve As…'),
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: () => sabaki.saveFile()
                },
                {type: 'separator'},
                {
                    label: t('menu.file', '&Clipboard'),
                    submenu: [
                        {
                            label: t('menu.file', '&Load SGF'),
                            click: () => sabaki.loadContent(clipboard.readText(), 'sgf')
                        },
                        {
                            label: t('menu.file', '&Copy SGF'),
                            click: () => clipboard.writeText(sabaki.getSGF())
                        },
                        {
                            label: t('menu.file', 'Copy &ASCII Diagram'),
                            click: () => clipboard.writeText(gametree.getBoard(...treePosition()).generateAscii())
                        }
                    ]
                },
                {type: 'separator'},
                {
                    label: t('menu.file', 'Game &Info'),
                    accelerator: 'CmdOrCtrl+I',
                    click: () => sabaki.openDrawer('info')
                },
                {
                    label: t('menu.file', '&Manage Games…'),
                    accelerator: 'CmdOrCtrl+Shift+M',
                    click: () => sabaki.openDrawer('gamechooser')
                },
                {type: 'separator'},
                {
                    label: t('menu.file', '&Preferences…'),
                    accelerator: 'CmdOrCtrl+,',
                    click: () => sabaki.openDrawer('preferences')
                }
            ]
        },
        {
            id: 'play',
            label: t('menu.play', '&Play'),
            submenu: [
                {
                    label: t('menu.play', '&Toggle Player'),
                    click: () => sabaki.setPlayer(...treePosition(), -sabaki.getPlayer(...treePosition()))
                },
                {type: 'separator'},
                {
                    label: t('menu.play', '&Select Point'),
                    accelerator: 'CmdOrCtrl+L',
                    click: () => dialog.showInputBox('Enter a coordinate to select a point', ({value}) => {
                        sabaki.clickVertex(value)
                    })
                },
                {
                    label: t('menu.play', '&Pass'),
                    accelerator: 'CmdOrCtrl+P',
                    click: () => {
                        const autoGenmove = setting.get('gtp.auto_genmove')
                        sabaki.makeMove([-1, -1], {sendToEngine: autoGenmove})
                    }
                },
                {
                    label: t('menu.play', '&Resign'),
                    click: () => sabaki.makeResign()
                },
                {type: 'separator'},
                {
                    label: t('menu.play', '&Estimate'),
                    click: () => sabaki.setMode('estimator')
                },
                {
                    label: t('menu.play', 'Sc&ore'),
                    click: () => sabaki.setMode('scoring')
                }
            ]
        },
        {
            id: 'edit',
            label: t('menu.edit', '&Edit'),
            submenu: [
                {
                    label: t('menu.edit', '&Undo'),
                    accelerator: 'CmdOrCtrl+Z',
                    click: () => sabaki.undo()
                },
                {
                    label: t('menu.edit', 'Re&do'),
                    accelerator: process.platform === 'win32' ? 'CmdOrCtrl+Y' : 'CmdOrCtrl+Shift+Z',
                    click: () => sabaki.redo()
                },
                {type: 'separator'},
                {
                    label: t('menu.edit', 'Toggle &Edit Mode'),
                    accelerator: 'CmdOrCtrl+E',
                    click: () => sabaki.setMode(sabaki.state.mode === 'edit' ? 'play' : 'edit')
                },
                {
                    label: t('menu.edit', '&Select Tool'),
                    submenu: [
                        {
                            label: t('menu.edit', '&Stone Tool'),
                            accelerator: 'CmdOrCtrl+1',
                            click: () => selectTool(
                                sabaki.state.mode !== 'edit' || sabaki.state.selectedTool !== 'stone_1'
                                ? 'stone_1' : 'stone_-1'
                            )
                        },
                        {
                            label: t('menu.edit', '&Cross Tool'),
                            accelerator: 'CmdOrCtrl+2',
                            click: () => selectTool('cross')
                        },
                        {
                            label: t('menu.edit', '&Triangle Tool'),
                            accelerator: 'CmdOrCtrl+3',
                            click: () => selectTool('triangle')
                        },
                        {
                            label: t('menu.edit', 'S&quare Tool'),
                            accelerator: 'CmdOrCtrl+4',
                            click: () => selectTool('square')
                        },
                        {
                            label: t('menu.edit', 'C&ircle Tool'),
                            accelerator: 'CmdOrCtrl+5',
                            click: () => selectTool('circle')
                        },
                        {
                            label: t('menu.edit', '&Line Tool'),
                            accelerator: 'CmdOrCtrl+6',
                            click: () => selectTool('line')
                        },
                        {
                            label: t('menu.edit', '&Arrow Tool'),
                            accelerator: 'CmdOrCtrl+7',
                            click: () => selectTool('arrow')
                        },
                        {
                            label: t('menu.edit', 'La&bel Tool'),
                            accelerator: 'CmdOrCtrl+8',
                            click: () => selectTool('label')
                        },
                        {
                            label: t('menu.edit', '&Number Tool'),
                            accelerator: 'CmdOrCtrl+9',
                            click: () => selectTool('number')
                        }
                    ]
                },
                {type: 'separator'},
                {
                    label: t('menu.edit', '&Copy Variation'),
                    click: () => sabaki.copyVariation(...treePosition())
                },
                {
                    label: t('menu.edit', 'Cu&t Variation'),
                    click: () => sabaki.cutVariation(...treePosition())
                },
                {
                    label: t('menu.edit', '&Paste Variation'),
                    click: () => sabaki.pasteVariation(...treePosition())
                },
                {type: 'separator'},
                {
                    label: t('menu.edit', 'Make Main &Variation'),
                    click: () => sabaki.makeMainVariation(...treePosition())
                },
                {
                    label: t('menu.edit', 'Shift &Left'),
                    click: () => sabaki.shiftVariation(...treePosition(), -1)
                },
                {
                    label: t('menu.edit', 'Shift Ri&ght'),
                    click: () => sabaki.shiftVariation(...treePosition(), 1)
                },
                {type: 'separator'},
                {
                    label: t('menu.edit', '&Flatten'),
                    click: () => sabaki.flattenVariation(...treePosition())
                },
                {
                    label: t('menu.edit', '&Remove Node'),
                    accelerator: process.platform === 'darwin' ? 'CmdOrCtrl+Backspace' : 'CmdOrCtrl+Delete',
                    click: () => sabaki.removeNode(...treePosition())
                },
                {
                    label: t('menu.edit', 'Remove &Other Variations'),
                    click: () => sabaki.removeOtherVariations(...treePosition())
                }
            ]
        },
        {
            id: 'find',
            label: t('menu.find', 'Fin&d'),
            submenu: [
                {
                    label: t('menu.find', 'Toggle &Find Mode'),
                    accelerator: 'CmdOrCtrl+F',
                    click: () => sabaki.setMode(sabaki.state.mode === 'find' ? 'play' : 'find'),
                },
                {
                    label: t('menu.find', 'Find &Next'),
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
                    label: t('menu.find', 'Find &Previous'),
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
                    label: t('menu.find', 'Toggle &Hotspot'),
                    accelerator: 'CmdOrCtrl+B',
                    click: () => sabaki.setComment(...treePosition(), {
                        hotspot: treePosition()[0].get(treePosition()[1]).data.HO == null
                    })
                },
                {
                    label: t('menu.find', 'Jump to Ne&xt Hotspot'),
                    accelerator: 'F2',
                    click: () => sabaki.findHotspot(1),
                },
                {
                    label: t('menu.find', 'Jump to Pre&vious Hotspot'),
                    accelerator: 'Shift+F2',
                    click: () => sabaki.findHotspot(-1),
                }
            ]
        },
        {
            id: 'navigation',
            label: t('menu.navigation', '&Navigation'),
            submenu: [
                {
                    label: t('menu.navigation', '&Back'),
                    accelerator: 'Up',
                    click: () => sabaki.goStep(-1)
                },
                {
                    label: t('menu.navigation', '&Forward'),
                    accelerator: 'Down',
                    click: () => sabaki.goStep(1)
                },
                {type: 'separator'},
                {
                    label: t('menu.navigation', 'Go to &Previous Fork'),
                    accelerator: 'CmdOrCtrl+Up',
                    click: () => sabaki.goToPreviousFork()
                },
                {
                    label: t('menu.navigation', 'Go to &Next Fork'),
                    accelerator: 'CmdOrCtrl+Down',
                    click: () => sabaki.goToNextFork()
                },
                {type: 'separator'},
                {
                    label: t('menu.navigation', 'Go to Previous Commen&t'),
                    accelerator: 'CmdOrCtrl+Shift+Up',
                    click: () => sabaki.goToComment(-1)
                },
                {
                    label: t('menu.navigation', 'Go to Next &Comment'),
                    accelerator: 'CmdOrCtrl+Shift+Down',
                    click: () => sabaki.goToComment(1)
                },
                {type: 'separator'},
                {
                    label: t('menu.navigation', 'Go to Be&ginning'),
                    accelerator: 'Home',
                    click: () => sabaki.goToBeginning()
                },
                {
                    label: t('menu.navigation', 'Go to &End'),
                    accelerator: 'End',
                    click: () => sabaki.goToEnd()
                },
                {type: 'separator'},
                {
                    label: t('menu.navigation', 'Go to &Main Variation'),
                    accelerator: 'CmdOrCtrl+Left',
                    click: () => sabaki.goToMainVariation()
                },
                {
                    label: t('menu.navigation', 'Go to Previous &Variation'),
                    accelerator: 'Left',
                    click: () => sabaki.goToSiblingVariation(-1)
                },
                {
                    label: t('menu.navigation', 'Go to Next Va&riation'),
                    accelerator: 'Right',
                    click: () => sabaki.goToSiblingVariation(1)
                },
                {type: 'separator'},
                {
                    label: t('menu.navigation', 'Go to Move N&umber'),
                    accelerator: 'CmdOrCtrl+G',
                    click: () => dialog.showInputBox('Enter a move number to go to', ({value}) => {
                        sabaki.closeDrawer()
                        sabaki.goToMoveNumber(value)
                    })
                },
                {type: 'separator'},
                {
                    label: t('menu.navigation', 'Go to Ne&xt Game'),
                    accelerator: 'CmdOrCtrl+PageDown',
                    click: () => sabaki.goToSiblingGame(1)
                },
                {
                    label: t('menu.navigation', 'Go to Previou&s Game'),
                    accelerator: 'CmdOrCtrl+PageUp',
                    click: () => sabaki.goToSiblingGame(-1)
                }
            ]
        },
        {
            id: 'engines',
            label: t('menu.engines', 'Eng&ines'),
            submenu: [
                {
                    label: t('menu.engines', 'Manage &Engines…'),
                    click: () => (sabaki.setState({preferencesTab: 'engines'}), sabaki.openDrawer('preferences'))
                },
                {type: 'separator'},
                {
                    label: t('menu.engines', '&Attach…'),
                    click: () => sabaki.openDrawer('info')
                },
                {
                    label: t('menu.engines', '&Detach'),
                    click: () => sabaki.detachEngines()
                },
                {
                    label: t('menu.engines', '&Suspend'),
                    enabled: true,
                    click: () => sabaki.suspendEngines()
                },
                {type: 'separator'},
                {
                    label: t('menu.engines', 'S&ynchronize'),
                    accelerator: 'F6',
                    click: () => sabaki.syncEngines()
                },
                {
                    label: t('menu.engines', 'Toggle A&nalysis'),
                    accelerator: 'F4',
                    click: () => {
                        if (sabaki.state.analysisTreePosition == null) {
                            sabaki.closeDrawer()
                            sabaki.setMode('play')
                            sabaki.startAnalysis()
                        } else {
                            sabaki.stopAnalysis()
                        }
                    }
                },
                {
                    label: t('menu.engines', 'Start &Playing'),
                    accelerator: 'F5',
                    click: () => sabaki.generateMove({analyze: sabaki.state.analysis != null, followUp: true})
                },
                {
                    label: t('menu.engines', 'Generate &Move'),
                    accelerator: 'F10',
                    click: () => sabaki.generateMove({analyze: sabaki.state.analysis != null})
                },
                {type: 'separator'},
                {
                    label: t('menu.engines', 'Toggle &GTP Console'),
                    click: () => {
                        toggleSetting('view.show_leftsidebar')
                        sabaki.setState(({showConsole}) => ({showConsole: !showConsole}))
                    }
                },
                {
                    label: t('menu.engines', '&Clear Console'),
                    click: () => sabaki.clearConsole()
                }
            ]
        },
        {
            id: 'tools',
            label: t('menu.tools', '&Tools'),
            submenu: [
                {
                    label: t('menu.tools', 'Toggle Auto&play Mode'),
                    click: () => sabaki.setMode(sabaki.state.mode === 'autoplay' ? 'play' : 'autoplay')
                },
                {
                    label: t('menu.tools', 'Toggle &Guess Mode'),
                    click: () => sabaki.setMode(sabaki.state.mode === 'guess' ? 'play' : 'guess')
                },
                {type: 'separator'},
                {
                    label: t('menu.tools', 'Clean &Markup…'),
                    click: () => sabaki.openDrawer('cleanmarkup')
                },
                {
                    label: t('menu.tools', '&Edit SGF Properties…'),
                    click: () => sabaki.openDrawer('advancedproperties')
                },
                {type: 'separator'},
                {
                    label: t('menu.tools', '&Rotate Clockwise'),
                    click: () => sabaki.rotateBoard(false)
                },
                {
                    label: t('menu.tools', 'Rotate &Anticlockwise'),
                    click: () => sabaki.rotateBoard(true)
                },
                {
                    label: t('menu.tools', '&Flip Horizontally'),
                    click: () => sabaki.flipBoard(true)
                },
                {
                    label: t('menu.tools', 'Flip &Vertically'),
                    click: () => sabaki.flipBoard(false)
                },
                {
                    label: t('menu.tools', '&Invert Colors'),
                    click: () => sabaki.invertColors()
                }
            ]
        },
        {
            id: 'view',
            label: t('menu.view', '&View'),
            submenu: [
                {
                    label: t('menu.view', 'Toggle Menu &Bar'),
                    click: () => toggleSetting('view.show_menubar')
                },
                {
                    label: t('menu.view', 'Toggle &Full Screen'),
                    accelerator: process.platform === 'darwin' ? 'CmdOrCtrl+Shift+F' : 'F11',
                    click: () => sabaki.setState(({fullScreen}) => ({fullScreen: !fullScreen}))
                },
                {type: 'separator'},
                {
                    label: t('menu.view', 'Show &Coordinates'),
                    accelerator: 'CmdOrCtrl+Shift+C',
                    checked: 'view.show_coordinates',
                    click: () => toggleSetting('view.show_coordinates')
                },
                {
                    label: t('menu.view', 'Show Move N&umbers'),
                    checked: 'view.show_move_numbers',
                    click: () => toggleSetting('view.show_move_numbers')
                },
                {
                    label: t('menu.view', 'Show Move Colori&zation'),
                    checked: 'view.show_move_colorization',
                    click: () => toggleSetting('view.show_move_colorization')
                },
                {
                    label: t('menu.view', 'Show &Next Moves'),
                    checked: 'view.show_next_moves',
                    click: () => toggleSetting('view.show_next_moves')
                },
                {
                    label: t('menu.view', 'Show &Sibling Variations'),
                    checked: 'view.show_siblings',
                    click: () => toggleSetting('view.show_siblings')
                },
                {type: 'separator'},
                {
                    label: t('menu.view', 'Show Game &Tree'),
                    checked: 'view.show_graph',
                    accelerator: 'CmdOrCtrl+T',
                    click: () => {
                        toggleSetting('view.show_graph')
                        sabaki.setState(({showGameGraph}) => ({showGameGraph: !showGameGraph}))
                    }
                },
                {
                    label: t('menu.view', 'Show Co&mments'),
                    checked: 'view.show_comments',
                    accelerator: 'CmdOrCtrl+Shift+T',
                    click: () => {
                        toggleSetting('view.show_comments')
                        sabaki.setState(({showCommentBox}) => ({showCommentBox: !showCommentBox}))
                    }
                },
                {type: 'separator'},
                {
                    label: t('menu.view', 'Z&oom'),
                    submenu: [
                        {
                            label: t('menu.view', '&Increase'),
                            accelerator: 'CmdOrCtrl+Plus',
                            click: () => setting.set('app.zoom_factor',
                                setting.get('app.zoom_factor') + .1
                            )
                        },
                        {
                            label: t('menu.view', '&Decrease'),
                            accelerator: 'CmdOrCtrl+-',
                            click: () => setting.set('app.zoom_factor',
                                Math.max(0, setting.get('app.zoom_factor') - .1)
                            )
                        },
                        {
                            label: t('menu.view', '&Reset'),
                            accelerator: 'CmdOrCtrl+0',
                            click: () => setting.set('app.zoom_factor', 1)
                        }
                    ]
                }
            ]
        },
        process.platform === 'darwin' && {
            submenu: [
                {
                    label: t('menu.file', 'New &Window'),
                    clickMain: 'newWindow',
                    enabled: true
                },
                {role: 'minimize'},
                {type: 'separator'},
                {role: 'front'}
            ],
            role: 'window'
        },
        {
            id: 'help',
            label: t('menu.help', '&Help'),
            submenu: [
                {
                    label: t('menu.help', p => `${p.appName} v${p.version}`, {
                        appName: app.getName(),
                        version: app.getVersion()
                    }),
                    enabled: false
                },
                {
                    label: t('menu.help', 'Check for &Updates'),
                    clickMain: 'checkForUpdates',
                    enabled: true
                },
                {type: 'separator'},
                {
                    label: t('menu.help', 'GitHub &Repository'),
                    click: () => shell.openExternal(`https://github.com/SabakiHQ/${sabaki.appName}`)
                },
                {
                    label: t('menu.help', 'Report &Issue'),
                    click: () => shell.openExternal(`https://github.com/SabakiHQ/${sabaki.appName}/issues`)
                }
            ]
        },
        setting.get('debug.dev_tools') && {
            id: 'developer',
            label: t('menu.developer', 'Develo&per'),
            submenu: [
                {
                    label: t('menu.developer', 'Toggle &Developer Tools'),
                    click: () => remote.getCurrentWindow().webContents.toggleDevTools()
                },
                {type: 'separator'},
                {
                    label: t('menu.developer', 'Load &Language File…'),
                    click: () => {
                        dialog.showOpenDialog({
                            properties: ['openFile'],
                            filters: [
                                {
                                    name: t('menu.developer', 'JavaScript Files'),
                                    extensions: ['js']
                                }
                            ]
                        }, ({result}) => {
                            if (!result || result.length === 0) return

                            i18n.loadFile(result[0])
                        })
                    }
                },
                {
                    label: t('menu.developer', '&Unload Language File'),
                    click: () => {
                        i18n.loadStrings({})
                    }
                },
                {
                    label: t('menu.developer', '&Save Language File…'),
                    click: () => {
                        dialog.showSaveDialog({
                            filters: [
                                {
                                    name: t('menu.developer', 'JavaScript Files'),
                                    extensions: ['js']
                                }
                            ]
                        }, ({result}) => {
                            if (!result) return

                            let summary = i18n.serialize(result)

                            dialog.showMessageBox(t('menu.developer', p => [
                                `Translated strings: ${p.translatedCount}`,
                                `Untranslated strings: ${p.untranslatedCount}`,
                                `Completion: ${p.complete}%`
                            ].join('\n'), {
                                translatedCount: summary.translatedCount,
                                untranslatedCount: summary.untranslatedCount,
                                complete: Math.round(summary.complete * 100)
                            }))
                        })
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
        let preferenceItem = fileMenu.submenu.splice(fileMenu.submenu.length - 2, 2)[1]

        appMenu.push(
            {type: 'separator'},
            preferenceItem,
            {type: 'separator'},
            {submenu: [], role: 'services'},
            {
                label: t('menu.macos', 'Text'),
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
            label: app.getName(),
            submenu: appMenu
        })

        // Remove 'Toggle Menu Bar' menu item

        let viewMenu = findMenuItem('view')
        viewMenu.submenu.splice(0, 1)
    }

    // Generate ids for all menu items

    let generateIds = (menu, idPrefix = '') => {
        menu.forEach((item, i) => {
            if (item.id == null) {
                item.id = idPrefix + i
            }

            if ('submenu' in item) {
                generateIds(item.submenu, `${item.id}-`)
            }
        })

        return menu
    }

    menu = generateIds(data)
    return menu
}

exports.buildMenu()

exports.clone = function(x = menu) {
    if (Array.isArray(x)) {
        return [...Array(x.length)].map((_, i) => exports.clone(x[i]))
    } else if (typeof x === 'object') {
        let result = {}
        for (let key in x) result[key] = exports.clone(x[key])
        return result
    }

    return x
}
