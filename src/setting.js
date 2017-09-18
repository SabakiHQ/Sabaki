const EventEmitter = require('events')
const fs = require('fs')
const path = require('path')
const {app} = require('electron')

exports.userDataDirectory = app.getPath('userData')
exports.themesDirectory = path.join(exports.userDataDirectory, 'themes')

try { fs.mkdirSync(exports.userDataDirectory) } catch (err) {}
try { fs.mkdirSync(exports.themesDirectory) } catch (err) {}

exports.settingsPath = path.join(exports.userDataDirectory, 'settings.json')
exports.stylesPath = path.join(exports.userDataDirectory, 'styles.css')

try {
    fs.accessSync(exports.stylesPath, fs.R_OK)
} catch (err) {
    fs.writeFileSync(
        exports.stylesPath,
        `/* This stylesheet is loaded when ${app.getName()} starts up. */`
    )
}

let settings = {}

let themesDict = null

let defaults = {
    'app.startup_check_updates': true,
    'app.startup_check_updates_delay': 3000,
    'app.loadgame_delay': 100,
    'app.hide_busy_delay': 200,
    'app.zoom_factor': 1,
    'autoplay.sec_per_move': 1,
    'autoplay.max_sec_per_move': 99,
    'autoscroll.max_interval': 200,
    'autoscroll.min_interval': 50,
    'autoscroll.diff': 10,
    'cleanmarkup.cross': true,
    'cleanmarkup.triangle': true,
    'cleanmarkup.square': true,
    'cleanmarkup.circle': true,
    'cleanmarkup.line': true,
    'cleanmarkup.arrow': true,
    'cleanmarkup.label': true,
    'cleanmarkup.comments': false,
    'cleanmarkup.annotations': false,
    'cleanmarkup.hotspots': false,
    'comments.show_move_interpretation': true,
    'console.blocked_commands': [
        'boardsize', 'clear_board', 'play',
        'genmove', 'undo', 'fixed_handicap',
        'place_free_handicap', 'set_free_handicap',
        'loadsgf', 'komi'
    ],
    'console.max_history_count': 100,
    'debug.dev_tools': false,
    'edit.click_currentvertex_to_remove': true,
    'edit.show_removenode_warning': true,
    'edit.show_removeothervariations_warning': true,
    'edit.undo_delay': 100,
    'engines.list': [],
    'file.show_reload_warning': true,
    'find.delay': 100,
    'game.default_board_size': 19,
    'game.default_komi': 6.5,
    'game.default_handicap': 0,
    'game.goto_end_after_loading': false,
    'game.navigation_sensitivity': 40,
    'game.show_ko_warning': true,
    'game.show_suicide_warning': true,
    'gamechooser.show_delay': 100,
    'gamechooser.thumbnail_size': 153,
    'graph.delay': 200,
    'graph.edge_color': '#eee',
    'graph.edge_inactive_color': '#777',
    'graph.edge_size': 2,
    'graph.edge_inactive_size': 1,
    'graph.grid_size': 22,
    'graph.node_active_color': '#f76047',
    'graph.node_bookmark_color': '#c678dd',
    'graph.node_color': '#eee',
    'graph.node_inactive_color': '#777',
    'graph.node_comment_color': '#6bb1ff',
    'graph.node_size': 4,
    'gtp.attach_delay': 300,
    'gtp.move_delay': 300,
    'score.estimator_iterations': 30,
    'setting.overwrite.v0.16.0': ['console.blocked_commands', 'window.minheight'],
    'setting.overwrite.v0.17.1': ['graph.collapse_tokens_count'],
    'setting.overwrite.v0.19.0_1': ['window.minheight', 'graph.delay'],
    'setting.overwrite.v0.19.1': ['app.startup_check_updates_delay'],
    'setting.overwrite.v0.19.3': ['graph.grid_size', 'graph.node_size'],
    'setting.overwrite.v0.30.0-beta': ['graph.delay', 'console.max_history_count', 'window.minheight', 'window.minwidth'],
    'scoring.method': 'territory',
    'sgf.comment_properties': ['C', 'N', 'UC', 'GW', 'DM', 'GB', 'BM', 'TE', 'DO', 'IT'],
    'sound.capture_delay_max': 500,
    'sound.capture_delay_min': 300,
    'sound.enable': true,
    'theme.custom_whitestones': null,
    'theme.custom_blackstones': null,
    'theme.custom_background': null,
    'theme.current': null,
    'view.properties_height': 50,
    'view.properties_minheight': 20,
    'view.animated_stone_placement': true,
    'view.fuzzy_stone_placement': true,
    'view.show_menubar': true,
    'view.show_leftsidebar': false,
    'view.show_comments': false,
    'view.show_coordinates': false,
    'view.show_graph': false,
    'view.show_move_colorization': true,
    'view.show_next_moves': true,
    'view.show_siblings': true,
    'view.leftsidebar_width': 250,
    'view.leftsidebar_minwidth': 100,
    'view.sidebar_width': 200,
    'view.sidebar_minwidth': 100,
    'infooverlay.duration': 2000,
    'window.height': 604,
    'window.minheight': 440,
    'window.minwidth': 526,
    'window.width': 564
}

exports.events = new EventEmitter()
exports.events.setMaxListeners(100)

exports.load = function() {
    try {
        settings = JSON.parse(fs.readFileSync(exports.settingsPath, 'utf8'))
    } catch (err) {
        settings = {}
    }

    // Load default settings

    for (let key in defaults) {
        if (key in settings) continue
        settings[key] = defaults[key]
    }

    // Overwrite settings

    for (let overwriteKey in settings) {
        if (overwriteKey.indexOf('setting.overwrite.') != 0) continue

        let overwrites = settings[overwriteKey]
        if (!overwrites.length) continue

        for (let i = 0; i < overwrites.length; i++) {
            settings[overwrites[i]] = defaults[overwrites[i]]
        }

        settings[overwriteKey] = []
    }

    return exports.save()
}

exports.loadThemes = function() {
    let packagePath = filename => path.join(exports.themesDirectory, filename, 'package.json')
    let friendlyName = name => name.split('-')
        .map(x => x === '' ? x : x[0].toUpperCase() + x.slice(1).toLowerCase()).join(' ')

    themesDict = fs.readdirSync(exports.themesDirectory).map(x => {
        try {
            return Object.assign({}, require(packagePath(x)), {
                id: x,
                path: path.join(packagePath(x), '..')
            })
        } catch (err) {
            return null
        }
    }).reduce((acc, x) => {
        if (x == null) return acc

        x.name = friendlyName(x.name)
        acc[x.id] = x
        return acc
    }, {})
}

exports.save = function() {
    fs.writeFileSync(exports.settingsPath, JSON.stringify(settings, null, '  '))
    return exports
}

exports.get = function(key) {
    if (key in settings) return settings[key]
    if (key in defaults) return defaults[key]
    return null
}

exports.set = function(key, value) {
    settings[key] = value
    exports.save()
    exports.events.emit('change', {key})
    return exports
}

exports.getThemes = function() {
    if (themesDict == null) exports.loadThemes()
    return themesDict
}

exports.load()
