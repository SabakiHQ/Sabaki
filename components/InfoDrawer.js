const {h, Component} = require('preact')
const Drawer = require('./Drawer')

const gametree = require('../modules/gametree')
const helper = require('../modules/helper')

class InfoDrawerItem extends Component {
    render({title, children}) {
        return h('li', {},
            h('label', {},
                h('span', {}, title + ':'),
                children[0]
            ),
            children.slice(1)
        )
    }
}

class InfoDrawer extends Component {
    constructor() {
        super()

        this.handleCancelButtonClick = evt => {
            evt.preventDefault()
            sabaki.closeDrawer()
        }

        this.handleBoardWidthFocus = () => {
            this.combinedSizeFields = this.state.size[0] === this.state.size[1]
        }

        this.handleBoardWidthInput = evt => {
            let {value} = evt.currentTarget

            this.setState(({size: [, height]}) => ({
                size: [value, this.combinedSizeFields ? value : height]
            }))
        }

        this.handleSizeSwapButtonClick = () => {
            this.setState({size: this.state.size.reverse()})
        }
    }

    componentWillReceiveProps({gameInfo, show}) {
        if (!this.props.show && show) {
            this.setState(gameInfo)
        }
    }

    render({
        treePosition,
        currentPlayer,
        show
    }, {
        playerNames = [null, null],
        playerRanks = [null, null],
        gameName = null,
        eventName = null,
        date = null,
        result = null,
        komi = null,
        handicap = 0,
        size = [null, null]
    }) {
        let [tree, index] = treePosition
        let emptyTree = !tree.parent && tree.nodes.length === 1 && tree.subtrees.length === 0

        return h(Drawer,
            {
                type: 'info',
                show
            },

            h('form', {},
                h('section', {},
                    h('span', {},
                        emptyTree && h('img', {
                            src: './node_modules/octicons/build/svg/chevron-down.svg',
                            width: 16,
                            height: 16,
                            class: 'menu'
                        }), ' ',

                        h('input', {
                            type: 'text',
                            name: 'rank_1',
                            placeholder: 'Rank',
                            value: playerRanks[0],
                            onInput: this.linkState('playerRanks.0')
                        }),

                        h('input', {
                            type: 'text',
                            name: 'name_1',
                            placeholder: 'Black',
                            value: playerNames[0],
                            onInput: this.linkState('playerNames.0')
                        })
                    ),

                    h('img', {
                        class: 'current-player',
                        src: `./img/ui/player_${currentPlayer}.svg`,
                        height: 31,
                        title: 'Swap'
                    }),

                    h('span', {},
                        h('input', {
                            type: 'text',
                            name: 'name_-1',
                            placeholder: 'White',
                            value: playerNames[1],
                            onInput: this.linkState('playerNames.1')
                        }),

                        h('input', {
                            type: 'text',
                            name: 'rank_-1',
                            placeholder: 'Rank',
                            value: playerRanks[1],
                            onInput: this.linkState('playerRanks.1')
                        }), ' ',

                        emptyTree && h('img', {
                            src: './node_modules/octicons/build/svg/chevron-down.svg',
                            width: 16,
                            height: 16,
                            class: 'menu'
                        })
                    )
                ),

                h('ul', {},
                    h(InfoDrawerItem, {title: 'Name'},
                        h('input', {
                            type: 'text',
                            placeholder: '(Unnamed)',
                            value: gameName,
                            onInput: this.linkState('gameName')
                        })
                    ),
                    h(InfoDrawerItem, {title: 'Event'},
                        h('input', {
                            type: 'text',
                            placeholder: 'None',
                            value: eventName,
                            onInput: this.linkState('eventName')
                        })
                    ),
                    h(InfoDrawerItem, {title: 'Date'},
                        h('input', {
                            type: 'text',
                            placeholder: 'None',
                            value: date,
                            onInput: this.linkState('date')
                        })
                    ),
                    h(InfoDrawerItem, {title: 'Komi'},
                        h('input', {
                            type: 'number',
                            step: 0.5,
                            placeholder: 0,
                            value: komi == null ? '' : komi,
                            onInput: this.linkState('komi')
                        })
                    ),
                    h(InfoDrawerItem, {title: 'Result'},
                        h('input', {
                            type: 'text',
                            placeholder: 'None',
                            value: result,
                            onInput: this.linkState('result')
                        })
                    ),
                    h(InfoDrawerItem, {title: 'Handicap'},
                        h('select',
                            {
                                selectedIndex: Math.max(0, handicap - 1),
                                disabled: !emptyTree
                            },

                            h('option', {}, 'No stones'),
                            [...Array(8)].map((_, i) =>
                                h('option', {}, i + 2)
                            )
                        )
                    ),
                    h(InfoDrawerItem, {title: 'Board Size'},
                        h('input', {
                            type: 'number',
                            placeholder: 19,
                            max: 25,
                            min: 3,
                            value: size[0],
                            disabled: !emptyTree,
                            onFocus: this.handleBoardWidthFocus,
                            onInput: this.handleBoardWidthInput
                        }), ' ',

                        h('span', {
                            title: 'Swap',
                            style: {cursor: emptyTree ? 'pointer': 'default'},
                            onClick: !emptyTree ? helper.noop : this.handleSizeSwapButtonClick
                        }, '×'), ' ',

                        h('input', {
                            type: 'number',
                            placeholder: 19,
                            max: 25,
                            min: 3,
                            value: size[1],
                            disabled: !emptyTree,
                            onInput: this.linkState('size.1')
                        })
                    )
                ),

                h('p', {},
                    h('button', {type: 'submit'}, 'OK'), ' ',
                    h('button', {type: 'reset', onClick: this.handleCancelButtonClick}, 'Cancel')
                )
            )
        )
    }
}

module.exports = InfoDrawer
