# Keybindings

You can customize the keybindings for menu items in the `keybindings.json` file.
This file needs to be in the same directory as the `settings.json` file.

Each keybinding definition has a key that corresponds to the menu name, optional
submenu name and menu item name. The key's value can be any keybinding
understood by Electron. If a key's value is `null`, there will be no keybinding
for that menu item.

If a keybinding is not specified in the `keybindings.json` file, the default
value is used.

For example, assume that you want keybindings for copying, cutting and pasting
variations. You can change the keybindings file as follows:

    "edit.copy_variation": "CmdOrCtrl+Alt+Shift+C",
    "edit.cut_variation": "CmdOrCtrl+Alt+Shift+X",
    "edit.paste_variation": "CmdOrCtrl+Alt+Shift+V",

Furthermore, if you are not going to use some of the default keybindings and
want to use them for other menu items, you can just reassign them. For example,
by default, the `CmdOrCtrl+L` keybinding is assigned to the `Select Point` menu
item in the `Play` menu. Maybe you don't need that function a lot but you do
shift variations around the tree regularly, so you might want to use that
keybinding for shifting a variation to the left. In that case you can just swap
the two keys' values to read as follows:

    "play.select_point": null,
    "edit.shift_left": "CmdOrCtrl+L",

Here is a list of available keybinding names:

    file.new
    file.new_window
    file.open
    file.save
    file.save_as
    file.clipboard.load_sgf
    file.clipboard.copy_sgf
    file.clipboard.copy_ascii_diagram
    file.game_info
    file.manage_games
    file.preferences
    play.toggle_player
    play.select_point
    play.pass
    play.estimate
    play.score
    edit.undo
    edit.redo
    edit.toggle_edit_mode
    edit.select_tool.stone_tool
    edit.select_tool.cross_tool
    edit.select_tool.triangle_tool
    edit.select_tool.square_tool
    edit.select_tool.circle_tool
    edit.select_tool.line_tool
    edit.select_tool.arrow_tool
    edit.select_tool.label_tool
    edit.select_tool.number_tool
    edit.copy_variation
    edit.cut_variation
    edit.paste_variation
    edit.make_main_variation
    edit.shift_left
    edit.shift_right
    edit.flatten
    edit.remove_node
    edit.remove_other_variations
    find.toggle_find_mode
    find.find_next
    find.find_previous
    find.toggle_hotspot
    find.jump_to_next_hotspot
    find.jump_to_previous_hotspot
    navigation.back
    navigation.forward
    navigation.go_to_previous_fork
    navigation.go_to_next_fork
    navigation.go_to_previous_comment
    navigation.go_to_next_comment
    navigation.go_to_beginning
    navigation.go_to_end
    navigation.go_to_main_variation
    navigation.go_to_previous_variation
    navigation.go_to_next_variation
    navigation.go_to_move_number
    navigation.go_to_next_game
    navigation.go_to_previous_game
    engines.show_engines_sidebar
    engines.toggle_analysis
    engines.start_stop_engine_game
    engines.generate_move
    tools.toggle_autoplay_mode
    tools.toggle_guess_mode
    tools.clean_markup
    tools.edit_sgf_properties
    view.toggle_menu_bar
    view.toggle_full_screen
    view.show_coordinates.dont_show
    view.show_coordinates.a1
    view.show_coordinates.1_1
    view.show_coordinates.relative
    view.show_move_numbers
    view.show_move_colorization
    view.show_next_moves
    view.show_sibling_variations
    view.show_heatmap.dont_show
    view.show_heatmap.show_win_rate
    view.show_heatmap.show_score_lead
    view.show_winrate_graph
    view.show_game_tree
    view.show_comments
    view.zoom.increase
    view.zoom.decrease
    view.zoom.reset
    view.transform_board.rotate_anticlockwise
    view.transform_board.rotate_clockwise
    view.transform_board.flip_horizontally
    view.transform_board.flip_vertically
    view.transform_board.invert_colors
    view.transform_board.reset
