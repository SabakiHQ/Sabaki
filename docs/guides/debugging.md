# Debugging

Sabaki is a desktop application built with web technologies, HTML, CSS and
JavaScript, using [Electron](http://electron.atom.io). Since Electron is built
on Chrome, it ships with the exact same developer tools Chrome has. To activate
the developer tools in Sabaki, follow these steps:

1. Close Sabaki if necessary
2. First, determine where Sabaki saves its settings:
   - `%APPDATA%\Sabaki` on Windows
   - `$XDG_CONFIG_HOME/Sabaki` or `~/.config/Sabaki` on Linux
   - `~/Library/Application Support/Sabaki` on macOS
3. Open `settings.json` and search for the key `debug.dev_tools`
4. Set the value to `true` and save `settings.json`
5. When you start Sabaki, it has an extra main menu item named 'Developer'
6. Click on 'Toggle Developer Tools' in the menu
