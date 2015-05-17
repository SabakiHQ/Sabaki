var app = require('app')
var setting = require('./module/setting.js')
var BrowserWindow = require('browser-window')

var window = null

// Generate default settings
setting.default('view.fuzzy_stone_placement', true)
setting.default('view.show_coordinates', false)
setting.default('view.show_variations', true)
setting.default('view.show_tree', false)
setting.default('sound.enable', true)

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    if (process.platform != 'darwin')
        app.quit()
})

app.on('ready', function() {
    window = new BrowserWindow({
        'resizable': false,
        'use-content-size': true,
        'show': false,
        'web-preferences': {
            'text-areas-are-resizable': false,
            'webaudio': setting.get('sound.enable')
        }
    })

    // window.toggleDevTools()

    window.webContents.on('did-finish-load', function() {
        window.show()
    })

    window.loadUrl('file://' + __dirname + '/view/index.html')

    window.on('closed', function() {
        window = null
    })
})
