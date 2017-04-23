const path = require('path')

module.exports = {
    ipcRenderer: {},
    clipboard: {},
    shell: {},
    remote: {
        require: x => x === './modules/setting' ? require('../setting') : {},
        getCurrentWindow: () => null,
        app: {getName: () => 'Sabaki', getVersion: () => 'web', getPath: () => ''},
        dialog: {},
        Menu: {}
    }
}
