const {app, shell, dialog, ipcMain, BrowserWindow, Menu} = require('electron')
const fs = require('fs')
const {join} = require('path')
const setting = require('./setting')
const updater = require('./updater')

let windows = []
let openfile = null
let isReady = false

function newWindow(path) {
    let window = new BrowserWindow({
        icon: process.platform === 'linux' ? join(__dirname, '..', 'logo.png') : null,
        title: app.getName(),
        useContentSize: true,
        width: setting.get('window.width'),
        height: setting.get('window.height'),
        minWidth: setting.get('window.minwidth'),
        minHeight: setting.get('window.minheight'),
        autoHideMenuBar: !setting.get('view.show_menubar'),
        backgroundColor: '#111111',
        show: false,
        webPreferences: {
            zoomFactor: setting.get('app.zoom_factor')
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

    window.on('closed', () => {
        window = null
    })

    window.loadURL(`file://${__dirname}/../index.html`)

    if (setting.get('debug.dev_tools')) {
        window.openDevTools()
    }

    return window
}

function buildMenu(disableAll = false) {
    let template = require('./menu').clone()

    // Process menu items

    let processMenu = items => {
        items.forEach(item => {
            if ('click' in item) {
                item.click = () => {
                    let window = BrowserWindow.getFocusedWindow()
                    if (!window) return

                    window.webContents.send(`menu-click-${item.id}`)
                }
            }

            if ('clickMain' in item) {
                let key = item.clickMain

                item.click = () => ({
                    newWindow,
                    checkForUpdates: () => checkForUpdates(true)
                })[key]()

                delete item.clickMain
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

function checkForUpdates(showFailDialogs) {
    updater.check(`yishn/${app.getName()}`, (err, info) => {
        if (err) return showFailDialogs && dialog.showMessageBox({
            type: 'warning',
            buttons: ['OK'],
            title: app.getName(),
            message: 'An error occurred when checking for updates.'
        })

        if (info.hasUpdates) {
            dialog.showMessageBox({
                type: 'info',
                buttons: ['Download Update', 'Not Now'],
                title: app.getName(),
                message: `${app.getName()} v${info.latestVersion} is available now.`,
                noLink: true,
                cancelId: 1
            }, response => response === 0 ? shell.openExternal(info.url) : null)
        } else if (showFailDialogs) {
            dialog.showMessageBox({
                type: 'info',
                buttons: ['OK'],
                title: 'No update available',
                message: `Sabaki v${app.getVersion()} is the latest version.`
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

    if (!openfile && process.argv.length >= 2) {
        if (process.argv[0].slice(-'electron.exe'.length) !== 'electron.exe') {
            openfile = process.argv[1]
        } else if (process.argv.length >= 3) {
            openfile = process.argv[2]
        }
    }

    newWindow(openfile)

    if (setting.get('app.startup_check_updates')) {
        setTimeout(() => checkForUpdates(), setting.get('app.startup_check_updates_delay'))
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

    process.exit(1)
})
