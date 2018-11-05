const {shell, clipboard, remote} = require('electron')
const {app} = remote || require('electron')

const setting = remote && remote.require('./setting')

const sabaki = typeof window !== 'undefined' && window.sabaki
const dialog = sabaki && require('./modules/dialog')
const gametree = sabaki && require('./modules/gametree')

let toggleSetting = key => setting.set(key, !setting.get(key))
let selectTool = tool => (sabaki.setMode('edit'), sabaki.setState({selectedTool: tool}))
let treePosition = () => sabaki.state.treePosition

let data = [
    {
        label: '&文件',
        submenu: [
            {
                label: '&新建',
                accelerator: 'CmdOrCtrl+N',
                click: () => sabaki.newFile({playSound: true, showInfo: true})
            },
            {
                label: '&新窗口',
                accelerator: 'CmdOrCtrl+Shift+N',
                clickMain: 'newWindow',
                enabled: true
            },
            {type: 'separator'},
            {
                label: '&打开…',
                accelerator: 'CmdOrCtrl+O',
                click: () => sabaki.loadFile()
            },
            {
                label: '&保存',
                accelerator: 'CmdOrCtrl+S',
                click: () => sabaki.saveFile(sabaki.state.representedFilename)
            },
            {
                label: '&另存为…',
                accelerator: 'CmdOrCtrl+Shift+S',
                click: () => sabaki.saveFile()
            },
            {type: 'separator'},
            {
                label: '&剪贴板',
                submenu: [
                    {
                        label: '&载入 SGF',
                        click: () => sabaki.loadContent(clipboard.readText(), 'sgf')
                    },
                    {
                        label: '&复制 SGF',
                        click: () => clipboard.writeText(sabaki.getSGF())
                    },
                    {
                        label: '&复制 ASCII 图表',
                        click: () => clipboard.writeText(gametree.getBoard(...treePosition()).generateAscii())
                    }
                ]
            },
            {type: 'separator'},
            {
                label: '&对局信息',
                accelerator: 'CmdOrCtrl+I',
                click: () => sabaki.openDrawer('info')
            },
            {
                label: '&棋局管理…',
                accelerator: 'CmdOrCtrl+Shift+M',
                click: () => sabaki.openDrawer('gamechooser')
            },
            {type: 'separator'},
            {
                label: '&偏好设置…',
                accelerator: 'CmdOrCtrl+,',
                click: () => sabaki.openDrawer('preferences')
            }
        ]
    },
    {
        label: '&运行',
        submenu: [
            {
                label: '&切换对局者',
                click: () => sabaki.setPlayer(...treePosition(), -sabaki.getPlayer(...treePosition()))
            },
            {type: 'separator'},
            {
                label: '&选择点',
                accelerator: 'CmdOrCtrl+L',
                click: () => dialog.showInputBox('输入坐标选择点', ({value}) => {
                    sabaki.clickVertex(value)
                })
            },
            {
                label: '&Pass(通过)一手',
                accelerator: 'CmdOrCtrl+P',
                click: () => {
                    const autoGenmove = setting.get('gtp.auto_genmove')
                    sabaki.makeMove([-1, -1], {sendToEngine: autoGenmove})
                }
            },
            {
                label: '&认输',
                click: () => sabaki.makeResign()
            },
            {type: 'separator'},
            {
                label: '&估算(形势判断)',
                click: () => sabaki.setMode('estimator')
            },
            {
                label: '&比分(点目)',
                click: () => sabaki.setMode('scoring')
            }
        ]
    },
    {
        label: '&编辑',
        submenu: [
            {
                label: '&切换编辑模式',
                accelerator: 'CmdOrCtrl+E',
                click: () => sabaki.setMode(sabaki.state.mode === 'edit' ? 'play' : 'edit')
            },
            {
                label: '&选择工具',
                submenu: [
                    {
                        label: '&棋子工具',
                        accelerator: 'CmdOrCtrl+1',
                        click: () => selectTool(
                            sabaki.state.mode !== 'edit' || sabaki.state.selectedTool !== 'stone_1'
                            ? 'stone_1' : 'stone_-1'
                        )
                    },
                    {
                        label: '&交叉工具',
                        accelerator: 'CmdOrCtrl+2',
                        click: () => selectTool('cross')
                    },
                    {
                        label: '&三角工具',
                        accelerator: 'CmdOrCtrl+3',
                        click: () => selectTool('triangle')
                    },
                    {
                        label: '&矩形工具',
                        accelerator: 'CmdOrCtrl+4',
                        click: () => selectTool('square')
                    },
                    {
                        label: '&圆形工具',
                        accelerator: 'CmdOrCtrl+5',
                        click: () => selectTool('circle')
                    },
                    {
                        label: '&线形工具',
                        accelerator: 'CmdOrCtrl+6',
                        click: () => selectTool('line')
                    },
                    {
                        label: '&箭头工具',
                        accelerator: 'CmdOrCtrl+7',
                        click: () => selectTool('arrow')
                    },
                    {
                        label: '&标签工具',
                        accelerator: 'CmdOrCtrl+8',
                        click: () => selectTool('label')
                    },
                    {
                        label: '&数字工具',
                        accelerator: 'CmdOrCtrl+9',
                        click: () => selectTool('number')
                    }
                ]
            },
            {type: 'separator'},
            {
                label: '&复制变化',
                click: () => sabaki.copyVariation(...treePosition())
            },
            {
                label: '&剪切变化',
                click: () => sabaki.cutVariation(...treePosition())
            },
            {
                label: '&粘贴变化',
                click: () => sabaki.pasteVariation(...treePosition())
            },
            {type: 'separator'},
            {
                label: '&升为主变化',
                click: () => sabaki.makeMainVariation(...treePosition())
            },
            {
                label: '&左移',
                click: () => sabaki.shiftVariation(...treePosition(), -1)
            },
            {
                label: '&右移',
                click: () => sabaki.shiftVariation(...treePosition(), 1)
            },
            {type: 'separator'},
            {
                label: '&压平（成为根节点）',
                click: () => sabaki.flattenVariation(...treePosition())
            },
            {
                label: '&删除节点',
                accelerator: process.platform === 'darwin' ? 'CmdOrCtrl+Backspace' : 'CmdOrCtrl+Delete',
                click: () => sabaki.removeNode(...treePosition())
            },
            {
                label: '&删除其它变化',
                click: () => sabaki.removeOtherVariations(...treePosition())
            }
        ]
    },
    {
        label: '&查找',
        submenu: [
            {
                label: '&切换查找模式',
                accelerator: 'CmdOrCtrl+F',
                click: () => sabaki.setMode(sabaki.state.mode === 'find' ? 'play' : 'find'),
            },
            {
                label: '&查找下一个',
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
                label: '&查找上一个',
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
                label: '&切换热点',
                accelerator: 'CmdOrCtrl+B',
                click: () => sabaki.setComment(...treePosition(), {
                    hotspot: !('HO' in treePosition()[0].nodes[treePosition()[1]])
                })
            },
            {
                label: '&跳到下一个热点',
                accelerator: 'F2',
                click: () => sabaki.findHotspot(1),
            },
            {
                label: '&跳到上一个热点',
                accelerator: 'Shift+F2',
                click: () => sabaki.findHotspot(-1),
            }
        ]
    },
    {
        label: '&导航',
        submenu: [
            {
                label: '&后退',
                accelerator: 'Up',
                click: () => sabaki.goStep(-1)
            },
            {
                label: '&前进',
                accelerator: 'Down',
                click: () => sabaki.goStep(1)
            },
            {type: 'separator'},
            {
                label: '&上一个分支',
                accelerator: 'CmdOrCtrl+Up',
                click: () => sabaki.goToPreviousFork()
            },
            {
                label: '&下一个分支',
                accelerator: 'CmdOrCtrl+Down',
                click: () => sabaki.goToNextFork()
            },
            {type: 'separator'},
            {
                label: '&上一注释',
                accelerator: 'CmdOrCtrl+Shift+Up',
                click: () => sabaki.goToComment(-1)
            },
            {
                label: '&下一注释',
                accelerator: 'CmdOrCtrl+Shift+Down',
                click: () => sabaki.goToComment(1)
            },
            {type: 'separator'},
            {
                label: '&开始',
                accelerator: 'Home',
                click: () => sabaki.goToBeginning()
            },
            {
                label: '&结束',
                accelerator: 'End',
                click: () => sabaki.goToEnd()
            },
            {type: 'separator'},
            {
                label: '&主变化',
                accelerator: 'CmdOrCtrl+Left',
                click: () => sabaki.goToMainVariation()
            },
            {
                label: '&上一个变化',
                accelerator: 'Left',
                click: () => sabaki.goToSiblingVariation(-1)
            },
            {
                label: '&下一个变化',
                accelerator: 'Right',
                click: () => sabaki.goToSiblingVariation(1)
            },
            {type: 'separator'},
            {
                label: '&跳转止数字',
                accelerator: 'CmdOrCtrl+G',
                click: () => dialog.showInputBox('输入要跳转止第几手的编号', ({value}) => {
                    sabaki.closeDrawer()
                    sabaki.goToMoveNumber(value)
                })
            },
            {type: 'separator'},
            {
                label: '&下一个对局',
                accelerator: 'CmdOrCtrl+PageDown',
                click: () => sabaki.goToSiblingGame(1)
            },
            {
                label: '&上一个对局',
                accelerator: 'CmdOrCtrl+PageUp',
                click: () => sabaki.goToSiblingGame(-1)
            }
        ]
    },
    {
        label: '&引擎',
        submenu: [
            {
                label: '&管理引擎…',
                click: () => (sabaki.setState({preferencesTab: 'engines'}), sabaki.openDrawer('preferences'))
            },
            {type: 'separator'},
            {
                label: '&附加(引擎)…',
                click: () => sabaki.openDrawer('info')
            },
            {
                label: '&取消(引擎)',
                click: () => sabaki.detachEngines()
            },
            {
                label: '&暂停(引擎)',
                enabled: true,
                click: () => sabaki.suspendEngines()
            },
            {type: 'separator'},
            {
                label: '&同步',
                accelerator: 'F6',
                click: () => sabaki.syncEngines()
            },
            {
                label: '&切换分析',
                accelerator: 'F4',
                click: () => {
                    if (sabaki.state.analysis == null) {
                        sabaki.startAnalysis()
                    } else {
                        sabaki.stopAnalysis()
                    }
                }
            },
            {
                label: '&开始对局',
                accelerator: 'F5',
                click: () => sabaki.generateMove({analyze: sabaki.state.analysis != null, followUp: true})
            },
            {
                label: '&生成新点',
                accelerator: 'F10',
                click: () => sabaki.generateMove({analyze: sabaki.state.analysis != null})
            },
            {type: 'separator'},
            {
                label: '&切换GTP控制台',
                click: () => {
                    toggleSetting('view.show_leftsidebar')
                    sabaki.setState(({showConsole}) => ({showConsole: !showConsole}))
                }
            },
            {
                label: '&清除控制台',
                click: () => sabaki.clearConsole()
            }
        ]
    },
    {
        label: '&工具',
        submenu: [
            {
                label: '&切换自动打谱模式',
                click: () => sabaki.setMode(sabaki.state.mode === 'autoplay' ? 'play' : 'autoplay')
            },
            {
                label: '&切换猜局打谱模式',
                click: () => sabaki.setMode(sabaki.state.mode === 'guess' ? 'play' : 'guess')
            },
            {type: 'separator'},
            {
                label: '&清除标记…',
                click: () => sabaki.openDrawer('cleanmarkup')
            },
            {
                label: '&编辑SGF属性…',
                click: () => sabaki.openDrawer('advancedproperties')
            },
            {type: 'separator'},
            {
                label: '&顺时针旋转棋盘',
                click: () => sabaki.rotateBoard(false)
            },
            {
                label: '&逆时针旋转棋盘',
                click: () => sabaki.rotateBoard(true)
            }
        ]
    },
    {
        label: '&显示',
        submenu: [
            {
                label: '&切换菜单栏',
                click: () => toggleSetting('view.show_menubar')
            },
            {
                label: '&切换全屏',
                accelerator: process.platform === 'darwin' ? 'CmdOrCtrl+Shift+F' : 'F11',
                click: () => sabaki.setState(({fullScreen}) => ({fullScreen: !fullScreen}))
            },
            {type: 'separator'},
            {
                label: '&显示坐标',
                accelerator: 'CmdOrCtrl+Shift+C',
                checked: 'view.show_coordinates',
                click: () => toggleSetting('view.show_coordinates')
            },
            {
                label: '&显示移动着色',
                checked: 'view.show_move_colorization',
                click: () => toggleSetting('view.show_move_colorization')
            },
            {
                label: '&显示下一步',
                checked: 'view.show_next_moves',
                click: () => toggleSetting('view.show_next_moves')
            },
            {
                label: '&显示同步变化',
                checked: 'view.show_siblings',
                click: () => toggleSetting('view.show_siblings')
            },
            {type: 'separator'},
            {
                label: '&显示棋局树',
                checked: 'view.show_graph',
                accelerator: 'CmdOrCtrl+T',
                click: () => {
                    toggleSetting('view.show_graph')
                    sabaki.setState(({showGameGraph}) => ({showGameGraph: !showGameGraph}))
                }
            },
            {
                label: '&显示注释',
                checked: 'view.show_comments',
                accelerator: 'CmdOrCtrl+Shift+T',
                click: () => {
                    toggleSetting('view.show_comments')
                    sabaki.setState(({showCommentBox}) => ({showCommentBox: !showCommentBox}))
                }
            },
            {type: 'separator'},
            {
                label: '&缩放',
                submenu: [
                    {
                        label: '升高',
                        accelerator: 'CmdOrCtrl+Plus',
                        click: () => setting.set('app.zoom_factor',
                            setting.get('app.zoom_factor') + .1
                        )
                    },
                    {
                        label: '降低',
                        accelerator: 'CmdOrCtrl+-',
                        click: () => setting.set('app.zoom_factor',
                            Math.max(0, setting.get('app.zoom_factor') - .1)
                        )
                    },
                    {
                        label: '重置',
                        accelerator: 'CmdOrCtrl+0',
                        click: () => setting.set('app.zoom_factor', 1)
                    }
                ]
            }
        ]
    },
    {
        label: '&帮助',
        submenu: [
            {
                label: `${app.getName()} v${app.getVersion()}`,
                enabled: false
            },
            {
                label: `中文编译：独角飞马`,
                enabled: false
            },
            {
                label: '&检查更新',
                clickMain: 'checkForUpdates',
                enabled: true
            },
            {type: 'separator'},
            {
                label: 'GitHub &存储库',
                click: () => shell.openExternal(`https://github.com/SabakiHQ/${sabaki.appName}`)
            },
            {
                label: '&报告问题',
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
