const {h, Component} = require('preact')

const gametree = require('../modules/gametree')
const helper = require('../modules/helper')
const setting = require('../modules/setting')

const MiniGoban = require('./MiniGoban')
const Drawer = require('./Drawer')

let thumbnailSize = setting.get('gamechooser.thumbnail_size')
let itemMinWidth = thumbnailSize + 12 + 20
let itemHeight = 253 + 10 + 20

let getPreviewBoard = tree => {
    let tp = gametree.navigate(tree, 0, 30)
    if (!tp) tp = gametree.navigate(tree, 0, gametree.getCurrentHeight(tree) - 1)
    return gametree.getBoard(...tp)
}

class GameListItem extends Component {
    constructor() {
        super()

        this.handleClick = evt => {
            let {onClick = helper.noop} = this.props
            evt.tree = this.props.tree
            onClick(evt)
        }
    }

    shouldComponentUpdate({left, top, showThumbnail}) {
        return left !== this.props.left
            || top !== this.props.top
            || showThumbnail !== this.props.showThumbnail
    }

    render({tree, left, top, showThumbnail = true}) {
        let name = gametree.getRootProperty(tree, 'GN', gametree.getRootProperty(tree, 'EV', ''))
        let blackPlayer = gametree.getPlayerName(tree, 1, 'Black')
        let blackRank = gametree.getRootProperty(tree, 'BR')
        let whitePlayer = gametree.getPlayerName(tree, 1, 'White')
        let whiteRank = gametree.getRootProperty(tree, 'WR')

        return h('li', {ref: el => this.element = el, style: {left, top}},
            h('div', {draggable: true, onClick: this.handleClick},
                h('span', {title: name}, name),

                h(MiniGoban, {
                    board: getPreviewBoard(tree),
                    maxSize: thumbnailSize,
                    visible: showThumbnail
                }),

                h('span', {class: 'black', title: blackRank}, blackPlayer),
                h('span', {class: 'white', title: whiteRank}, whitePlayer)
            )
        )
    }
}

class GameChooserDrawer extends Component {
    constructor() {
        super()

        this.state = {
            scrollTop: 0,
            animation: false
        }

        this.itemElements = {}

        this.handleCloseButtonClick = () => sabaki.closeDrawers()

        this.handleListScroll = evt => {
            this.setState({scrollTop: evt.currentTarget.scrollTop})
        }

        this.handleGameSelect = evt => {
            let {gameTrees, onGameSelect = helper.noop} = this.props
            let index = gameTrees.indexOf(evt.tree)

            evt.selectedTree = evt.tree
            onGameSelect(evt)
        }
    }

    componentDidMount() {
        window.addEventListener('resize', () => {
            if (!this.props.show) return
            this.resize()
        })

        this.resize()
        this.forceUpdate()
    }

    shouldComponentUpdate({show}, {animation}) {
        return animation !== this.props.animation || show || show !== this.props.show
    }

    componentDidUpdate(prevProps) {
        if (this.state.scrollTop !== this.gamesListElement.scrollTop) {
            // Update scroll top

            this.gamesListElement.scrollTop = this.state.scrollTop
        }

        if (!prevProps.show && this.props.show) {
            // Scroll current list element into view

            let row = this.getRowFromIndex(this.props.gameIndex)
            let scrollTop = row * itemHeight

            this.gamesListElement.scrollTop = scrollTop
            this.setState({scrollTop})
        }

        if (prevProps.show !== this.props.show) {
            // Animate

            let gobanRect = document.getElementById('goban').getBoundingClientRect()
            let itemElement = this.itemElements[this.props.gameIndex]
            let drawerRect = document.getElementById('gamechooser').getBoundingClientRect()
            let {width, height, left, top} = itemElement.querySelector('svg').getBoundingClientRect()

            let miniGobanRect = {
                left: left - drawerRect.left,
                top: top - drawerRect.top,
                width,
                height
            }

            let direction = this.props.show ? 'reverse' : 'normal'

            this.setState({animation: [miniGobanRect, gobanRect, direction]})
            setTimeout(() => this.setState({animation: null}), 600)
        }
    }

    resize() {
        let innerWidth = this.gamesListElement.offsetWidth - 28
        let height = this.gamesListElement.offsetHeight
        let rowCount = Math.floor(innerWidth / itemMinWidth)

        this.setState({innerWidth, height, rowCount})
    }

    getRowFromIndex(i) {
        return (i - i % this.state.rowCount) / this.state.rowCount
    }

    render({show, gameTrees, gameIndex}, {animation, scrollTop, rowCount, innerWidth, height}) {
        let itemWidth = Math.floor(innerWidth / rowCount)

        return h('div', {},
            h('style', {}, `
                #gamechooser .games-list .placeholder {
                    height: ${this.getRowFromIndex(gameTrees.length - 1) * itemHeight + 20}px;
                }

                #gamechooser .games-list li {
                    width: ${itemWidth - 20}px;
                }
            `, animation && `
                #gamechooser-animation {
                    animation: gamechooser-animation .5s ${animation[2]} forwards;
                }

                @keyframes gamechooser-animation {
                    from {
                        transform: translate(${animation[0].left}px, ${animation[0].top}px);
                        opacity: 1;
                    }
                    to {
                        transform: translate(${animation[1].left}px, ${animation[1].top}px)
                            scale(${animation[1].width / animation[0].width},
                            ${animation[1].height / animation[0].height});
                        opacity: 0;
                    }
                }
            `),

            h(Drawer,
                {
                    type: 'gamechooser',
                    show
                },

                h('h2', {}, 'Manage Games'),

                h('input', {
                    type: 'search',
                    name: 'filter',
                    placeholder: 'Filter'
                }),

                h('div',
                    {
                        ref: el => this.gamesListElement = el,
                        class: 'games-list',
                        onScroll: this.handleListScroll
                    },

                    h('div', {class: 'placeholder'}),

                    h('ol', {}, gameTrees.map((tree, i) => {
                        let row = this.getRowFromIndex(i)
                        let itemTop = row * itemHeight + 10
                        let itemLeft = (i - row * rowCount) * itemWidth + 10

                        if (i !== gameIndex && (itemTop + itemHeight <= scrollTop || itemTop >= scrollTop + height))
                            return

                        return h(GameListItem, {
                            ref: item => {
                                if (item != null) this.itemElements[i] = item.element
                            },
                            key: tree.id,
                            tree,
                            top: itemTop,
                            left: itemLeft,
                            showThumbnail: i !== gameIndex || !animation,

                            onClick: this.handleGameSelect
                        })
                    }))
                ),

                h('p', {},
                    h('button', {class: 'dropdown'}, 'Add'),
                    h('button', {onClick: this.handleCloseButtonClick}, 'Close')
                )
            ),

            h('div',
                {
                    id: 'gamechooser-animation',
                    style: !animation ? {
                        opacity: 0,
                        pointerEvents: 'none'
                    } : {}
                },

                h(MiniGoban, {
                    board: getPreviewBoard(gameTrees[gameIndex]),
                    maxSize: thumbnailSize
                })
            )
        )
    }
}

module.exports = GameChooserDrawer
