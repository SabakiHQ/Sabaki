var app = require('app')
var setting = require('./module/setting.js')
var BrowserWindow = require('browser-window')

var window = null

// Generate default settings
setting.default('window.width', 608)
setting.default('window.height', 648)
setting.default('window.minwidth', 550)
setting.default('window.minheight', 590)
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
        // 'resizable': false,
        'width': setting.get('window.width'),
        'height': setting.get('window.height'),
        'min-width': setting.get('window.minwidth'),
        'min-height': setting.get('window.minheight'),
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
