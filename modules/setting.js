(function(root) {

var fs = null
var path = null
var app = null

if (typeof require != 'undefined') {
    fs = require('fs')
    path = require('path')
    app = require('electron').app
}

var context = typeof module != 'undefined' ? module.exports : (window.setting = {})

var settingspath = ''
var enginespath = ''

if (path && app) {
    settingspath = path.join(app.getPath('userData'), 'settings.json')
    enginespath = path.join(app.getPath('userData'), 'engines.json')
}

var settings = {}
var engines = []

var defaults = {
    'app.startup_check_updates': true,
    'app.startup_check_updates_delay': 100,
    'app.loadgame_delay': 100,
    'autoscroll.max_interval': 200,
    'autoscroll.min_interval': 50,
    'autoscroll.diff': 10,
    'console.blocked_commands': [
        'boardsize', 'clear_board', 'play',
        'genmove', 'undo', 'fixed_handicap',
        'place_free_handicap', 'set_free_handicap',
        'loadsgf'
    ],
    'console.max_history_count': 30,
    'edit.click_currentvertex_to_remove': true,
    'edit.show_removenode_warning': true,
    'edit.undo_delay': 100,
    'find.delay': 100,
    'game.default_board_size': 19,
    'game.default_komi': 6.5,
    'game.goto_end_after_loading': false,
    'game.show_ko_warning': true,
    'game.show_suicide_warning': true,
    'graph.collapse_min_depth': 1,
    'graph.collapse_tokens_count': 100000,
    'graph.delay': 300,
    'graph.grid_size': 25,
    'graph.node_active_color': '#f76047',
    'graph.node_collapsed_color': '#333',
    'graph.node_inactive_color': '#777',
    'graph.node_color': '#eee',
    'graph.node_comment_color': '#6bb1ff',
    'graph.node_size': 4,
    'gtp.attach_delay': 300,
    'gtp.move_delay': 300,
    'scoring.method': 'territory',
    'sound.captureDelayMax': 500,
    'sound.captureDelayMin': 300,
    'sound.enable': true,
    'view.properties_height': 50,
    'view.properties_minheight': 20,
    'view.fuzzy_stone_placement': true,
    'view.show_leftsidebar': false,
    'view.show_comments': false,
    'view.show_coordinates': false,
    'view.show_variations': true,
    'view.show_graph': false,
    'view.leftsidebar_width': 250,
    'view.leftsidebar_minwidth': 100,
    'view.sidebar_width': 200,
    'view.sidebar_minwidth': 100,
    'window.height': 648,
    'window.minheight': 590,
    'window.minwidth': 550,
    'window.width': 608
}

context.load = function() {
    if (!fs) return settings = defaults

    settings = JSON.parse(fs.readFileSync(settingspath, { encoding: 'utf8' }))
    engines = JSON.parse(fs.readFileSync(enginespath, { encoding: 'utf8' }))
    engines.sort(function(x, y) { return x.name >= y.name })

    // Load default settings

    for (var key in defaults) {
        if (key in settings) continue
        settings[key] = defaults[key]
    }

    return context
}

context.save = function() {
    if (fs) {
        fs.writeFileSync(settingspath, JSON.stringify(settings, null, '    '))
        fs.writeFileSync(enginespath, JSON.stringify(engines, null, '    '))
    }

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
    engines.sort(function(x, y) { return x.name >= y.name })
    return context
}

context.getEngines = function() {
    return engines.slice(0)
}

context.clearEngines = function() {
    engines.length = 0
    return context
}

try {
    fs.accessSync(settingspath, fs.F_OK)
    fs.accessSync(enginespath, fs.F_OK)
} catch(err) {
    context.save()
}

context.load()

}).call(null, typeof module != 'undefined' ? module : window)
