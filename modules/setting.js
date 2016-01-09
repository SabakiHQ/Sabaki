var fs = require('fs')
var path = require('path')
var app = require('electron').app

var settingspath = path.join(app.getPath('userData'), 'settings.json')
var enginespath = path.join(app.getPath('userData'), 'engines.json')

var settings = {}
var engines = []

var defaultsettings = {
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
    'sound.enable': true,
    'view.comments_height': 50,
    'view.comments_minheight': 20,
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
    'window.width': 608,
}

exports.load = function() {
    settings = JSON.parse(fs.readFileSync(settingspath, { encoding: 'utf8' }))
    engines = JSON.parse(fs.readFileSync(enginespath, { encoding: 'utf8' }))
    engines.sort(function(x, y) { return x.name >= y.name })

    // Load default settings

    for (var key in defaultsettings) {
        if (key in settings) continue
        settings[key] = defaultsettings[key]
    }

    return exports
}

exports.save = function() {
    fs.writeFileSync(settingspath, JSON.stringify(settings, null, '    '))
    fs.writeFileSync(enginespath, JSON.stringify(engines, null, '    '))
    return exports
}

exports.get = function(key) {
    if (key in settings) return settings[key]
    if (key in defaultsettings) return defaultsettings[key]
    return null
}

exports.set = function(key, value) {
    settings[key] = value
    return exports.save()
}

exports.addEngine = function(name, path, args) {
    engines.push({
        name: name,
        path: path,
        args: args
    })
    engines.sort(function(x, y) { return x.name >= y.name })
    return exports
}

exports.getEngines = function() {
    return engines.slice(0)
}

exports.clearEngines = function() {
    engines.length = 0
    return exports
}

try {
    fs.accessSync(settingspath, fs.F_OK)
    fs.accessSync(enginespath, fs.F_OK)
} catch(err) {
    exports.save()
}

exports.load()
