const {noop} = require('../helper')

let app = {
    getName: () => 'Sabaki',
    getVersion: () => 'web',
    getPath: () => ''
}

module.exports = {
    app,
    ipcRenderer: {on: noop, send: noop},
    clipboard: {readText: noop, writeText: noop},
    shell: {openExternal: noop},

    remote: {
        app,
        require: x => x === './modules/setting' ? require('../setting') : {},

        getCurrentWindow: () => ({
            show: noop,
            close: noop,
            on: noop,
            isMaximized: false,
            isMinimized: false,
            isFullScreen: false,
            setFullScreen: noop,
            setMenuBarVisibility: noop,
            setAutoHideMenuBar: noop,
            setProgressBar: noop,
            setContentSize: noop,
            getContentSize: [0, 0],
            webContents: {setAudioMuted: noop}
        }),

        Menu: require('./Menu')
    }
}
