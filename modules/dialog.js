const {ipcRenderer, remote} = require('electron')
const {app, dialog} = remote

exports.showMessageBox = function(message, type = 'info', buttons = ['OK'], cancelId = 0) {
    sabaki.setBusy(true)
    ipcRenderer.send('build-menu', true)

    let result = dialog.showMessageBox(remote.getCurrentWindow(), {
        type,
        buttons,
        title: app.getName(),
        message,
        cancelId,
        noLink: true
    })

    ipcRenderer.send('build-menu')
    sabaki.setBusy(false)

    return result
}

exports.showFileDialog = function(type, options) {
    sabaki.setBusy(true)
    ipcRenderer.send('build-menu', true)

    let [t, ...ype] = [...type]
    type = t.toUpperCase() + ype.join('').toLowerCase()

    let result = dialog[`show${type}Dialog`](remote.getCurrentWindow(), options)

    ipcRenderer.send('build-menu')
    sabaki.setBusy(false)

    return result
}

exports.showOpenDialog = function(options) {
    return exports.showFileDialog('open', options)
}

exports.showSaveDialog = function(options) {
    return exports.showFileDialog('save', options)
}
