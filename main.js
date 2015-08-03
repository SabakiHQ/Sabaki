var app = require('app')
var setting = require('./module/setting')
var BrowserWindow = require('browser-window')

var window = null

// Generate default settings
setting
.default('app.startup_check_updates', true)
.default('app.startup_check_updates_delay', 100)
.default('game.default_board_size', 19)
.default('game.default_komi', 6.5)
.default('game.show_ko_warning', true)
.default('game.show_suicide_warning', true)
.default('graph.delay', 300)
.default('graph.grid_size', 25)
.default('graph.prune_max_depth', 2)
.default('graph.prune_tokens_count', 100000)
.default('graph.node_size', 4)
.default('scoring.method', 'territory')
.default('sound.enable', true)
.default('view.fuzzy_stone_placement', true)
.default('view.show_coordinates', false)
.default('view.show_variations', true)
.default('view.show_sidebar', false)
.default('view.sidebar_width', 200)
.default('view.sidebar_minwidth', 100)
.default('window.height', 648)
.default('window.minheight', 590)
.default('window.minwidth', 550)
.default('window.width', 608)

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    if (process.platform != 'darwin')
        app.quit()
})

app.on('ready', function() {
    window = new BrowserWindow({
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
    window.webContents.on('dom-ready', function() { window.show() })

    window.loadUrl('file://' + __dirname + '/view/index.html')
})
