# Keyboard Shortcuts

You can customize the keyboard shortcuts for menu items in the `settings.json`
file.

Most menu items have an optional keyboard shortcut. These shortcuts are not
hard-coded but are read from the settings file.

Each shortcut setting has a key that corresponds to the menu name, optional
submenu name and menu item name. The key's value can be any shortcut understood
by Electron; study the settings file for examples. If a key's value is `null`,
there will be no shortcut for that menu item.

For example, assume that you want keyboard shortcuts for copying, cutting and
pasting variations. You can change the settings file as follows:

    "shortcut.menu.edit.copy_variation": "CmdOrCtrl+Alt+Shift+C",
    "shortcut.menu.edit.cut_variation": "CmdOrCtrl+Alt+Shift+X",
    "shortcut.menu.edit.paste_variation": "CmdOrCtrl+Alt+Shift+V",

Furthermore, if you are not going to use some of the predefined shortcuts and
want to use them for other menu items, you can just reassign them. For example,
by default, the `CmdOrCtrl+L` shortcut is assigned to the `Select Point` menu
item in the `Play` menu. Maybe you don't need that function a lot but you do
shift variations around the tree regularly, so you might want to use that
shortcut for shifting a variation to the left. In that case you can just swap
the two keys' values to read as follows:

    "shortcut.menu.play.select_point": null,
    "shortcut.menu.edit.shift_left": "CmdOrCtrl+L",

A few keys are separated by the platforms that the app can run on. For example,
for toggling full screen mode, there are two keys:

    "shortcut.menu.view.toggle_full_screen.darwin": "CmdOrCtrl+Shift+F",
    "shortcut.menu.view.toggle_full_screen.not_darwin": "F11",

This is done because certain keyboard shortcuts are common to many apps on the
same platform, but they differ from platform to platform. On macOS, you usually
use `Cmd-Shift-F` to toggle fullscreen mode, but on other platforms, the `F11`
key is commonly used. The app will choose the configuration key that corresponds
to the platform it is running on.
