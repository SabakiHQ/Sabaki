const path = require('path')
const helper = require('../helper')

let app = {
    getName: () => 'Sabaki',
    getVersion: () => 'web',
    getPath: () => ''
}

module.exports = {
    ipcRenderer: {on: helper.noop, send: helper.noop},
    clipboard: {readText: helper.noop, writeText: helper.noop},
    shell: {openExternal: helper.noop},

    app,

    remote: {
        require: x => x === './modules/setting' ? require('../setting') : {},

        getCurrentWindow: () => ({
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
        }),

        app,

        dialog: {
            showMessageBox: (_, {message, cancelId}) => {
                let result = confirm(message)
                return result ? 0 : cancelId
            },
            showOpenDialog: helper.noop,
            showSaveDialog: helper.noop
        },

        Menu: {}
    }
}
