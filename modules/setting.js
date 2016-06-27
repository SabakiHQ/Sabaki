(function(root) {

var fs = null
var path = null
var app = null

if (typeof require != 'undefined') {
    fs = require('fs')
    path = require('path')

    try {
        var remote = require('electron').remote
        app = remote ? remote.app : require('electron').app
    } catch(e) {}
}

var context = typeof module != 'undefined' ? module.exports : (window.setting = {})
var namesort = function(x, y) { return x.name < y.name ? -1 : +(x.name != y.name) }

if (app && path) {
    var directory = app.getPath('userData')
    try { fs.mkdirSync(directory) } catch(e) {}

    exports.settingsPath = path.join(directory, 'settings.json')
    exports.stylesPath = path.join(directory, 'styles.css')

    try {
        fs.accessSync(exports.stylesPath, fs.R_OK)
    } catch(e) {
        fs.writeFileSync(exports.stylesPath, '/* This stylesheet is loaded when ' + app.getName() + ' starts up. */')
    }
}

var settings = {}
var engines = []

var defaults = {
    'app.startup_check_updates': true,
    'app.startup_check_updates_delay': 100,
    'app.loadgame_delay': 100,
    'app.hide_busy_delay': 200,
    'autoplay.sec_per_move': 1,
    'autoscroll.max_interval': 200,
    'autoscroll.min_interval': 50,
    'autoscroll.diff': 10,
    'comments.show_move_interpretation': true,
    'console.blocked_commands': [
        'boardsize', 'clear_board', 'play',
        'genmove', 'undo', 'fixed_handicap',
        'place_free_handicap', 'set_free_handicap',
        'loadsgf', 'komi'
    ],
    'console.max_history_count': 30,
    'debug.dev_tools': false,
    'edit.click_currentvertex_to_remove': true,
    'edit.show_removenode_warning': true,
    'edit.undo_delay': 100,
    'engines.list': engines,
    'find.delay': 100,
    'game.default_board_size': 19,
    'game.default_komi': 6.5,
    'game.goto_end_after_loading': false,
    'game.show_ko_warning': true,
    'game.show_suicide_warning': true,
    'gamechooser.show_delay': 100,
    'gamechooser.thumbnail_size': 153,
    'graph.collapse_min_depth': 1,
    'graph.collapse_tokens_count': 100000,
    'graph.delay': 300,
    'graph.grid_size': 30,
    'graph.node_active_color': '#f76047',
    'graph.node_bookmark_color': '#c678dd',
    'graph.node_collapsed_color': '#333',
    'graph.node_inactive_color': '#777',
    'graph.node_color': '#eee',
    'graph.node_comment_color': '#6bb1ff',
    'graph.node_size': 5,
    'gtp.attach_delay': 300,
    'gtp.move_delay': 300,
    'setting.overwrite.v0.16.0': ['console.blocked_commands', 'window.minheight'],
    'scoring.method': 'territory',
    'sgf.comment_properties': ['C', 'N', 'UC', 'GW', 'DM', 'GB', 'BM', 'TE', 'DO', 'IT'],
    'sound.capture_delay_max': 500,
    'sound.capture_delay_min': 300,
    'sound.enable': true,
    'view.properties_height': 50,
    'view.animated_stone_placement': true,
    'view.properties_minheight': 15,
    'view.fuzzy_stone_placement': true,
    'view.show_leftsidebar': false,
    'view.show_comments': true,
    'view.show_coordinates': false,
    'view.show_graph': true,
    'view.show_next_moves': true,
    'view.show_siblings': true,
    'view.leftsidebar_width': 250,
    'view.leftsidebar_minwidth': 100,
    'view.sidebar_width': 270,
    'view.sidebar_minwidth': 100,
    'window.height': 604,
    'window.minheight': 200,
    'window.minwidth': 550,
    'window.width': 564
}

context.load = function() {
    if (!app) return settings = defaults

    try {
        settings = JSON.parse(fs.readFileSync(exports.settingsPath, { encoding: 'utf8' }))
    } catch(e) {
        settings = {}
    }

    // Load default settings

    for (var key in defaults) {
        if (key in settings) continue
        settings[key] = defaults[key]
    }

    engines = settings['engines.list']
    engines.sort(namesort)

    // Overwrite settings

    for (var overwriteKey in settings) {
        if (overwriteKey.indexOf('setting.overwrite.') != 0) continue

        var overwrites = settings[overwriteKey]
        if (!overwrites.length) continue

        for (var i = 0; i < overwrites.length; i++) {
            settings[overwrites[i]] = defaults[overwrites[i]]
        }

        settings[overwriteKey] = []
    }

    return context.save()
}

context.save = function() {
    if (!app) return context

    fs.writeFileSync(exports.settingsPath, JSON.stringify(settings, null, '  '))
    return context
}

context.get = function(key) {
    if (key in settings) return settings[key]
    if (key in defaults) return defaults[key]
    return null
}

context.set = function(key, value) {
    settings[key] = value
    return context.save()
}

context.addEngine = function(name, path, args) {
    engines.push({
        name: name,
        path: path,
        args: args
    })
    engines.sort(namesort)
    return context
}

context.getEngines = function() {
    return engines.slice(0)
}

context.clearEngines = function() {
    engines.length = 0
    return context
}

context.load()

}).call(null, typeof module != 'undefined' ? module : window)
