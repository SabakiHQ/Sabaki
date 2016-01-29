var process = require('process')
var app = require('electron').app
var setting = require('./modules/setting')
var BrowserWindow = require('electron').BrowserWindow

var window = null

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    if (process.platform != 'darwin')
        app.quit()
})

app.on('ready', function() {
    window = new BrowserWindow({
        icon: process.platform == 'linux' ? __dirname + '/logo.png' : null,
        width: setting.get('window.width'),
        height: setting.get('window.height'),
        minWidth: setting.get('window.minwidth'),
        minHeight: setting.get('window.minheight'),
        useContentSize: true,
        show: false,
        webPreferences: {
            textAreasAreResizable: false
        }
    })

    // window.toggleDevTools()

    window.webContents.setAudioMuted(!setting.get('sound.enable'))
    window.webContents
        .on('did-finish-load', function() { window.show() })
        .on('new-window', function(e) { e.preventDefault() })

    window.on('closed', function() { window = null })

    window.loadURL('file://' + __dirname + '/view/index.html')
})
