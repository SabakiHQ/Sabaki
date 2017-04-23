const path = require('path')
const helper = require('../helper')

const BrowserWindow = {
    show: helper.noop,
    close: helper.noop,
    on: helper.noop,
    isMaximized: false,
    isMinimized: false,
    isFullScreen: false,
    setFullScreen: helper.noop,
    setMenuBarVisibility: helper.noop,
    setAutoHideMenuBar: helper.noop,
    setProgressBar: helper.noop,
    setContentSize: helper.noop,
    getContentSize: [],
    webContents: {setAudioMuted: helper.noop}
}

module.exports = {
    ipcRenderer: {on: helper.noop, send: helper.noop},
    clipboard: {readText: helper.noop, writeText: helper.noop},
    shell: {openExternal: helper.noop},
    remote: {
        require: x => x === './modules/setting' ? require('../setting') : {},
        getCurrentWindow: () => BrowserWindow,
        app: {getName: () => 'Sabaki', getVersion: () => 'web', getPath: () => ''},
        dialog: {},
        Menu: {}
    }
}
