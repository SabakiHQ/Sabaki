const Clipboard = require('clipboard')
const {h, render} = require('preact')
const {noop} = require('../helper')

let hiddenStyle = {opacity: 0, pointerEvents: 'none'}

let app = {
    getName: () => 'Sabaki',
    getVersion: () => 'web',
    getPath: () => ''
}

new Clipboard('.copy-to-clipboard')

module.exports = {
    app,
    ipcRenderer: {on: noop, send: noop},

    clipboard: {
        readText: () => prompt('Please paste contents here:'),

        writeText: content => {
            let element = render(h('a', {
                class: 'copy-to-clipboard',
                href: '#',
                'data-clipboard-text': content,
                style: hiddenStyle,
                onClick: evt => evt.preventDefault()
            }), document.body)

            element.click()
            element.remove()
        }
    },

    shell: {
        openExternal: href => {
            let element = render(h('a', {
                href,
                target: '_blank',
                style: hiddenStyle
            }), document.body)

            element.click()
            element.remove()
        }
    },

    remote: {
        app,
        require: x => x === './modules/setting' ? require('../setting') : {},

        getCurrentWindow: () => ({
            show: noop,
            close: noop,
            on: noop,
            isMaximized: noop,
            isMinimized: noop,
            isFullScreen: noop,
            setFullScreen: noop,
            setMenuBarVisibility: noop,
            setAutoHideMenuBar: noop,
            setProgressBar: noop,
            setContentSize: noop,
            getContentSize: () => [0, 0],
            webContents: {setAudioMuted: noop}
        }),

        Menu: require('./Menu')
    }
}
