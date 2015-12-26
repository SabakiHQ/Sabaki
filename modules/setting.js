var fs = require('fs')
var path = require('path')
var app = require('app')

var settingspath = path.join(app.getPath('userData'), 'settings.json')
var enginespath = path.join(app.getPath('userData'), 'engines.json')

var settings = {}
var engines = []

exports.load = function() {
    settings = JSON.parse(fs.readFileSync(settingspath, { encoding: 'utf8' }))
    engines = JSON.parse(fs.readFileSync(enginespath, { encoding: 'utf8' }))
    engines.sort(function(x, y) { return x.name >= y.name })
    return exports
}

exports.save = function() {
    fs.writeFileSync(settingspath, JSON.stringify(settings, null, '    '))
    fs.writeFileSync(enginespath, JSON.stringify(engines, null, '    '))
    return exports
}

exports.get = function(key) {
    return settings[key]
}

exports.set = function(key, value) {
    settings[key] = value
    return exports.save()
}

exports.default = function(key, value) {
    if (exports.get(key) == null) exports.set(key, value)
    return exports
}

exports.addEngine = function(name, path, args) {
    engines.push({
        name: name,
        path: path,
        args: args
    })
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

// Generate default settings
exports
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
.default('game.goto_end_after_loading', false)
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
