const {shell, clipboard} = require('electron')
const {h, Component} = require('preact')
const classNames = require('classnames')
const {remote} = require('electron')

const TextSpinner = require('../TextSpinner')

const t = require('../../i18n').context('PlayBar')
const helper = require('../../modules/helper')
const setting = remote.require('./setting')

let toggleSetting = key => setting.set(key, !setting.get(key))

class PlayBar extends Component {
    constructor() {
        super()

        this.handleCurrentPlayerClick = () => this.props.onCurrentPlayerClick

        this.handleMenuClick = () => {
            let {left, top} = this.menuButtonElement.getBoundingClientRect()
            helper.popupMenu([
                {
                    label: t(p => `About ${p.appName}…`, {appName: sabaki.appName}),
                    click: () => shell.openExternal('http://sabaki.yichuanshen.de')
                },
                {type: 'separator'},
                {
                    label: t('New File'),
                    click: () => sabaki.newFile({playSound: true, showInfo: true})
                },
                {
                    label: t('Open File…'),
                    click: () => sabaki.loadFile()
                },
                {
                    label: t('Download SGF'),
                    click: () => sabaki.saveFile(sabaki.state.representedFilename)
                },
                {
                    label: t('Load SGF from Clipboard'),
                    click: () => {
                        let content = clipboard.readText()
                        if (content == null) return
                        sabaki.loadContent(content, 'sgf', {ignoreEncoding: true})
                    }
                },
                {
                    label: t('Copy SGF to Clipboard'),
                    click: () => clipboard.writeText(sabaki.getSGF())
                },
                {type: 'separator'},
                {
                    label: t('Show &Coordinates'),
                    checked: setting.get('view.show_coordinates'),
                    click: () => toggleSetting('view.show_coordinates')
                },
                {
                    label: t('Show Move Colori&zation'),
                    checked: setting.get('view.show_move_colorization'),
                    click: () => toggleSetting('view.show_move_colorization')
                },
                {
                    label: t('Show &Next Moves'),
                    checked: setting.get('view.show_next_moves'),
                    click: () => toggleSetting('view.show_next_moves')
                },
                {
                    label: t('Show &Sibling Variations'),
                    checked: setting.get('view.show_siblings'),
                    click: () => toggleSetting('view.show_siblings')
                },
                {
                    label: t('&Manage Games…'),
                    click: () => sabaki.openDrawer('gamechooser')
                },
                {type: 'separator'},
                {
                    label: t('&Pass'),
                    click: () => {
                        let autoGenmove = setting.get('gtp.auto_genmove')
                        sabaki.makeMove([-1, -1], {sendToEngine: autoGenmove})
                    }
                },
                {
                    label: t('&Resign'),
                    click: () => sabaki.makeResign()
                },
                {type: 'separator'},
                {
                    label: t('Es&timate'),
                    click: () => sabaki.setMode('estimator')
                },
                {
                    label: t('&Score'),
                    click: () => sabaki.setMode('scoring')
                },
                {
                    label: t('&Edit'),
                    click: () => sabaki.setMode('edit')
                },
                {
                    label: t('&Find'),
                    click: () => sabaki.setMode('find')
                },
                {type: 'separator'},
                {
                    label: t('&Info'),
                    click: () => sabaki.openDrawer('info')
                }
            ], left, top)
        }
    }

    shouldComponentUpdate(nextProps) {
        return nextProps.mode !== this.props.mode || nextProps.mode === 'play'
    }

    render({
        mode,
        attachedEngines,
        playerBusy,
        playerNames,
        playerRanks,
        playerCaptures,
        currentPlayer,
        showHotspot,

        onCurrentPlayerClick = helper.noop
    }) {
        let captureStyle = index => ({opacity: playerCaptures[index] === 0 ? 0 : .7})
        let isEngine = Array(attachedEngines.length).fill(false)

        attachedEngines.forEach((engine, i) => {
            if (engine == null) return

            playerNames[i] = engine.name
            playerRanks[i] = null
            isEngine[i] = true
        })

        return h('header',
            {
                class: classNames({
                    hotspot: showHotspot,
                    current: mode === 'play'
                })
            },

            h('span', {id: 'player_1'},
                h('span', {class: 'captures', style: captureStyle(0)}, playerCaptures[0]), ' ',

                playerRanks[0] && h('span',
                    {class: 'rank'},
                    t(p => p.playerRank, {
                        playerRank: playerRanks[0]
                    })
                ), ' ',

                h('span',
                    {
                        class: classNames('name', {engine: isEngine[0]}),
                        title: isEngine[0] && t('Engine')
                    },
                    isEngine[0] && playerBusy[0] && h(TextSpinner),
                    ' ',
                    playerNames[0] || t('Black')
                )
            ),

            h('span', {id: 'player_-1'},
                h('span',
                    {
                        class: classNames('name', {engine: isEngine[1]}),
                        title: isEngine[1] && t('Engine')
                    },
                    playerNames[1] || t('White'),
                    ' ',
                    isEngine[1] && playerBusy[1] && h(TextSpinner)
                ), ' ',

                playerRanks[1] && h('span',
                    {class: 'rank'},
                    t(p => p.playerRank, {
                        playerRank: playerRanks[1]
                    })
                ), ' ',

                h('span', {class: 'captures', style: captureStyle(1)}, playerCaptures[1])
            ),

            h('img', {
                src: `./img/ui/player_${currentPlayer}.svg`,
                class: 'current-player',
                height: 22,
                title: t('Change Player'),
                onClick: onCurrentPlayerClick
            }),

            h('div', {class: 'hotspot', title: t('Hotspot')}),

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
