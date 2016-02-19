var process = require('process')
var app = require('electron').app
var ipcMain = require('electron').ipcMain
var setting = require('./modules/setting')

var BrowserWindow = require('electron').BrowserWindow
var Menu = require('electron').Menu

var windows = []
var openfile = null

function newWindow(path) {
    var window = new BrowserWindow({
        icon: process.platform == 'linux' ? __dirname + '/logo.png' : null,
        width: setting.get('window.width'),
        height: setting.get('window.height'),
        minWidth: setting.get('window.minwidth'),
        minHeight: setting.get('window.minheight'),
        useContentSize: true,
        show: false,
        webPreferences: {
            textAreasAreResizable: false
        }
    })

    windows.push(window)

    // window.toggleDevTools()

    window.webContents.setAudioMuted(!setting.get('sound.enable'))
    window.webContents
        .on('did-finish-load', function() {
            window.show()
            if (path) window.webContents.send('load-game', path)
        })
        .on('new-window', function(e) { e.preventDefault() })

    window.on('closed', function() { window = null })

    window.loadURL('file://' + __dirname + '/view/index.html')

    return window
}

function buildMenu() {
    var template = JSON.parse(JSON.stringify(require('./menu.json')))

    // Create app menu for OS X

    if (process.platform == 'darwin') {
        var appMenu = [{
            label: 'About {name}',
            role: 'about'
        }]

        // Remove original 'Check for Updates' menu item

        var helpMenu = template.filter(function(x) { return x.label.replace('&', '') == 'Help' })[0]
        var items = helpMenu.submenu.splice(0, 3)

        appMenu.push.apply(appMenu, items.slice(0, 2))

        // Remove original 'Preferences' menu item

        var gameMenu = template.filter(function(x) { return x.label.replace('&', '') == 'Game' })[0]
        items = gameMenu.submenu.splice(gameMenu.submenu.length - 2, 2)

        appMenu.push.apply(appMenu, [
            { type: 'separator' },
            items[1],
            { type: 'separator' },
            {
                label: 'Services',
                submenu: [],
                role: 'services'
            },
            { type: 'separator' },
            {
                label: 'Hide {name}',
                accelerator: 'CmdOrCtrl+H',
                role: 'hide'
            },
            {
                label: 'Hide Others',
                accelerator: 'CmdOrCtrl+Alt+H',
                role: 'hideothers'
            },
            { type: 'separator' },
            {
                label: 'Quit',
                accelerator: 'CmdOrCtrl+Q',
                click: function() { app.quit() }
            }
        ])

        template.unshift({
            label: '{name}',
            submenu: appMenu
        })

        // Add 'Window' menu

        template.splice(template.length - 1, 0, {
            label: 'Window',
            submenu: [
                {
                    label: 'Minimize',
                    role: 'minimize',
                    accelerator: 'CmdOrCtrl+M'
                },
                { type: 'separator' },
                {
                    label: 'Bring All to Front',
                    role: 'front'
                }
            ],
            role: 'window'
        })
    }

    // Load engines

    var engineMenu = template.filter(function(x) { return x.label.replace('&', '') == 'Engine' })[0]
    var attachMenu = engineMenu.submenu[0].submenu

    attachMenu.length = 0

    setting.getEngines().forEach(function(engine) {
        attachMenu.push({
            label: engine.name,
            click: function() {
                var window = BrowserWindow.getFocusedWindow()
                if (!window) return

                window.webContents.send('attach-engine', engine.path, engine.args)
            }
        })
    })

    if (setting.getEngines().length != 0) {
        attachMenu.push({ type: 'separator' })
    }

    attachMenu.push({
        label: '&Manage Engines…',
        action: 'manageengines'
    })

    // Handle clicks

    var handleClicks = function(items) {
        items.forEach(function(item) {
            if ('label' in item) {
                item.label = item.label
                .replace('{name}', app.getName())
                .replace('{version}', app.getVersion())
            }

            if ('action' in item) {
                var action = item.action

                item.click = function() {
                    var window = BrowserWindow.getFocusedWindow()
                    if (!window) return

                    window.webContents.send('menu-click', action)
                }

                delete item.action
            }

            if ('submenu' in item) {
                handleClicks(item.submenu)
            }
        })
    }

    handleClicks(template)

    // Build

    Menu.setApplicationMenu(Menu.buildFromTemplate(template))

    // Create dock menu

    if (process.platform == 'darwin') {
        app.dock.setMenu(Menu.buildFromTemplate([{
            label: 'New Window',
            click: function() { newWindow() }
        }]))
    }
}

ipcMain.on('build-menu', buildMenu)
ipcMain.on('new-window', newWindow)

app.on('window-all-closed', function() {
    // Quit when all windows are closed.
    app.quit()
})

app.on('ready', function() {
    if (!openfile && process.argv.length >= 2)
        openfile = process.argv[1]

    newWindow(openfile)
})

app.on('activate', function(e, hasVisibleWindows) {
    if (!hasVisibleWindows) newWindow()
})

app.on('open-file', function(e, path) {
    e.preventDefault()

    if (BrowserWindow.getAllWindows().length == 0) {
        openfile = path
    } else {
        newWindow(path)
    }
})
