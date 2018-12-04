const {shell, clipboard, remote} = require('electron')
const {app} = remote || require('electron')

const setting = remote && remote.require('./setting')

const sabaki = typeof window !== 'undefined' && window.sabaki
const dialog = sabaki && require('./modules/dialog')
const gametree = sabaki && require('./modules/gametree')

let toggleSetting = key => setting.set(key, !setting.get(key))
let selectTool = tool => (sabaki.setMode('edit'), sabaki.setState({selectedTool: tool}))
let treePosition = () => [sabaki.state.gameTrees[sabaki.state.gameIndex], sabaki.state.treePosition]

let data = [
    {
        label: '&File',
        submenu: [
            {
                label: '&New',
                accelerator: 'CmdOrCtrl+N',
                click: () => sabaki.newFile({playSound: true, showInfo: true})
            },
            {
                label: 'New &Window',
                accelerator: 'CmdOrCtrl+Shift+N',
                clickMain: 'newWindow',
                enabled: true
            },
            {type: 'separator'},
            {
                label: '&Open…',
                accelerator: 'CmdOrCtrl+O',
                click: () => sabaki.loadFile()
            },
            {
                label: '&Save',
                accelerator: 'CmdOrCtrl+S',
                click: () => sabaki.saveFile(sabaki.state.representedFilename)
            },
            {
                label: 'Sa&ve As…',
                accelerator: 'CmdOrCtrl+Shift+S',
                click: () => sabaki.saveFile()
            },
            {type: 'separator'},
            {
                label: '&Clipboard',
                submenu: [
                    {
                        label: '&Load SGF',
                        click: () => sabaki.loadContent(clipboard.readText(), 'sgf')
                    },
                    {
                        label: '&Copy SGF',
                        click: () => clipboard.writeText(sabaki.getSGF())
                    },
                    {
                        label: 'Copy &ASCII Diagram',
                        click: () => clipboard.writeText(gametree.getBoard(...treePosition()).generateAscii())
                    }
                ]
            },
            {type: 'separator'},
            {
                label: 'Game &Info',
                accelerator: 'CmdOrCtrl+I',
                click: () => sabaki.openDrawer('info')
            },
            {
                label: '&Manage Games…',
                accelerator: 'CmdOrCtrl+Shift+M',
                click: () => sabaki.openDrawer('gamechooser')
            },
            {type: 'separator'},
            {
                label: '&Preferences…',
                accelerator: 'CmdOrCtrl+,',
                click: () => sabaki.openDrawer('preferences')
            }
        ]
    },
    {
        label: '&Play',
        submenu: [
            {
                label: '&Toggle Player',
                click: () => sabaki.setPlayer(...treePosition(), -sabaki.getPlayer(...treePosition()))
            },
            {type: 'separator'},
            {
                label: '&Select Point',
                accelerator: 'CmdOrCtrl+L',
                click: () => dialog.showInputBox('Enter a coordinate to select a point', ({value}) => {
                    sabaki.clickVertex(value)
                })
            },
            {
                label: '&Pass',
                accelerator: 'CmdOrCtrl+P',
                click: () => {
                    const autoGenmove = setting.get('gtp.auto_genmove')
                    sabaki.makeMove([-1, -1], {sendToEngine: autoGenmove})
                }
            },
            {
                label: '&Resign',
                click: () => sabaki.makeResign()
            },
            {type: 'separator'},
            {
                label: '&Estimate',
                click: () => sabaki.setMode('estimator')
            },
            {
                label: 'Sc&ore',
                click: () => sabaki.setMode('scoring')
            }
        ]
    },
    {
        label: '&Edit',
        submenu: [
            {
                label: 'Toggle &Edit Mode',
                accelerator: 'CmdOrCtrl+E',
                click: () => sabaki.setMode(sabaki.state.mode === 'edit' ? 'play' : 'edit')
            },
            {
                label: '&Select Tool',
                submenu: [
                    {
                        label: '&Stone Tool',
                        accelerator: 'CmdOrCtrl+1',
                        click: () => selectTool(
                            sabaki.state.mode !== 'edit' || sabaki.state.selectedTool !== 'stone_1'
                            ? 'stone_1' : 'stone_-1'
                        )
                    },
                    {
                        label: '&Cross Tool',
                        accelerator: 'CmdOrCtrl+2',
                        click: () => selectTool('cross')
                    },
                    {
                        label: '&Triangle Tool',
                        accelerator: 'CmdOrCtrl+3',
                        click: () => selectTool('triangle')
                    },
                    {
                        label: 'S&quare Tool',
                        accelerator: 'CmdOrCtrl+4',
                        click: () => selectTool('square')
                    },
                    {
                        label: 'C&ircle Tool',
                        accelerator: 'CmdOrCtrl+5',
                        click: () => selectTool('circle')
                    },
                    {
                        label: '&Line Tool',
                        accelerator: 'CmdOrCtrl+6',
                        click: () => selectTool('line')
                    },
                    {
                        label: '&Arrow Tool',
                        accelerator: 'CmdOrCtrl+7',
                        click: () => selectTool('arrow')
                    },
                    {
                        label: 'La&bel Tool',
                        accelerator: 'CmdOrCtrl+8',
                        click: () => selectTool('label')
                    },
                    {
                        label: '&Number Tool',
                        accelerator: 'CmdOrCtrl+9',
                        click: () => selectTool('number')
                    }
                ]
            },
            {type: 'separator'},
            {
                label: '&Copy Variation',
                click: () => sabaki.copyVariation(...treePosition())
            },
            {
                label: 'Cu&t Variation',
                click: () => sabaki.cutVariation(...treePosition())
            },
            {
                label: '&Paste Variation',
                click: () => sabaki.pasteVariation(...treePosition())
            },
            {type: 'separator'},
            {
                label: 'Make Main &Variation',
                click: () => sabaki.makeMainVariation(...treePosition())
            },
            {
                label: 'Shift &Left',
                click: () => sabaki.shiftVariation(...treePosition(), -1)
            },
            {
                label: 'Shift Ri&ght',
                click: () => sabaki.shiftVariation(...treePosition(), 1)
            },
            {type: 'separator'},
            {
                label: '&Flatten',
                click: () => sabaki.flattenVariation(...treePosition())
            },
            {
                label: '&Remove Node',
                accelerator: process.platform === 'darwin' ? 'CmdOrCtrl+Backspace' : 'CmdOrCtrl+Delete',
                click: () => sabaki.removeNode(...treePosition())
            },
            {
                label: 'Remove &Other Variations',
                click: () => sabaki.removeOtherVariations(...treePosition())
            }
        ]
    },
    {
        label: 'Fin&d',
        submenu: [
            {
                label: 'Toggle &Find Mode',
                accelerator: 'CmdOrCtrl+F',
                click: () => sabaki.setMode(sabaki.state.mode === 'find' ? 'play' : 'find'),
            },
            {
                label: 'Find &Next',
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
                label: 'Find &Previous',
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
                label: 'Toggle &Hotspot',
                accelerator: 'CmdOrCtrl+B',
                click: () => sabaki.setComment(...treePosition(), {
                    hotspot: treePosition()[0].get(treePosition()[1]).data.HO == null
                })
            },
            {
                label: 'Jump to Ne&xt Hotspot',
                accelerator: 'F2',
                click: () => sabaki.findHotspot(1),
            },
            {
                label: 'Jump to Pre&vious Hotspot',
                accelerator: 'Shift+F2',
                click: () => sabaki.findHotspot(-1),
            }
        ]
    },
    {
        label: '&Navigation',
        submenu: [
            {
                label: '&Back',
                accelerator: 'Up',
                click: () => sabaki.goStep(-1)
            },
            {
                label: '&Forward',
                accelerator: 'Down',
                click: () => sabaki.goStep(1)
            },
            {type: 'separator'},
            {
                label: 'Go to &Previous Fork',
                accelerator: 'CmdOrCtrl+Up',
                click: () => sabaki.goToPreviousFork()
            },
            {
                label: 'Go to &Next Fork',
                accelerator: 'CmdOrCtrl+Down',
                click: () => sabaki.goToNextFork()
            },
            {type: 'separator'},
            {
                label: 'Go to Previous Commen&t',
                accelerator: 'CmdOrCtrl+Shift+Up',
                click: () => sabaki.goToComment(-1)
            },
            {
                label: 'Go to Next &Comment',
                accelerator: 'CmdOrCtrl+Shift+Down',
                click: () => sabaki.goToComment(1)
            },
            {type: 'separator'},
            {
                label: 'Go to Be&ginning',
                accelerator: 'Home',
                click: () => sabaki.goToBeginning()
            },
            {
                label: 'Go to &End',
                accelerator: 'End',
                click: () => sabaki.goToEnd()
            },
            {type: 'separator'},
            {
                label: 'Go to &Main Variation',
                accelerator: 'CmdOrCtrl+Left',
                click: () => sabaki.goToMainVariation()
            },
            {
                label: 'Go to Previous &Variation',
                accelerator: 'Left',
                click: () => sabaki.goToSiblingVariation(-1)
            },
            {
                label: 'Go to Next Va&riation',
                accelerator: 'Right',
                click: () => sabaki.goToSiblingVariation(1)
            },
            {type: 'separator'},
            {
                label: 'Go to Move N&umber',
                accelerator: 'CmdOrCtrl+G',
                click: () => dialog.showInputBox('Enter a move number to go to', ({value}) => {
                    sabaki.closeDrawer()
                    sabaki.goToMoveNumber(value)
                })
            },
            {type: 'separator'},
            {
                label: 'Go to Ne&xt Game',
                accelerator: 'CmdOrCtrl+PageDown',
                click: () => sabaki.goToSiblingGame(1)
            },
            {
                label: 'Go to Previou&s Game',
                accelerator: 'CmdOrCtrl+PageUp',
                click: () => sabaki.goToSiblingGame(-1)
            }
        ]
    },
    {
        label: 'Eng&ines',
        submenu: [
            {
                label: 'Manage &Engines…',
                click: () => (sabaki.setState({preferencesTab: 'engines'}), sabaki.openDrawer('preferences'))
            },
            {type: 'separator'},
            {
                label: '&Attach…',
                click: () => sabaki.openDrawer('info')
            },
            {
                label: '&Detach',
                click: () => sabaki.detachEngines()
            },
            {
                label: '&Suspend',
                enabled: true,
                click: () => sabaki.suspendEngines()
            },
            {type: 'separator'},
            {
                label: 'S&ynchronize',
                accelerator: 'F6',
                click: () => sabaki.syncEngines()
            },
            {
                label: 'Toggle A&nalysis',
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
                label: 'Start &Playing',
                accelerator: 'F5',
                click: () => sabaki.generateMove({analyze: sabaki.state.analysis != null, followUp: true})
            },
            {
                label: 'Generate &Move',
                accelerator: 'F10',
                click: () => sabaki.generateMove({analyze: sabaki.state.analysis != null})
            },
            {type: 'separator'},
            {
                label: 'Toggle &GTP Console',
                click: () => {
                    toggleSetting('view.show_leftsidebar')
                    sabaki.setState(({showConsole}) => ({showConsole: !showConsole}))
                }
            },
            {
                label: '&Clear Console',
                click: () => sabaki.clearConsole()
            }
        ]
    },
    {
        label: '&Tools',
        submenu: [
            {
                label: 'Toggle Auto&play Mode',
                click: () => sabaki.setMode(sabaki.state.mode === 'autoplay' ? 'play' : 'autoplay')
            },
            {
                label: 'Toggle &Guess Mode',
                click: () => sabaki.setMode(sabaki.state.mode === 'guess' ? 'play' : 'guess')
            },
            {type: 'separator'},
            {
                label: 'Clean &Markup…',
                click: () => sabaki.openDrawer('cleanmarkup')
            },
            {
                label: '&Edit SGF Properties…',
                click: () => sabaki.openDrawer('advancedproperties')
            },
            {type: 'separator'},
            {
                label: '&Rotate Clockwise',
                click: () => sabaki.rotateBoard(false)
            },
            {
                label: 'Rotate &Anticlockwise',
                click: () => sabaki.rotateBoard(true)
            }
        ]
    },
    {
        label: '&View',
        submenu: [
            {
                label: 'Toggle Menu &Bar',
                click: () => toggleSetting('view.show_menubar')
            },
            {
                label: 'Toggle &Full Screen',
                accelerator: process.platform === 'darwin' ? 'CmdOrCtrl+Shift+F' : 'F11',
                click: () => sabaki.setState(({fullScreen}) => ({fullScreen: !fullScreen}))
            },
            {type: 'separator'},
            {
                label: 'Show &Coordinates',
                accelerator: 'CmdOrCtrl+Shift+C',
                checked: 'view.show_coordinates',
                click: () => toggleSetting('view.show_coordinates')
            },
            {
                label: 'Show Move Colori&zation',
                checked: 'view.show_move_colorization',
                click: () => toggleSetting('view.show_move_colorization')
            },
            {
                label: 'Show &Next Moves',
                checked: 'view.show_next_moves',
                click: () => toggleSetting('view.show_next_moves')
            },
            {
                label: 'Show &Sibling Variations',
                checked: 'view.show_siblings',
                click: () => toggleSetting('view.show_siblings')
            },
            {type: 'separator'},
            {
                label: 'Show Game &Tree',
                checked: 'view.show_graph',
                accelerator: 'CmdOrCtrl+T',
                click: () => {
                    toggleSetting('view.show_graph')
                    sabaki.setState(({showGameGraph}) => ({showGameGraph: !showGameGraph}))
                }
            },
            {
                label: 'Show Co&mments',
                checked: 'view.show_comments',
                accelerator: 'CmdOrCtrl+Shift+T',
                click: () => {
                    toggleSetting('view.show_comments')
                    sabaki.setState(({showCommentBox}) => ({showCommentBox: !showCommentBox}))
                }
            },
            {type: 'separator'},
            {
                label: 'Z&oom',
                submenu: [
                    {
                        label: 'Increase',
                        accelerator: 'CmdOrCtrl+Plus',
                        click: () => setting.set('app.zoom_factor',
                            setting.get('app.zoom_factor') + .1
                        )
                    },
                    {
                        label: 'Decrease',
                        accelerator: 'CmdOrCtrl+-',
                        click: () => setting.set('app.zoom_factor',
                            Math.max(0, setting.get('app.zoom_factor') - .1)
                        )
                    },
                    {
                        label: 'Reset',
                        accelerator: 'CmdOrCtrl+0',
                        click: () => setting.set('app.zoom_factor', 1)
                    }
                ]
            }
        ]
    },
    {
        label: '&Help',
        submenu: [
            {
                label: `${app.getName()} v${app.getVersion()}`,
                enabled: false
            },
            {
                label: 'Check for &Updates',
                clickMain: 'checkForUpdates',
                enabled: true
            },
            {type: 'separator'},
            {
                label: 'GitHub &Repository',
                click: () => shell.openExternal(`https://github.com/SabakiHQ/${sabaki.appName}`)
            },
            {
                label: 'Report &Issue',
                click: () => shell.openExternal(`https://github.com/SabakiHQ/${sabaki.appName}/issues`)
            }
        ]
    }
]

let findMenuItem = str => data.find(item => item.label.replace('&', '') === str)

// Modify menu for macOS

if (process.platform === 'darwin') {
    // Add 'App' menu

    let appMenu = [{role: 'about'}]
    let helpMenu = findMenuItem('Help')
    let items = helpMenu.submenu.splice(0, 3)

    appMenu.push(...items.slice(0, 2))

    // Remove original 'Preferences' menu item

    let fileMenu = findMenuItem('File')
    let preferenceItem = fileMenu.submenu.splice(fileMenu.submenu.length - 2, 2)[1]

    appMenu.push(
        {type: 'separator'},
        preferenceItem,
        {type: 'separator'},
        {submenu: [], role: 'services'},
        {
            label: 'Text',
            submenu: [
                {role: 'undo'},
                {role: 'redo'},
                {type: 'separator'},
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

    // Add 'Window' menu

    data.splice(data.length - 1, 0, {
        submenu: [
            {
                label: 'New Window',
                clickMain: 'newWindow',
                enabled: true
            },
            {role: 'minimize'},
            {type: 'separator'},
            {role: 'front'}
        ],
        role: 'window'
    })

    // Remove 'Toggle Menu Bar' menu item

    let viewMenu = findMenuItem('View')
    viewMenu.submenu.splice(0, 1)
}

// Generate ids for all menu items

let generateIds = (menu, idPrefix = '') => {
    menu.forEach((item, i) => {
        item.id = idPrefix + i

        if ('submenu' in item) {
            generateIds(item.submenu, `${item.id}-`)
        }
    })
}

generateIds(data)

module.exports = exports = data

exports.clone = function(x = data) {
    if (Array.isArray(x)) {
        return [...Array(x.length)].map((_, i) => exports.clone(x[i]))
    } else if (typeof x === 'object') {
        let result = {}
        for (let key in x) result[key] = exports.clone(x[key])
        return result
    }

    return x
}
