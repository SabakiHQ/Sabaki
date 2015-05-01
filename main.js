var app = require('app')
var BrowserWindow = require('browser-window')

var window = null

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    if (process.platform != 'darwin')
        app.quit()
})

app.on('ready', function() {
    window = new BrowserWindow({
        'resizable': false,
        'use-content-size': true,
        'show': false
        // 'auto-hide-menu-bar': true
    })

    window.webContents.on('did-finish-load', function() {
        window.show()
    })

    window.loadUrl('file://' + __dirname + '/index.html')

    window.on('closed', function() {
        window = null
    })
})
