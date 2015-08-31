var crypto = require('crypto')
var remote = require('remote')
var dialog = remote.require('dialog')

exports.md5 = function(str) {
    return crypto.createHash('md5').update(str).digest('hex')
}

exports.showMessageBox = function(message, type, buttons, cancelId) {
    dialog.showMessageBox(remote.getCurrentWindow(), {
        'type': type,
        'buttons': buttons,
        'title': app.getName(),
        'message': message,
        'cancelId': cancelId,
        'noLink': true
    })
}
