const copy = require('copy-text-to-clipboard')
const {h, render} = require('preact')
const {noop} = require('../helper')

let hiddenStyle = {opacity: 0, pointerEvents: 'none'}

let app = {
    getName: () => 'Sabaki',
    getVersion: () => 'web',
    getPath: () => ''
}

module.exports = {
    app,
    ipcRenderer: {on: noop, send: noop},

    clipboard: {
        readText: () => prompt('Please paste contents here:'),

        writeText: content => {
            let element = render(h('a', {
                href: '#',
                style: hiddenStyle,

                onClick: evt => {
                    evt.preventDefault()
                    copy(content)
                }
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
        require: x => x === './setting' ? require('../../setting') : {},

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
