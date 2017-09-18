const {shell, clipboard, remote} = require('electron')
const {Menu} = require('electron').remote
const {h, Component} = require('preact')
const classNames = require('classnames')

const helper = require('../../modules/helper')
const setting = remote.require('./setting')

let toggleSetting = key => setting.set(key, !setting.get(key))

class PlayBar extends Component {
    constructor() {
        super()

        this.handleCurrentPlayerClick = () => this.props.onCurrentPlayerClick
        this.handleUndoButtonClick = () => sabaki.undo()

        this.handleMenuClick = () => {
            let template = [
                {
                    label: `About ${sabaki.appName}…`,
                    click: () => shell.openExternal('http://sabaki.yichuanshen.de')
                },
                {type: 'separator'},
                {
                    label: 'New File',
                    click: () => sabaki.newFile({playSound: true, showInfo: true})
                },
                {
                    label: 'Open File…',
                    click: () => sabaki.loadFile()
                },
                {
                    label: 'Download SGF',
                    click: () => sabaki.saveFile(sabaki.state.representedFilename)
                },
                {
                    label: 'Load SGF from Clipboard',
                    click: () => {
                        let content = clipboard.readText()
                        if (content == null) return
                        sabaki.loadContent(content, 'sgf', {ignoreEncoding: true})
                    }
                },
                {
                    label: 'Copy SGF to Clipboard',
                    click: () => clipboard.writeText(sabaki.getSGF())
                },
                {type: 'separator'},
                {
                    label: 'Show &Coordinates',
                    checked: setting.get('view.show_coordinates'),
                    click: () => toggleSetting('view.show_coordinates')
                },
                {
                    label: 'Show Move Colori&zation',
                    checked: setting.get('view.show_move_colorization'),
                    click: () => toggleSetting('view.show_move_colorization')
                },
                {
                    label: 'Show &Next Moves',
                    checked: setting.get('view.show_next_moves'),
                    click: () => toggleSetting('view.show_next_moves')
                },
                {
                    label: 'Show &Sibling Variations',
                    checked: setting.get('view.show_siblings'),
                    click: () => toggleSetting('view.show_siblings')
                },
                {
                    label: '&Manage Games…',
                    click: () => sabaki.openDrawer('gamechooser')
                },
                {type: 'separator'},
                {
                    label: '&Pass',
                    click: () => sabaki.makeMove([-1, -1], {sendToEngine: true})
                },
                {
                    label: '&Resign',
                    click: () => sabaki.makeResign()
                },
                {type: 'separator'},
                {
                    label: 'Es&timate',
                    click: () => sabaki.setMode('estimator')
                },
                {
                    label: '&Score',
                    click: () => sabaki.setMode('scoring')
                },
                {
                    label: '&Edit',
                    click: () => sabaki.setMode('edit')
                },
                {
                    label: '&Find',
                    click: () => sabaki.setMode('find')
                },
                {type: 'separator'},
                {
                    label: '&Info',
                    click: () => sabaki.openDrawer('info')
                }
            ]

            let {left, top} = this.menuButtonElement.getBoundingClientRect()
            helper.popupMenu(template, left, top)
        }
    }

    shouldComponentUpdate(nextProps) {
        return nextProps.mode !== this.props.mode || nextProps.mode === 'play'
    }

    render({
        mode,
        attachedEngines,
        playerNames,
        playerRanks,
        playerCaptures,
        currentPlayer,
        showHotspot,
        undoable,
        undoText,

        onCurrentPlayerClick = helper.noop
    }) {
        let captureStyle = index => ({opacity: playerCaptures[index] === 0 ? 0 : .7})
        let isEngine = Array(attachedEngines.length).fill(false)

        attachedEngines.forEach((engine, i) => {
            if (engine == null) return

            playerNames[i] = engine.name
            playerRanks[i] = 'Engine'
            isEngine[i] = true
        })

        return h('header',
            {
                class: classNames({
                    undoable,
                    hotspot: showHotspot,
                    current: mode === 'play'
                })
            },

            h('span', {id: 'player_1'},
                h('span', {class: 'captures', style: captureStyle(0)}, playerCaptures[0]), ' ',
                h('span', {
                    class: classNames('name', {engine: isEngine[0]}),
                    title: playerRanks[0]
                }, playerNames[0] || 'Black')
            ),
            h('span', {id: 'player_-1'},
                h('span', {
                    class: classNames('name', {engine: isEngine[1]}),
                    title: playerRanks[1]
                }, playerNames[1] || 'White'), ' ',
                h('span', {class: 'captures', style: captureStyle(1)}, playerCaptures[1])
            ),

            h('img', {
                src: `./img/ui/player_${currentPlayer}.svg`,
                class: 'current-player',
                height: 22,
                title: 'Change Player',
                onClick: onCurrentPlayerClick
            }),

            h('div', {class: 'hotspot', title: 'Hotspot'}),

            h('a',
                {
                    class: 'undo',
                    title: undoText,
                    onClick: this.handleUndoButtonClick
                },
                h('img', {src: './node_modules/octicons/build/svg/mail-reply.svg', height: 21})
            ),

            h('a',
                {
                    ref: el => this.menuButtonElement = el,
                    id: 'headermenu',
                    onClick: this.handleMenuClick
                },
                h('img', {src: './node_modules/octicons/build/svg/three-bars.svg', height: 21})
            )
        )
    }
}

module.exports = PlayBar
