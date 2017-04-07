const {ipcRenderer, remote} = require('electron')
const {app, dialog} = remote || require('electron')
const helper = require('./helper')

exports.showMessageBox = function(message, type = 'info', buttons = ['OK'], cancelId = 0) {
    sabaki.setBusy(true)

    let result = dialog.showMessageBox(sabaki.window, {
        type,
        buttons,
        title: sabaki.appName,
        message,
        cancelId,
        noLink: true
    })

    sabaki.setBusy(false)
    return result
}

exports.showFileDialog = function(type, options) {
    sabaki.setBusy(true)

    let [t, ...ype] = [...type]
    type = t.toUpperCase() + ype.join('').toLowerCase()

    let result = dialog[`show${type}Dialog`](sabaki.window, options)

    sabaki.setBusy(false)
    return result
}

exports.showOpenDialog = function(options) {
    return exports.showFileDialog('open', options)
}

exports.showSaveDialog = function(options) {
    return exports.showFileDialog('save', options)
}

exports.showInputBox = function(message, onSubmit = helper.noop, onCancel = helper.noop) {
    sabaki.setState({
        inputBoxText: message,
        showInputBox: true,
        onInputBoxSubmit: onSubmit,
        onInputBoxCancel: onCancel
    })
}

exports.closeInputBox = function() {
    let {onInputBoxCancel = helper.noop} = sabaki.state
    sabaki.setState({showInputBox: false})
    onInputBoxCancel()
}
