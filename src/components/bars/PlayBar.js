const {h, Component} = require('preact')
const classNames = require('classnames')
const {remote} = require('electron')

const helper = require('../../modules/helper')
const setting = remote.require('./setting')

class PlayBar extends Component {
    constructor() {
        super()

        this.handleCurrentPlayerClick = () => this.props.onCurrentPlayerClick

        this.handleMenuClick = () => {
            let template = [
                {
                    label: '&Pass',
                    click: () => {
                        let autoGenmove = setting.get('gtp.auto_genmove')
                        sabaki.makeMove([-1, -1], {sendToEngine: autoGenmove})
                    }
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
                playerRanks[0] && h('span', {class: 'rank'}, playerRanks[0]), ' ',

                h('span', {
                    class: classNames('name', {engine: isEngine[0]}),
                    title: isEngine[0] && 'Engine'
                }, playerNames[0] || 'Black')
            ),

            h('span', {id: 'player_-1'},
                h('span', {
                    class: classNames('name', {engine: isEngine[1]}),
                    title: isEngine[1] && 'Engine'
                }, playerNames[1] || 'White'), ' ',

                playerRanks[1] && h('span', {class: 'rank'}, playerRanks[1]), ' ',
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
