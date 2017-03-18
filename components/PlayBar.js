const {h, Component} = require('preact')

class PlayBar extends Component {
    constructor() {
        super()

        this.handleCurrentPlayerClick = () => sabaki.setCurrentPlayer(-this.props.currentPlayer)
        this.handleUndoButtonClick = () => {}
        this.handleMenuClick = () => {}
    }

    render({
        playerNames,
        playerRanks,
        playerCaptures,
        currentPlayer,
        showHotspot,
        undoable,
        undoText
    }) {
        let captureStyle = index => ({opacity: playerCaptures[index] == 0 ? 0 : .7})

        return h('header',
            {
                class: {
                    undoable,
                    hotspot: showHotspot
                }
            },

            h('span', {id: 'player_1'},
                h('span', {class: 'captures', style: captureStyle(0)}, playerCaptures[0]), ' ',
                h('span', {class: 'name', title: playerRanks[0]}, playerNames[0])
            ),
            h('span', {id: 'player_-1'},
                h('span', {class: 'name', title: playerRanks[1]}, playerNames[1]), ' ',
                h('span', {class: 'captures', style: captureStyle(1)}, playerCaptures[1])
            ),

            h('img', {
                src: `./img/ui/player_${currentPlayer}.svg`,
                class: 'current-player',
                height: 22,
                title: 'Change Player',
                onClick: this.handleCurrentPlayerClick
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
                    id: 'headermenu',
                    onClick: this.handleMenuClick
                },
                h('img', {src: './node_modules/octicons/build/svg/three-bars.svg', height: 21})
            )
        )
    }
}

module.exports = PlayBar
