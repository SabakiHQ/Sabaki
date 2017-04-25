const {ipcRenderer, remote: {app}} = require('electron')
const updater = require('./modules/updater')

updater.check(`yishn/${app.getName()}`, (...args) => ipcRenderer.send('update-check', ...args))
