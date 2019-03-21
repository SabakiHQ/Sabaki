const {remote} = require('electron')
const {app, dialog} = remote
const helper = require('./helper')
const t = require('../i18n').context('dialog')

exports.showMessageBox = function(message, type = 'info', buttons = [t('OK')], cancelId = 0) {
    sabaki.setBusy(true)

    let result = dialog.showMessageBox(remote.getCurrentWindow(), {
        type,
        buttons,
        title: app.getName(),
        message,
        cancelId,
        noLink: true
    })

    sabaki.setBusy(false)
    return result
}

exports.showFileDialog = function(type, options, callback = helper.noop) {
    sabaki.setBusy(true)

    let [t, ...ype] = [...type]
    type = t.toUpperCase() + ype.join('').toLowerCase()

    let result = dialog[`show${type}Dialog`](remote.getCurrentWindow(), options)

    sabaki.setBusy(false)
    callback({result})
}

exports.showOpenDialog = function(options, callback) {
    return exports.showFileDialog('open', options, callback)
}

exports.showSaveDialog = function(options, callback) {
    return exports.showFileDialog('save', options, callback)
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
