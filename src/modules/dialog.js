const {h, render} = require('preact')
const helper = require('./helper')

let hiddenStyle = {
    opacity: 0,
    pointerEvents: 'none'
}

let fileInput = render(h('input', {
    type: 'file',
    style: hiddenStyle
}), document.body)

exports.showMessageBox = function(message, type = 'info', buttons = ['OK'], cancelId = 0) {
    if (buttons.length <= 1) {
        alert(message)
        return 0
    } else {
        return confirm(message) ? 0 : cancelId
    }
}

exports.showOpenDialog = function(options, callback) {
    let clone = fileInput.cloneNode()
    fileInput.parentNode.replaceChild(clone, fileInput)
    fileInput = clone

    fileInput.multiple = options.properties.includes('multiSelections')
    fileInput.value = ''

    fileInput.addEventListener('change', evt => {
        callback({result: evt.currentTarget.files})
    })

    fileInput.click()
}

exports.showSaveDialog = function(options, callback) {
    let {type, name, content} = options
    let href = `data:${type};charset=utf-8,${encodeURIComponent(content)}`

    let element = render(h('a', {
        href,
        style: hiddenStyle,
        download: name
    }), document.body)

    element.click()
    element.remove()
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
