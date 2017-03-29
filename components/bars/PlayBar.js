const {h, Component} = require('preact')
const {Menu} = require('electron').remote
const helper = require('../../modules/helper')

class PlayBar extends Component {
    constructor() {
        super()

        this.handleCurrentPlayerClick = () => this.props.onCurrentPlayerClick
        this.handleUndoButtonClick = () => sabaki.undo()

        this.handleMenuClick = () => {
            let template = [
                {
                    label: '&Pass',
                    click: () => sabaki.makeMove([-1, -1])
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

            let menu = Menu.buildFromTemplate(template)
            let {left, top} = this.menuButtonElement.getBoundingClientRect()
            menu.popup(sabaki.window, {x: Math.round(left), y: Math.round(top), async: true})
        }
    }

    shouldComponentUpdate(nextProps) {
        return nextProps.mode !== this.props.mode || nextProps.mode === 'play'
    }

    render({
        mode,
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

        return h('header',
            {
                class: {
                    undoable,
                    hotspot: showHotspot,
                    current: mode === 'play'
                }
            },

            h('span', {id: 'player_1'},
                h('span', {class: 'captures', style: captureStyle(0)}, playerCaptures[0]), ' ',
                h('span', {class: 'name', title: playerRanks[0]}, playerNames[0] || 'Black')
            ),
            h('span', {id: 'player_-1'},
                h('span', {class: 'name', title: playerRanks[1]}, playerNames[1] || 'White'), ' ',
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
