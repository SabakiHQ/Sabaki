const {ipcRenderer} = require('electron')

const dialog = require('../modules/dialog')
const setting = require('../modules/setting')

ipcRenderer.on('load-file', (evt, ...args) => {
    setTimeout(() => sabaki.loadFile(...args), setting.get('app.loadgame_delay'))
})

ipcRenderer.on('window-focus', () => {
    if (setting.get('file.show_reload_warning')) {
        sabaki.askForReload()
    }
})

// Handle main menu items

let menuData = require('./menu')

let handleMenuClicks = menu => {
    for (let item of menu) {
        if ('click' in item) {
            ipcRenderer.on(`menu-click-${item.id}`, () => {
                dialog.closeInputBox()
                item.click()
            })
        }

        if ('submenu' in item) {
            handleMenuClicks(item.submenu)
        }
    }
}

handleMenuClicks(menuData)
