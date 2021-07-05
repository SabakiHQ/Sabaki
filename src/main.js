const {
  app,
  shell,
  dialog,
  ipcMain,
  nativeImage,
  BrowserWindow,
  Menu
} = require('electron')
const {resolve} = require('path')
const i18n = require('./i18n')
const setting = require('./setting')
const updater = require('./updater')
require('@electron/remote/main').initialize()

let windows = []
let openfile = null

function newWindow(path) {
  let window = new BrowserWindow({
    icon: nativeImage.createFromPath(resolve(__dirname, '../logo.png')),
    title: app.name,
    useContentSize: true,
    width: setting.get('window.width'),
    height: setting.get('window.height'),
    minWidth: setting.get('window.minwidth'),
    minHeight: setting.get('window.minheight'),
    autoHideMenuBar: !setting.get('view.show_menubar'),
    backgroundColor: '#111111',
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      zoomFactor: setting.get('app.zoom_factor')
    }
  })

  windows.push(window)
  buildMenu()

  window.once('ready-to-show', () => {
    window.show()
  })

  if (setting.get('window.maximized') === true) {
    window.maximize()
  }

  // store the window size
  window.on('maximize', () => {
    setting.set('window.maximized', true)
  })

  window.on('unmaximize', () => {
    setting.set('window.maximized', false)
  })

  window.on('closed', () => {
    window = null
  })

  window.webContents.audioMuted = !setting.get('sound.enable')

  window.webContents.on('did-finish-load', () => {
    if (path) window.webContents.send('load-file', path)
  })

  window.webContents.setWindowOpenHandler(({url, frameName}) => {
    return {action: 'deny'}
  })

  window.loadURL(`file://${resolve(__dirname, '../index.html')}`)

  return window
}

function buildMenu(props = {}) {
  let template = require('./menu').get(props)

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

        item.click = () =>
          ({
            newWindow,
            checkForUpdates: () => checkForUpdates({showFailDialogs: true})
          }[key]())

        delete item.clickMain
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
      label: i18n.t('menu.file', 'New &Window'),
      click: () => newWindow()
    }
  ])

  if (process.platform === 'darwin') {
    app.dock.setMenu(dockMenu)
  }
}

async function checkForUpdates({showFailDialogs = false} = {}) {
  try {
    let t = i18n.context('updater')
    let info = await updater.check(`SabakiHQ/${app.name}`)

    if (info.hasUpdates) {
      dialog.showMessageBox(
        {
          type: 'info',
          buttons: [t('Download Update'), t('View Changelog'), t('Not Now')],
          title: app.name,
          message: t(p => `${p.appName} v${p.version} is available now.`, {
            appName: app.name,
            version: info.latestVersion
          }),
          noLink: true,
          cancelId: 2
        },
        response => {
          if (response === 2) return

          shell.openExternal(
            response === 0 ? info.downloadUrl || info.url : info.url
          )
        }
      )
    } else if (showFailDialogs) {
      dialog.showMessageBox(
        {
          type: 'info',
          buttons: [t('OK')],
          title: t('No updates available'),
          message: t(p => `${p.appName} v${p.version} is the latest version.`, {
            appName: app.name,
            version: app.getVersion()
          })
        },
        () => {}
      )
    }
  } catch (err) {
    if (showFailDialogs) {
      dialog.showMessageBox({
        type: 'warning',
        buttons: [t('OK')],
        title: app.name,
        message: t('An error occurred while checking for updates.')
      })
    }
  }
}

async function main() {
  app.allowRendererProcessReuse = true

  if (!setting.get('app.enable_hardware_acceleration')) {
    app.disableHardwareAcceleration()
  }

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    } else {
      buildMenu({disableAll: true})
    }
  })

  app.on('activate', (evt, hasVisibleWindows) => {
    if (app.isReady() && !hasVisibleWindows) newWindow()
  })

  app.on('open-file', (evt, path) => {
    evt.preventDefault()

    if (!app.isReady()) {
      openfile = path
    } else {
      newWindow(path)
    }
  })

  process.on('uncaughtException', err => {
    let t = i18n.context('exception')

    dialog.showErrorBox(
      t(p => `${p.appName} v${p.version}`, {
        appName: app.name,
        version: app.getVersion()
      }),
      t(
        p =>
          [
            `Something weird happened. ${p.appName} will shut itself down.`,
            `If possible, please report this on ${p.appName}’s repository on GitHub.`
          ].join(' '),
        {
          appName: app.name
        }
      ) +
        '\n\n' +
        err.stack
    )

    process.exit(1)
  })

  await app.whenReady()

  if (!openfile && process.argv.length >= 2) {
    if (!['electron.exe', 'electron'].some(x => process.argv[0].endsWith(x))) {
      openfile = process.argv[1]
    } else if (process.argv.length >= 3) {
      openfile = process.argv[2]
    }
  }

  newWindow(openfile)

  if (setting.get('app.startup_check_updates')) {
    setTimeout(
      () => checkForUpdates(),
      setting.get('app.startup_check_updates_delay')
    )
  }

  ipcMain.on('new-window', (evt, ...args) => newWindow(...args))
  ipcMain.on('build-menu', (evt, ...args) => buildMenu(...args))
  ipcMain.on('check-for-updates', (evt, ...args) => checkForUpdates(...args))
}

main()
