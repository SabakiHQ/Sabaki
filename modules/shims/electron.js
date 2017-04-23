module.exports = {
    ipcRenderer: {},
    clipboard: {},
    shell: {},
    remote: {
        require: () => ({}),
        getCurrentWindow: () => null,
        app: {getName: () => 'Sabaki', getVersion: () => 'web', getPath: () => ''},
        dialog: {},
        Menu: {}
    }
}
