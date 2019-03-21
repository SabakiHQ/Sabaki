const {app, shell, dialog, ipcMain, BrowserWindow, Menu} = require('electron')
const {join} = require('path')
const {t} = require('./i18n')
const setting = require('./setting')
const updater = require('./updater')

let windows = []
let openfile = null
let isReady = false

if (!setting.get('app.enable_hardware_acceleration')) {
    app.disableHardwareAcceleration()
}

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

    window.once('ready-to-show', () => {
        window.show()
    })

    window.on('closed', () => {
        window = null
    })

    window.webContents.setAudioMuted(!setting.get('sound.enable'))

    window.webContents.on('did-finish-load', () => {
        if (path) window.webContents.send('load-file', path)
    })

    window.webContents.on('new-window', evt => {
        evt.preventDefault()
    })

    window.loadURL(`file://${join(__dirname, '..', 'index.html')}`)

    if (setting.get('debug.dev_tools')) {
        window.openDevTools()
    }

    return window
}

function buildMenu(disableAll = false) {
    let template = require('./menu').clone()

    // Process menu items

    let processMenu = items => {
        return items.map(item => {
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

            return item
        })
    }

    Menu.setApplicationMenu(Menu.buildFromTemplate(processMenu(template)))

    // Create dock menu

    let dockMenu = Menu.buildFromTemplate([
        {
            label: t('menu.dock', 'New Window'),
            click: () => newWindow()
        }
    ])

    if (process.platform === 'darwin') {
        app.dock.setMenu(dockMenu)
    }
}

async function checkForUpdates(showFailDialogs) {
    try {
        let info = await updater.check(`SabakiHQ/${app.getName()}`)

        if (info.hasUpdates) {
            dialog.showMessageBox({
                type: 'info',
                buttons: [
                    t('updater', 'Download Update'),
                    t('updater', 'View Changelog'),
                    t('updater', 'Not Now')
                ],
                title: app.getName(),
                message: t('updater', p => `${p.appName} v${p.version} is available now.`, {
                    appName: app.getName(),
                    version: info.latestVersion
                }),
                noLink: true,
                cancelId: 2
            }, response => {
                if (response === 0) {
                    shell.openExternal(info.downloadUrl || info.url)
                } else if (response === 1) {
                    shell.openExternal(info.url)
                }
            })
        } else if (showFailDialogs) {
            dialog.showMessageBox({
                type: 'info',
                buttons: [t('updater', 'OK')],
                title: t('updater', 'No update available'),
                message: t('updater', p => `Sabaki v${p.version} is the latest version.`, {
                    version: app.getVersion()
                })
            }, () => {})
        }
    } catch (err) {
        if (showFailDialogs) {
            dialog.showMessageBox({
                type: 'warning',
                buttons: [t('updater', 'OK')],
                title: app.getName(),
                message: t('updater', 'An error occurred while checking for updates.')
            })
        }
    }
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

    let endsIn = (str, end) => str.slice(-end.length) === end

    if (!openfile && process.argv.length >= 2) {
        if (!endsIn(process.argv[0], 'electron.exe') && !endsIn(process.argv[0], 'electron')) {
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
    dialog.showErrorBox(
        t('exception', p => `${p.appName} v${p.version}`, {
            appName: app.getName(),
            version: app.getVersion()
        }),
        t('exception', p => `Something weird happened. ${p.appName} will shut itself down. If possible, please report this on ${p.appName}’s repository on GitHub.`, {
            appName: app.getName()
        }) + '\n\n' + err.stack
    )

    process.exit(1)
})
