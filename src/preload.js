const {ipcRenderer} = require('electron')

// Try to load webUtils (available in Electron 32+)
let webUtils
try {
  webUtils = require('electron').webUtils
} catch (e) {
  webUtils = null
}

// Settings cache - initialized synchronously before app loads
let settingsCache
try {
  settingsCache = ipcRenderer.sendSync('setting:getAllSync')
} catch (e) {
  console.error('[preload] Error getting settings:', e)
  settingsCache = {}
}

// Paths and themes cache - initialized synchronously before app loads
let pathsCache
try {
  pathsCache = ipcRenderer.sendSync('setting:getPathsSync')
} catch (e) {
  console.error('[preload] Error getting paths:', e)
  pathsCache = {
    themesDirectory: '',
    stylesPath: '',
    userDataDirectory: '',
    themes: {}
  }
}

// Single listener for setting changes, dispatches to multiple callbacks
const settingChangeCallbacks = new Set()
ipcRenderer.on('setting:change', (_, data) => {
  settingsCache[data.key] = data.value
  for (const callback of settingChangeCallbacks) {
    callback(data)
  }
})

window.sabaki = {
  // Settings - sync get with cache, async set
  setting: {
    get: key => {
      return settingsCache[key]
    },
    set: async (key, value) => {
      settingsCache[key] = value
      await ipcRenderer.invoke('setting:set', key, value)
      return window.sabaki.setting
    },
    getThemes: () => pathsCache.themes,
    loadThemes: async () => {
      pathsCache.themes = await ipcRenderer.invoke('setting:loadThemes')
      return pathsCache.themes
    },
    themesDirectory: pathsCache.themesDirectory,
    stylesPath: pathsCache.stylesPath,
    getUserDataDirectory: () => pathsCache.userDataDirectory,
    getThemesDirectory: () => pathsCache.themesDirectory,
    onDidChange: callback => {
      settingChangeCallbacks.add(callback)
      return () => settingChangeCallbacks.delete(callback)
    }
  },

  // Window operations
  window: {
    setFullScreen: f => ipcRenderer.invoke('window:setFullScreen', f),
    isFullScreen: () => ipcRenderer.invoke('window:isFullScreen'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    isMinimized: () => ipcRenderer.invoke('window:isMinimized'),
    setMenuBarVisibility: v =>
      ipcRenderer.invoke('window:setMenuBarVisibility', v),
    setAutoHideMenuBar: v => ipcRenderer.invoke('window:setAutoHideMenuBar', v),
    getContentSize: () => ipcRenderer.invoke('window:getContentSize'),
    setContentSize: (w, h) => ipcRenderer.invoke('window:setContentSize', w, h),
    setProgressBar: p => ipcRenderer.invoke('window:setProgressBar', p),
    close: () => ipcRenderer.invoke('window:close'),
    getId: () => ipcRenderer.invoke('window:getId'),
    on: (event, callback) => {
      const handler = (evt, ...args) => callback(...args)
      ipcRenderer.on(`window:${event}`, handler)
      return () => ipcRenderer.removeListener(`window:${event}`, handler)
    },
    removeListener: (event, callback) => {
      // This is a no-op since we return unsubscribe function from on()
      // But we provide it for API compatibility
    }
  },

  // WebContents operations
  webContents: {
    setZoomFactor: f => ipcRenderer.invoke('webContents:setZoomFactor', f),
    getZoomFactor: () => ipcRenderer.invoke('webContents:getZoomFactor'),
    setAudioMuted: m => ipcRenderer.invoke('webContents:setAudioMuted', m),
    undo: () => ipcRenderer.invoke('webContents:undo'),
    redo: () => ipcRenderer.invoke('webContents:redo'),
    toggleDevTools: () => ipcRenderer.invoke('webContents:toggleDevTools'),
    getOSProcessId: () => ipcRenderer.invoke('webContents:getOSProcessId')
  },

  // Dialogs (ASYNC - callers must await)
  dialog: {
    showMessageBox: opts => ipcRenderer.invoke('dialog:showMessageBox', opts),
    showOpenDialog: opts => ipcRenderer.invoke('dialog:showOpenDialog', opts),
    showSaveDialog: opts => ipcRenderer.invoke('dialog:showSaveDialog', opts)
  },

  // Menu
  menu: {
    popup: (template, x, y) => ipcRenderer.invoke('menu:popup', template, x, y)
  },

  // App info
  app: {
    getName: () => ipcRenderer.invoke('app:getName'),
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    quit: () => ipcRenderer.invoke('app:quit')
  },

  // Shell
  shell: {
    openExternal: url => ipcRenderer.invoke('shell:openExternal', url),
    showItemInFolder: p => ipcRenderer.invoke('shell:showItemInFolder', p)
  },

  // Clipboard
  clipboard: {
    readText: () => ipcRenderer.invoke('clipboard:readText'),
    writeText: t => ipcRenderer.invoke('clipboard:writeText', t)
  },

  // File path helper for Electron 32+ (File.path was removed)
  getPathForFile: file => {
    if (webUtils && webUtils.getPathForFile) {
      return webUtils.getPathForFile(file)
    }
    return file.path // Fallback for older Electron
  }
}
