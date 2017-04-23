const {h, render} = require('preact')
const helper = require('./helper')

let fileInput = render(h('input', {
    type: 'file',
    style: {
        opacity: 0,
        pointerEvents: 'none'
    }
}), document.body)

exports.showMessageBox = function(message, type = 'info', buttons = ['OK'], cancelId = 0) {
    return (buttons.length <= 1 ? alert : confirm)(message)
}

exports.showOpenDialog = function({properties}, callback) {
    let clone = fileInput.cloneNode()
    fileInput.parentNode.replaceChild(clone, fileInput)
    fileInput = clone

    fileInput.multiple = properties.includes('multiSelections')
    fileInput.value = ''

    fileInput.addEventListener('change', evt => {
        callback({result: evt.currentTarget.files})
    })

    fileInput.click()
}

exports.showSaveDialog = function(options, callback) {
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
