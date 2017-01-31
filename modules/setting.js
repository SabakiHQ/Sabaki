const app = null
const fs = null
const path = null

let namesort = (x, y) => x.name < y.name ? -1 : +(x.name != y.name)

let settings = {}
let engines = []

let defaults = {
    'app.startup_check_updates': true,
    'app.startup_check_updates_delay': 3000,
    'app.loadgame_delay': 100,
    'app.hide_busy_delay': 200,
    'autoplay.sec_per_move': 1,
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
    'console.max_history_count': 30,
    'debug.dev_tools': false,
    'edit.click_currentvertex_to_remove': true,
    'edit.show_removenode_warning': true,
    'edit.show_removeothervariations_warning': true,
    'edit.undo_delay': 100,
    'engines.list': engines,
    'file.show_reload_warning': true,
    'find.delay': 100,
    'game.default_board_size': 19,
    'game.default_komi': 6.5,
    'game.default_handicap': 0,
    'game.goto_end_after_loading': false,
    'game.show_ko_warning': true,
    'game.show_suicide_warning': true,
    'gamechooser.show_delay': 100,
    'gamechooser.thumbnail_size': 153,
    'graph.animation_duration': 300,
    'graph.collapse_min_depth': 1,
    'graph.collapse_tokens_count': 10000,
    'graph.delay': 100,
    'graph.edge_color': '#ccc',
    'graph.edge_inactive_color': '#777',
    'graph.edge_size': 2,
    'graph.edge_inactive_size': 1,
    'graph.grid_size': 22,
    'graph.node_active_color': '#f76047',
    'graph.node_bookmark_color': '#c678dd',
    'graph.node_collapsed_color': '#333',
    'graph.node_color': '#eee',
    'graph.node_inactive_color': '#777',
    'graph.node_comment_color': '#6bb1ff',
    'graph.node_size': 5,
    'gtp.attach_delay': 300,
    'gtp.move_delay': 300,
    'setting.overwrite.v0.16.0': ['console.blocked_commands', 'window.minheight'],
    'setting.overwrite.v0.17.1': ['graph.collapse_tokens_count'],
    'setting.overwrite.v0.19.0_1': ['window.minheight', 'graph.delay'],
    'setting.overwrite.v0.19.1': ['app.startup_check_updates_delay'],
    'setting.overwrite.v0.19.3': ['graph.grid_size', 'graph.node_size'],
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
    'window.minheight': 440,
    'window.minwidth': 550,
    'window.width': 564
}

exports.load = function() {
    return settings = defaults
}

exports.save = function() {
    return exports
}

exports.get = function(key) {
    if (key in settings) return settings[key]
    if (key in defaults) return defaults[key]
    return null
}

exports.set = function(key, value) {
    settings[key] = value
    return exports.save()
}

exports.addEngine = function(name, path, args) {
    engines.push({name, path, args})
    engines.sort(namesort)
    return exports
}

exports.getEngines = function() {
    return engines.slice(0)
}

exports.clearEngines = function() {
    engines.length = 0
    return exports
}

exports.load()
