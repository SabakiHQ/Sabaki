(function(root) {

var fs = null
var path = null

if (typeof require != 'undefined') {
    fs = require('fs')
    path = require('path')
}

var context = typeof module != 'undefined' ? module.exports : (window.setting = {})

var namesort = function(x, y) { return x.name < y.name ? -1 : +(x.name != y.name) }
var settingspath = null

if (path && typeof describe == 'undefined' && typeof it == 'undefined') {
    var remote = require('electron').remote
    var app = remote ? remote.app : require('electron').app
    var directory = app.getPath('userData')

    try {
        fs.accessSync(directory, fs.F_OK)
    } catch(e) {
        fs.mkdirSync(directory)
    }

    settingspath = path.join(directory, 'settings.json')
}

var settings = {}
var engines = []

var defaults = {
    'app.startup_check_updates': true,
    'app.startup_check_updates_delay': 100,
    'app.loadgame_delay': 100,
    'app.hide_busy_delay': 200,
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
    'graph.grid_size': 25,
    'graph.node_active_color': '#f76047',
    'graph.node_bookmark_color': '#c678dd',
    'graph.node_collapsed_color': '#333',
    'graph.node_inactive_color': '#777',
    'graph.node_color': '#eee',
    'graph.node_comment_color': '#6bb1ff',
    'graph.node_size': 4,
    'gtp.attach_delay': 300,
    'gtp.move_delay': 300,
    'scoring.method': 'territory',
    'sgf.comment_properties': ['C', 'N', 'UC', 'GW', 'DM', 'GB', 'BM', 'TE', 'DO', 'IT'],
    'sound.capture_delay_max': 500,
    'sound.capture_delay_min': 300,
    'sound.enable': true,
    'view.properties_height': 50,
    'view.properties_minheight': 20,
    'view.fuzzy_stone_placement': true,
    'view.show_leftsidebar': false,
    'view.show_comments': false,
    'view.show_coordinates': false,
    'view.show_graph': false,
    'view.show_next_moves': true,
    'view.leftsidebar_width': 250,
    'view.leftsidebar_minwidth': 100,
    'view.sidebar_width': 200,
    'view.sidebar_minwidth': 100,
    'window.height': 622,
    'window.minheight': 590,
    'window.minwidth': 550,
    'window.width': 577
}

context.load = function() {
    if (!settingspath) return settings = defaults

    settings = JSON.parse(fs.readFileSync(settingspath, { encoding: 'utf8' }))

    // Load default settings

    for (var key in defaults) {
        if (key in settings) continue
        settings[key] = defaults[key]
    }

    engines = settings['engines.list']
    engines.sort(namesort)

    return context
}

context.save = function() {
    if (!settingspath) return context

    fs.writeFileSync(settingspath, JSON.stringify(settings, null, '  '))
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

if (settingspath) {
    try {
        fs.accessSync(settingspath, fs.F_OK)
    } catch(err) {
        context.save()
    }
}

context.load()

}).call(null, typeof module != 'undefined' ? module : window)
