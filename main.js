var app = require('app')
var setting = require('./modules/setting')
var BrowserWindow = require('browser-window')

var window = null

// Generate default settings
setting
.default('app.startup_check_updates', true)
.default('app.startup_check_updates_delay', 100)
.default('app.startup_loadgame_delay', 100)
.default('console.blocked_commands', [
    'boardsize', 'clear_board', 'play',
    'genmove', 'undo', 'fixed_handicap',
    'place_free_handicap', 'set_free_handicap',
    'loadsgf'
])
.default('console.max_history_count', 30)
.default('game.default_board_size', 19)
.default('game.default_komi', 6.5)
.default('game.show_end_after_loading', false)
.default('game.show_ko_warning', true)
.default('game.show_suicide_warning', true)
.default('graph.collapse_min_depth', 1)
.default('graph.collapse_tokens_count', 100000)
.default('graph.delay', 300)
.default('graph.grid_size', 25)
.default('graph.node_active_color', '#f76047')
.default('graph.node_collapsed_color', '#333')
.default('graph.node_inactive_color', '#777')
.default('graph.node_color', '#eee')
.default('graph.node_comment_color', '#6bb1ff')
.default('graph.node_size', 4)
.default('gtp.attach_delay', 300)
.default('gtp.move_delay', 300)
.default('scoring.method', 'territory')
.default('sound.enable', true)
.default('view.comments_height', 50)
.default('view.comments_minheight', 20)
.default('view.console_width', 250)
.default('view.fuzzy_stone_placement', true)
.default('view.show_console', false)
.default('view.show_comments', false)
.default('view.show_coordinates', false)
.default('view.show_variations', true)
.default('view.show_graph', false)
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
        'icon': 'logo.png',
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
