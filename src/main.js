const {
  app,
  shell,
  dialog,
  clipboard,
  ipcMain,
  nativeImage,
  BrowserWindow,
  Menu
} = require('electron')
const {resolve} = require('path')
const i18n = require('./i18n')
const setting = require('./setting')
const updater = require('./updater')

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
      sandbox: false,
      preload: resolve(__dirname, 'preload.js'),
      zoomFactor: setting.get('app.zoom_factor')
    }
  })

  windows.push(window)
  buildMenu()
  setupWindowEventForwarding(window)

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

function setupWindowEventForwarding(win) {
  const events = ['focus', 'blur', 'maximize', 'unmaximize', 'resize']
  events.forEach(event => {
    win.on(event, () => {
      win.webContents.send(`window:${event}`)
    })
  })
}

function setupIpcHandlers() {
  // App info
  ipcMain.handle('app:getName', () => app.name)
  ipcMain.handle('app:getVersion', () => app.getVersion())
  ipcMain.handle('app:quit', () => app.quit())

  // Window operations
  ipcMain.handle('window:setFullScreen', (e, f) => {
    BrowserWindow.fromWebContents(e.sender)?.setFullScreen(f)
  })
  ipcMain.handle('window:isFullScreen', e => {
    return BrowserWindow.fromWebContents(e.sender)?.isFullScreen() ?? false
  })
  ipcMain.handle('window:isMaximized', e => {
    return BrowserWindow.fromWebContents(e.sender)?.isMaximized() ?? false
  })
  ipcMain.handle('window:isMinimized', e => {
    return BrowserWindow.fromWebContents(e.sender)?.isMinimized() ?? false
  })
  ipcMain.handle('window:setMenuBarVisibility', (e, v) => {
    BrowserWindow.fromWebContents(e.sender)?.setMenuBarVisibility(v)
  })
  ipcMain.handle('window:setAutoHideMenuBar', (e, v) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (win) win.autoHideMenuBar = v
  })
  ipcMain.handle('window:getContentSize', e => {
    return BrowserWindow.fromWebContents(e.sender)?.getContentSize() ?? [0, 0]
  })
  ipcMain.handle('window:setContentSize', (e, w, h) => {
    BrowserWindow.fromWebContents(e.sender)?.setContentSize(
      Math.floor(w),
      Math.floor(h)
    )
  })
  ipcMain.handle('window:setProgressBar', (e, p) => {
    BrowserWindow.fromWebContents(e.sender)?.setProgressBar(p)
  })
  ipcMain.handle('window:close', e => {
    BrowserWindow.fromWebContents(e.sender)?.close()
  })
  ipcMain.handle('window:getId', e => {
    return BrowserWindow.fromWebContents(e.sender)?.id ?? null
  })

  // WebContents operations
  ipcMain.handle('webContents:setZoomFactor', (e, f) =>
    e.sender.setZoomFactor(f)
  )
  ipcMain.handle('webContents:getZoomFactor', e => e.sender.getZoomFactor())
  ipcMain.handle('webContents:setAudioMuted', (e, m) =>
    e.sender.setAudioMuted(m)
  )
  ipcMain.handle('webContents:undo', e => e.sender.undo())
  ipcMain.handle('webContents:redo', e => e.sender.redo())
  ipcMain.handle('webContents:toggleDevTools', e => e.sender.toggleDevTools())
  ipcMain.handle('webContents:getOSProcessId', e => e.sender.getOSProcessId())

  // Dialogs
  ipcMain.handle('dialog:showMessageBox', async (e, opts) => {
    return dialog.showMessageBox(BrowserWindow.fromWebContents(e.sender), opts)
  })
  ipcMain.handle('dialog:showOpenDialog', async (e, opts) => {
    return dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), opts)
  })
  ipcMain.handle('dialog:showSaveDialog', async (e, opts) => {
    return dialog.showSaveDialog(BrowserWindow.fromWebContents(e.sender), opts)
  })

  // Menu popup
  ipcMain.handle('menu:popup', (e, template, x, y) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const zoomFactor = setting.get('app.zoom_factor')

    // Build menu from template
    // Click handlers are stored in renderer with IDs - we just send the ID back
    const buildMenuFromTemplate = items => {
      return items.map(item => {
        if (!item) return item
        const newItem = {...item}
        // Items with IDs have click handlers stored in the renderer
        if (item.id && item.id.startsWith('popup-menu-')) {
          newItem.click = () => {
            win.webContents.send('menu-click', item.id)
          }
        }
        if (item.submenu) {
          newItem.submenu = buildMenuFromTemplate(item.submenu)
        }
        return newItem
      })
    }

    Menu.buildFromTemplate(buildMenuFromTemplate(template)).popup({
      window: win,
      x: x != null ? Math.round(x * zoomFactor) : undefined,
      y: y != null ? Math.round(y * zoomFactor) : undefined
    })
  })

  // Shell
  ipcMain.handle('shell:openExternal', (_, url) => shell.openExternal(url))
  ipcMain.handle('shell:showItemInFolder', (_, p) => shell.showItemInFolder(p))

  // Clipboard
  ipcMain.handle('clipboard:readText', () => clipboard.readText())
  ipcMain.handle('clipboard:writeText', (_, t) => clipboard.writeText(t))

  // Settings - for renderer access
  ipcMain.handle('setting:get', (_, key) => setting.get(key))
  ipcMain.handle('setting:set', (e, key, value) => {
    setting.set(key, value)
    // Notify all windows of the change
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('setting:change', {key, value})
    })
    return true
  })

  // Synchronous handler for initial settings load (used by preload)
  ipcMain.on('setting:getAllSync', e => {
    try {
      const keys = [
        'app.lang',
        'app.zoom_factor',
        'view.show_leftsidebar',
        'view.leftsidebar_width',
        'view.show_winrategraph',
        'view.show_graph',
        'view.show_comments',
        'view.sidebar_width',
        'view.sidebar_minwidth',
        'view.leftsidebar_minwidth',
        'view.show_menubar',
        'view.show_coordinates',
        'view.show_move_colorization',
        'view.show_move_numbers',
        'view.show_next_moves',
        'view.show_siblings',
        'view.coordinates_type',
        'view.fuzzy_stone_placement',
        'view.animated_stone_placement',
        'board.analysis_type',
        'board.show_analysis',
        'board.analysis_interval',
        'board.variation_replay_mode',
        'board.variation_replay_interval',
        'graph.grid_size',
        'graph.node_size',
        'graph.delay',
        'engines.list',
        'engines.analyze_commands',
        'engines.gemove_analyze_commands',
        'scoring.method',
        'score.estimator_iterations',
        'sound.enable',
        'sound.capture_delay_min',
        'sound.capture_delay_max',
        'game.default_board_size',
        'game.default_komi',
        'game.default_handicap',
        'game.goto_end_after_loading',
        'game.navigation_analysis_delay',
        'game.navigation_sensitivity',
        'game.show_ko_warning',
        'game.show_suicide_warning',
        'edit.click_currentvertex_to_remove',
        'edit.copy_variation_strip_props',
        'edit.flatten_inherit_root_props',
        'edit.history_batch_interval',
        'edit.max_history_count',
        'edit.show_removenode_warning',
        'edit.show_removeothervariations_warning',
        'file.show_reload_warning',
        'find.delay',
        'sgf.comment_properties',
        'sgf.format_code',
        'app.loadgame_delay',
        'app.hide_busy_delay',
        'gamechooser.show_delay',
        'gamechooser.thumbnail_size',
        'gtp.console_log_enabled',
        'gtp.console_log_path',
        'gtp.engine_quit_timeout',
        'gtp.move_delay',
        'infooverlay.duration',
        'autoscroll.max_interval',
        'autoscroll.min_interval',
        'autoscroll.diff',
        'autoplay.sec_per_move',
        'autoplay.max_sec_per_move',
        'comments.show_move_interpretation',
        'comments.commit_delay',
        'console.max_history_count',
        'cleanmarkup.annotations',
        'cleanmarkup.arrow',
        'cleanmarkup.circle',
        'cleanmarkup.comments',
        'cleanmarkup.cross',
        'cleanmarkup.hotspots',
        'cleanmarkup.label',
        'cleanmarkup.line',
        'cleanmarkup.square',
        'cleanmarkup.triangle',
        'cleanmarkup.winrate',
        'view.properties_height',
        'view.properties_minheight',
        'view.peerlist_height',
        'view.peerlist_minheight',
        'view.winrategraph_height',
        'view.winrategraph_minheight',
        'view.winrategraph_maxheight',
        'view.winrategraph_invert',
        'view.winrategraph_blunderthreshold',
        'theme.current',
        'theme.custom_whitestones',
        'theme.custom_blackstones',
        'theme.custom_board',
        'theme.custom_background',
        'window.width',
        'window.height',
        'app.always_show_result'
      ]
      const result = {}
      for (const key of keys) {
        result[key] = setting.get(key)
      }
      e.returnValue = result
    } catch (err) {
      console.error('[main] Error in setting:getAllSync:', err)
      e.returnValue = {}
    }
  })

  ipcMain.handle('setting:getAll', () => {
    // Return all settings that the renderer needs
    const keys = [
      'app.lang',
      'app.zoom_factor',
      'view.show_leftsidebar',
      'view.leftsidebar_width',
      'view.show_winrategraph',
      'view.show_graph',
      'view.show_comments',
      'view.sidebar_width',
      'view.sidebar_minwidth',
      'view.leftsidebar_minwidth',
      'view.show_menubar',
      'view.show_coordinates',
      'view.show_move_colorization',
      'view.show_move_numbers',
      'view.show_next_moves',
      'view.show_siblings',
      'view.coordinates_type',
      'view.fuzzy_stone_placement',
      'view.animated_stone_placement',
      'board.analysis_type',
      'board.show_analysis',
      'board.analysis_interval',
      'board.variation_replay_mode',
      'board.variation_replay_interval',
      'graph.grid_size',
      'graph.node_size',
      'graph.delay',
      'engines.list',
      'engines.analyze_commands',
      'engines.gemove_analyze_commands',
      'scoring.method',
      'score.estimator_iterations',
      'sound.enable',
      'sound.capture_delay_min',
      'sound.capture_delay_max',
      'game.default_board_size',
      'game.default_komi',
      'game.default_handicap',
      'game.goto_end_after_loading',
      'game.navigation_analysis_delay',
      'game.navigation_sensitivity',
      'game.show_ko_warning',
      'game.show_suicide_warning',
      'edit.click_currentvertex_to_remove',
      'edit.copy_variation_strip_props',
      'edit.flatten_inherit_root_props',
      'edit.history_batch_interval',
      'edit.max_history_count',
      'edit.show_removenode_warning',
      'edit.show_removeothervariations_warning',
      'file.show_reload_warning',
      'find.delay',
      'sgf.comment_properties',
      'sgf.format_code',
      'app.loadgame_delay',
      'app.hide_busy_delay',
      'gamechooser.show_delay',
      'gamechooser.thumbnail_size',
      'gtp.console_log_enabled',
      'gtp.console_log_path',
      'gtp.engine_quit_timeout',
      'gtp.move_delay',
      'infooverlay.duration',
      'autoscroll.max_interval',
      'autoscroll.min_interval',
      'autoscroll.diff',
      'autoplay.sec_per_move',
      'autoplay.max_sec_per_move',
      'comments.show_move_interpretation',
      'comments.commit_delay',
      'console.max_history_count',
      'cleanmarkup.annotations',
      'cleanmarkup.arrow',
      'cleanmarkup.circle',
      'cleanmarkup.comments',
      'cleanmarkup.cross',
      'cleanmarkup.hotspots',
      'cleanmarkup.label',
      'cleanmarkup.line',
      'cleanmarkup.square',
      'cleanmarkup.triangle',
      'cleanmarkup.winrate',
      'view.properties_height',
      'view.properties_minheight',
      'view.peerlist_height',
      'view.peerlist_minheight',
      'view.winrategraph_height',
      'view.winrategraph_minheight',
      'view.winrategraph_maxheight',
      'view.winrategraph_invert',
      'view.winrategraph_blunderthreshold',
      'theme.current',
      'theme.custom_whitestones',
      'theme.custom_blackstones',
      'theme.custom_board',
      'theme.custom_background',
      'window.width',
      'window.height',
      'app.always_show_result'
    ]
    const result = {}
    for (const key of keys) {
      result[key] = setting.get(key)
    }
    return result
  })
  ipcMain.handle('setting:getThemes', () => setting.getThemes())
  ipcMain.handle(
    'setting:getUserDataDirectory',
    () => setting.userDataDirectory
  )
  ipcMain.handle('setting:getThemesDirectory', () => setting.themesDirectory)
}

async function main() {
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

  setupIpcHandlers()

  if (!openfile && process.argv.length >= 2) {
    if (
      !['electron.exe', 'electron'].some(x =>
        process.argv[0].toLowerCase().endsWith(x)
      )
    ) {
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
