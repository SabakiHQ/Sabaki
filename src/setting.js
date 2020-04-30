const EventEmitter = require('events')
const fs = require('fs')
const path = require('path')
const {app, BrowserWindow} = require('electron')

const portableDir = process.env.PORTABLE_EXECUTABLE_DIR

for (let dir of [
  (exports.userDataDirectory = portableDir
    ? path.join(portableDir, 'Sabaki')
    : app.getPath('userData')),
  (exports.themesDirectory = path.join(exports.userDataDirectory, 'themes'))
]) {
  try {
    fs.mkdirSync(dir)
  } catch (err) {}
}

exports.settingsPath = path.join(exports.userDataDirectory, 'settings.json')
exports.stylesPath = path.join(exports.userDataDirectory, 'styles.css')

if (!fs.existsSync(exports.stylesPath)) {
  fs.writeFileSync(
    exports.stylesPath,
    `/* This stylesheet is loaded when ${app.name} starts up. */`
  )
}

let settings = {}

let themesDict = null

let defaults = {
  'app.always_show_result': false,
  'app.enable_hardware_acceleration': true,
  'app.hide_busy_delay': 200,
  'app.lang': 'en',
  'app.loadgame_delay': 100,
  'app.startup_check_updates': true,
  'app.startup_check_updates_delay': 3000,
  'app.zoom_factor': 1,
  'autoplay.max_sec_per_move': 99,
  'autoplay.sec_per_move': 1,
  'autoscroll.delay': 400,
  'autoscroll.diff': 10,
  'autoscroll.max_interval': 200,
  'autoscroll.min_interval': 50,
  'board.analysis_interval': 50,
  'board.analysis_type': 'winrate',
  'board.show_analysis': true,
  'board.variation_replay_mode': 'move_by_move',
  'board.variation_replay_interval': 500,
  'cleanmarkup.annotations': false,
  'cleanmarkup.arrow': true,
  'cleanmarkup.circle': true,
  'cleanmarkup.comments': false,
  'cleanmarkup.cross': true,
  'cleanmarkup.hotspots': false,
  'cleanmarkup.label': true,
  'cleanmarkup.line': true,
  'cleanmarkup.square': true,
  'cleanmarkup.triangle': true,
  'cleanmarkup.winrate': false,
  'comments.show_move_interpretation': true,
  'comments.commit_delay': 500,
  'console.max_history_count': 1000,
  'debug.dev_tools': false,
  'edit.click_currentvertex_to_remove': true,
  'edit.copy_variation_strip_props': [
    'AP',
    'CA',
    'FF',
    'GM',
    'ST',
    'SZ',
    'KM',
    'HA',
    'AN',
    'BR',
    'BT',
    'CP',
    'DT',
    'EV',
    'GN',
    'GC',
    'ON',
    'OT',
    'PB',
    'PC',
    'PW',
    'RE',
    'RO',
    'RU',
    'SO',
    'TM',
    'US',
    'WR',
    'WT'
  ],
  'edit.flatten_inherit_root_props': [
    'BR',
    'BT',
    'DT',
    'EV',
    'GN',
    'GC',
    'PB',
    'PW',
    'RE',
    'SO',
    'SZ',
    'WT',
    'WR'
  ],
  'edit.history_batch_interval': 500,
  'edit.max_history_count': 1000,
  'edit.show_removenode_warning': true,
  'edit.show_removeothervariations_warning': true,
  'engines.list': [],
  'engines.analyze_commands': ['analyze', 'kata-analyze', 'lz-analyze'],
  'engines.gemove_analyze_commands': [
    'genmove_analyze',
    'kata-genmove_analyze',
    'lz-genmove_analyze'
  ],
  'file.show_reload_warning': true,
  'find.delay': 100,
  'game.default_board_size': 19,
  'game.default_komi': 6.5,
  'game.default_handicap': 0,
  'game.goto_end_after_loading': false,
  'game.navigation_analysis_delay': 500,
  'game.navigation_sensitivity': 40,
  'game.show_ko_warning': true,
  'game.show_suicide_warning': true,
  'gamechooser.show_delay': 100,
  'gamechooser.thumbnail_size': 153,
  'graph.delay': 100,
  'graph.grid_size': 22,
  'graph.node_size': 4,
  'gtp.console_log_enabled': false,
  'gtp.console_log_path': null,
  'gtp.engine_quit_timeout': 3000,
  'gtp.move_delay': 300,
  'score.estimator_iterations': 100,
  'scoring.method': 'territory',
  'setting.overwrite.v0.19.1': ['app.startup_check_updates_delay'],
  'setting.overwrite.v0.19.3': ['graph.grid_size', 'graph.node_size'],
  'setting.overwrite.v0.30.0-beta': ['window.minheight', 'window.minwidth'],
  'setting.overwrite.v0.33.0': ['console.max_history_count'],
  'setting.overwrite.v0.33.4': ['score.estimator_iterations'],
  'setting.overwrite.v0.41.0': ['autoscroll.max_interval'],
  'setting.overwrite.v0.43.3_4': [
    'board.analysis_interval',
    'graph.delay',
    'view.winrategraph_minheight',
    'view.winrategraph_blunderthreshold',
    'view.winrategraph_height',
    'app.lang'
  ],
  'setting.overwrite.v0.50.1': [
    'engines.analyze_commands',
    'engines.gemove_analyze_commands'
  ],
  'sgf.comment_properties': [
    'C',
    'N',
    'UC',
    'GW',
    'DM',
    'GB',
    'BM',
    'TE',
    'DO',
    'IT'
  ],
  'sgf.format_code': false,
  'shortcut.menu.file.new': 'CmdOrCtrl+N',
  'shortcut.menu.file.new_window': 'CmdOrCtrl+Shift+N',
  'shortcut.menu.file.open': 'CmdOrCtrl+O',
  'shortcut.menu.file.save': 'CmdOrCtrl+S',
  'shortcut.menu.file.save_as': 'CmdOrCtrl+Shift+S',
  'shortcut.menu.file.clipboard.load_sgf': null,
  'shortcut.menu.file.clipboard.copy_sgf': null,
  'shortcut.menu.file.clipboard.copy_ascii_diagram': null,
  'shortcut.menu.file.game_info': 'CmdOrCtrl+I',
  'shortcut.menu.file.manage_games': 'CmdOrCtrl+Shift+M',
  'shortcut.menu.file.preferences': 'CmdOrCtrl+,',
  'shortcut.menu.play.toggle_player': 'CmdOrCtrl+Shift+1',
  'shortcut.menu.play.select_point': 'CmdOrCtrl+L',
  'shortcut.menu.play.pass': 'CmdOrCtrl+P',
  'shortcut.menu.play.resign': null,
  'shortcut.menu.play.estimate': 'CmdOrCtrl+Shift+E',
  'shortcut.menu.play.score': 'CmdOrCtrl+Shift+R',
  'shortcut.menu.edit.undo': 'CmdOrCtrl+Z',
  'shortcut.menu.edit.redo.win32': 'CmdOrCtrl+Y',
  'shortcut.menu.edit.redo.not_windows': 'CmdOrCtrl+Shift+Z',
  'shortcut.menu.edit.toggle_edit_mode': 'CmdOrCtrl+E',
  'shortcut.menu.edit.select_tool.stone_tool': 'CmdOrCtrl+1',
  'shortcut.menu.edit.select_tool.cross_tool': 'CmdOrCtrl+2',
  'shortcut.menu.edit.select_tool.triangle_tool': 'CmdOrCtrl+3',
  'shortcut.menu.edit.select_tool.square_tool': 'CmdOrCtrl+4',
  'shortcut.menu.edit.select_tool.circle_tool': 'CmdOrCtrl+5',
  'shortcut.menu.edit.select_tool.line_tool': 'CmdOrCtrl+6',
  'shortcut.menu.edit.select_tool.arrow_tool': 'CmdOrCtrl+7',
  'shortcut.menu.edit.select_tool.label_tool': 'CmdOrCtrl+8',
  'shortcut.menu.edit.select_tool.number_tool': 'CmdOrCtrl+9',
  'shortcut.menu.edit.copy_variation': null,
  'shortcut.menu.edit.cut_variation': null,
  'shortcut.menu.edit.paste_variation': null,
  'shortcut.menu.edit.make_main_variation': null,
  'shortcut.menu.edit.shift_left': null,
  'shortcut.menu.edit.shift_right': null,
  'shortcut.menu.edit.flatten': null,
  'shortcut.menu.edit.remove_node.darwin': 'CmdOrCtrl+Backspace',
  'shortcut.menu.edit.remove_node.not_darwin': 'CmdOrCtrl+Delete',
  'shortcut.menu.edit.remove_other_variations': null,
  'shortcut.menu.find.toggle_find_mode': 'CmdOrCtrl+F',
  'shortcut.menu.find.find_next': 'F3',
  'shortcut.menu.find.find_previous': 'Shift+F3',
  'shortcut.menu.find.toggle_hotspot': 'CmdOrCtrl+B',
  'shortcut.menu.find.jump_to_next_hotspot': 'F2',
  'shortcut.menu.find.jump_to_previous_hotspot': 'Shift+F2',
  'shortcut.menu.navigation.back': 'Up',
  'shortcut.menu.navigation.down': 'Down',
  'shortcut.menu.navigation.go_to_previous_fork': 'CmdOrCtrl+Up',
  'shortcut.menu.navigation.go_to_next_fork': 'CmdOrCtrl+Down',
  'shortcut.menu.navigation.go_to_previous_comment': 'CmdOrCtrl+Shift+Up',
  'shortcut.menu.navigation.go_to_next_comment': 'CmdOrCtrl+Shift+Down',
  'shortcut.menu.navigation.go_to_beginning': 'Home',
  'shortcut.menu.navigation.go_to_end': 'End',
  'shortcut.menu.navigation.go_to_main_variation': 'CmdOrCtrl+Left',
  'shortcut.menu.navigation.go_to_previous_variation': 'Left',
  'shortcut.menu.navigation.go_to_next_variation': 'Right',
  'shortcut.menu.navigation.go_to_move_number': 'CmdOrCtrl+G',
  'shortcut.menu.navigation.go_to_next_game': 'CmdOrCtrl+PageDown',
  'shortcut.menu.navigation.go_to_previous_game': 'CmdOrCtrl+PageUp',
  'shortcut.menu.engines.show_engines_sidebar': null,
  'shortcut.menu.engines.toggle_analysis': 'F4',
  'shortcut.menu.engines.start_stop_engine_game': 'F5',
  'shortcut.menu.engines.generate_move': 'F10',
  'shortcut.menu.tools.toggle_autoplay_mode': null,
  'shortcut.menu.tools.toggle_guess_mode': null,
  'shortcut.menu.tools.clean_markup': null,
  'shortcut.menu.tools.edit_sgf_properties': null,
  'shortcut.menu.click.toggle_menu_bar': null,
  'shortcut.menu.view.toggle_full_screen.darwin': 'CmdOrCtrl+Shift+F',
  'shortcut.menu.view.toggle_full_screen.not_darwin': 'F11',
  'shortcut.menu.view.coordinates.dont_show': 'CmdOrCtrl+Shift+C',
  'shortcut.menu.view.coordinates.a1': null,
  'shortcut.menu.view.coordinates.1_1': null,
  'shortcut.menu.view.coordinates.relative': null,
  'shortcut.menu.view.show_move_numbers': null,
  'shortcut.menu.view.show_move_colorization': null,
  'shortcut.menu.view.show_next_moves': null,
  'shortcut.menu.view.show_sibling_variations': null,
  'shortcut.menu.view.show_heatmap.dont_show': null,
  'shortcut.menu.view.show_heatmap.show_win_rate': null,
  'shortcut.menu.view.show_heatmap.show_score_lead': null,
  'shortcut.menu.view.show_winrate_graph': null,
  'shortcut.menu.view.show_game_tree': 'CmdOrCtrl+T',
  'shortcut.menu.view.show_comments': 'CmdOrCtrl+Shift+T',
  'shortcut.menu.view.zoom.increase': 'CmdOrCtrl+Plus',
  'shortcut.menu.view.zoom.decrease': 'CmdOrCtrl+-',
  'shortcut.menu.view.zoom.reset': 'CmdOrCtrl+0',
  'shortcut.menu.view.transform_board.rotate_anticlockwise':
    'CmdOrCtrl+Alt+Left',
  'shortcut.menu.view.transform_board.rotate_clockwise': 'CmdOrCtrl+Alt+Right',
  'shortcut.menu.view.transform_board.flip_horizontally': 'CmdOrCtrl+Alt+Down',
  'shortcut.menu.view.transform_board.flip_vertically':
    'CmdOrCtrl+Alt+Shift+Down',
  'shortcut.menu.view.transform_board.invert_colors': 'CmdOrCtrl+Alt+Up',
  'shortcut.menu.view.transform_board.reset': 'CmdOrCtrl+Alt+0',
  'sound.capture_delay_max': 500,
  'sound.capture_delay_min': 300,
  'sound.enable': true,
  'theme.custom_whitestones': null,
  'theme.custom_blackstones': null,
  'theme.custom_board': null,
  'theme.custom_background': null,
  'theme.current': null,
  'view.animated_stone_placement': true,
  'view.coordinates_type': 'A1',
  'view.fuzzy_stone_placement': true,
  'view.leftsidebar_width': 250,
  'view.leftsidebar_minwidth': 100,
  'view.peerlist_height': 130,
  'view.peerlist_minheight': 58,
  'view.properties_height': 50,
  'view.properties_minheight': 20,
  'view.show_menubar': true,
  'view.show_leftsidebar': false,
  'view.show_comments': false,
  'view.show_coordinates': false,
  'view.show_graph': false,
  'view.show_move_colorization': true,
  'view.show_move_numbers': false,
  'view.show_next_moves': true,
  'view.show_siblings': true,
  'view.show_winrategraph': true,
  'view.sidebar_width': 200,
  'view.sidebar_minwidth': 100,
  'view.winrategraph_blunderthreshold': 5,
  'view.winrategraph_height': 90,
  'view.winrategraph_minheight': 30,
  'view.winrategraph_maxheight': 250,
  'view.winrategraph_invert': false,
  'infooverlay.duration': 2000,
  'window.height': 604,
  'window.minheight': 440,
  'window.minwidth': 526,
  'window.width': 564,
  'window.maximized': false
}

let eventEmitters = {}

exports.events = {
  on: (id, event, f) => {
    if (eventEmitters[id] == null) {
      eventEmitters[id] = new EventEmitter()
      eventEmitters[id].setMaxListeners(30)
    }

    eventEmitters[id].on(event, f)
  },
  emit: (event, evt) => {
    let windows = BrowserWindow.getAllWindows()

    for (let id in eventEmitters) {
      if (!windows.some(window => window.id.toString() === id)) {
        delete eventEmitters[id]
      } else {
        eventEmitters[id].emit(event, evt)
      }
    }
  }
}

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

  // Delete invalid settings

  for (let key in settings) {
    if (key in defaults) continue
    delete settings[key]
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
  let packagePath = filename =>
    path.join(exports.themesDirectory, filename, 'package.json')
  let friendlyName = name =>
    name
      .split('-')
      .map(x => (x === '' ? x : x[0].toUpperCase() + x.slice(1).toLowerCase()))
      .join(' ')

  themesDict = fs
    .readdirSync(exports.themesDirectory)
    .map(x => {
      try {
        return Object.assign({}, require(packagePath(x)), {
          id: x,
          path: path.join(packagePath(x), '..')
        })
      } catch (err) {
        return null
      }
    })
    .reduce((acc, x) => {
      if (x == null) return acc

      x.name = friendlyName(x.name)
      acc[x.id] = x
      return acc
    }, {})
}

exports.save = function() {
  let keys = Object.keys(settings).sort()

  fs.writeFileSync(
    exports.settingsPath,
    JSON.stringify(
      keys.reduce((acc, key) => ((acc[key] = settings[key]), acc), {}),
      null,
      '  '
    )
  )

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
  exports.events.emit('change', {key, value})
  return exports
}

exports.getThemes = function() {
  if (themesDict == null) exports.loadThemes()
  return themesDict
}

exports.load()
