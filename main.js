const {app, shell, dialog, ipcMain} = require('electron')
const {BrowserWindow, Menu} = require('electron')
const fs = require('fs')
const setting = require('./modules/setting')
const updater = require('./modules/updater')

let windows = []
let openfile = null
let isReady = false

function newWindow(path) {
    let window = new BrowserWindow({
        icon: process.platform === 'linux' ? `${__dirname}/logo.png` : null,
        title: app.getName(),
        useContentSize: true,
        width: setting.get('window.width'),
        height: setting.get('window.height'),
        minWidth: setting.get('window.minwidth'),
        minHeight: setting.get('window.minheight'),
        backgroundColor: '#111111',
        show: false,
        webPreferences: {
            zoomFactor: setting.get('debug.zoom_factor')
        }
    })

    windows.push(window)
    buildMenu()

    window.webContents.setAudioMuted(!setting.get('sound.enable'))
    window.webContents.on('did-finish-load', () => {
        if (path) window.webContents.send('load-file', path)
    }).on('new-window', evt => {
        evt.preventDefault()
    })

    window.on('focus', () => {
        window.webContents.send('window-focus')
    }).on('closed', () => {
        window = null
    })

    window.loadURL(`file://${__dirname}/index.html`)

    // if (setting.get('debug.dev_tools')) {
        window.toggleDevTools()
    // }

    return window
}

function buildMenu(disableAll = false) {
    let template = JSON.parse(fs.readFileSync(`${__dirname}/data/menu.json`))
    let findMenuItem = str => template.find(x => x.label.replace('&', '') === str)

    // Create app menu for OS X

    if (process.platform === 'darwin') {
        let appMenu = [{role: 'about'}]

        // Remove original 'Check for Updates' menu item

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
                ],
            },
            {type: 'separator'},
            {role: 'hide'},
            {role: 'hideothers'},
            {type: 'separator'},
            {role: 'quit'}
        )

        template.unshift({
            label: '{name}',
            submenu: appMenu
        })

        // Add 'Window' menu

        template.splice(template.length - 1, 0, {
            submenu: [
                {
                    label: 'New Window',
                    click: () => newWindow(),
                    enabled: true
                },
                {role: 'minimize'},
                {type: 'separator'},
                {role: 'front'}
            ],
            role: 'window'
        })
    }

    // Load engines

    let engineMenu = findMenuItem('Engine')

    if (engineMenu) {
        setting.load()

        let attachMenu = engineMenu.submenu[0].submenu
        let engines = setting.get('engines.list')

        attachMenu.length = 0

        engines.forEach(engine => {
            attachMenu.push({
                label: engine.name.trim() === '' ? '(Unnamed Engine)' : engine.name,
                click: () => {
                    let window = BrowserWindow.getFocusedWindow()
                    if (!window) return

                    window.webContents.send('attach-engine', engine)
                }
            })
        })

        if (engines.length !== 0) {
            attachMenu.push({type: 'separator'})
        }

        attachMenu.push({
            label: '&Manage Engines…',
            action: 'manageengines'
        })
    }

    // Process menu items

    let processMenu = items => {
        items.forEach(item => {
            if ('label' in item) {
                item.label = item.label
                .replace('{name}', app.getName())
                .replace('{version}', app.getVersion())
            }

            if ('action' in item) {
                let action = item.action

                item.click = () => {
                    let window = BrowserWindow.getFocusedWindow()
                    if (!window) return

                    window.webContents.send('menu-click', action)
                }

                delete item.action
            }

            if ('checked' in item) {
                item.type = 'checkbox'
                item.checked = !!setting.get(item.checked)
            }

            if (disableAll && !item.enabled && !('submenu' in item || 'role' in item)) {
                item.enabled = false
            }

            if ('submenu' in item) {
                processMenu(item.submenu)
            }
        })
    }

    processMenu(template)

    // Build

    Menu.setApplicationMenu(Menu.buildFromTemplate(template))

    // Create dock menu

    if (process.platform === 'darwin') {
        app.dock.setMenu(Menu.buildFromTemplate([{
            label: 'New Window',
            click: () => newWindow()
        }]))
    }
}

function checkForUpdates(showNoUpdatesDialog) {
    let repo = `yishn/${app.getName()}`

    updater.check(repo, (err, hasUpdates, url) => {
        if (err) return

        if (hasUpdates) {
            dialog.showMessageBox({
                type: 'info',
                buttons: ['Download Update', 'Not Now'],
                title: app.getName(),
                message: `There is a new version of ${app.getName()} available.`,
                noLink: true,
                cancelId: 1
            }, response => response === 0 ? shell.openExternal(url) : null)
        } else if (showNoUpdatesDialog) {
            dialog.showMessageBox({
                type: 'info',
                buttons: ['OK'],
                title: app.getName(),
                message: 'There are no updates available.'
            }, () => {})
        }
    })
}

ipcMain.on('new-window', (evt, ...args) => newWindow(...args))
ipcMain.on('build-menu', (evt, ...args) => buildMenu(...args))
ipcMain.on('check-for-updates', (evt, ...args) => checkForUpdates(...args))

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    } else {
        buildMenu(true)
    }
})

app.on('ready', () => {
    isReady = true

    if (!openfile && process.argv.length >= 2)
        openfile = process.argv[1]

    newWindow(openfile)

    if (setting.get('app.startup_check_updates')) {
        setTimeout(checkForUpdates, setting.get('app.startup_check_updates_delay'))
    }
})

app.on('activate', (evt, hasVisibleWindows) => {
    if (!hasVisibleWindows) newWindow()
})

app.on('open-file', (evt, path) => {
    evt.preventDefault()

    if (!isReady) {
        openfile = path
    } else {
        newWindow(path)
    }
})

process.on('uncaughtException', err => {
    dialog.showErrorBox(`${app.getName()} v${app.getVersion()}`, [
        'Something weird happened. ',
        `${app.getName()} will shut itself down. `,
        'If possible, please report this on ',
        `${app.getName()}’s repository on GitHub.\n\n`,
        err.stack
    ].join(''))

    app.quit()
})
