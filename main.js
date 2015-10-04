var app = require('app')
var process = require('process')
var setting = require('./modules/setting')
var BrowserWindow = require('browser-window')

var window = null

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    if (process.platform != 'darwin')
        app.quit()
})

app.on('ready', function() {
    window = new BrowserWindow({
        'icon': process.platform == 'linux' ? __dirname + '/logo.png' : null,
        'width': setting.get('window.width'),
        'height': setting.get('window.height'),
        'min-width': setting.get('window.minwidth'),
        'min-height': setting.get('window.minheight'),
        'use-content-size': true,
        'show': false,
        'web-preferences': {
            'text-areas-are-resizable': false
        }
    })

    // window.toggleDevTools()
    window.webContents.setAudioMuted(!setting.get('sound.enable'))

    window.on('closed', function() { window = null })
    window.webContents.on('did-finish-load', function() { window.show() })
        .on('new-window', function(e) { e.preventDefault() })

    window.loadUrl('file://' + __dirname + '/view/index.html')
})
