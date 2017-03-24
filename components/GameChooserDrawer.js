const {Menu} = require('electron').remote
const {h, Component} = require('preact')

const dialog = require('../modules/dialog')
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

        let events = ['Click', 'ContextMenu', 'DragStart', 'DragOver']

        for (let name of events) {
            this[`handle${name}`] = evt => {
                let callback = this.props[`on${name}`]
                evt.tree = this.props.tree
                if (callback) callback(evt)
            }
        }
    }

    shouldComponentUpdate(nextProps) {
        for (let i in nextProps)
            if (nextProps[i] !== this.props[i]) return true

        return false
    }

    render({tree, left, top, draggable, showThumbnail, insertBefore, insertAfter}) {
        let name = gametree.getRootProperty(tree, 'GN', gametree.getRootProperty(tree, 'EV', ''))
        let blackPlayer = gametree.getPlayerName(tree, 1, 'Black')
        let blackRank = gametree.getRootProperty(tree, 'BR')
        let whitePlayer = gametree.getPlayerName(tree, -1, 'White')
        let whiteRank = gametree.getRootProperty(tree, 'WR')

        return h('li',
            {
                ref: el => this.element = el,
                class: {
                    insertbefore: insertBefore,
                    insertafter: insertAfter
                },
                style: {left, top}
            },

            h('div',
                {
                    draggable,
                    onClick: this.handleClick,
                    onContextMenu: this.handleContextMenu,
                    onDragStart: this.handleDragStart,
                    onDragOver: this.handleDragOver
                },

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

        this.itemElements = {}

        this.state = {
            scrollTop: 0,
            insertBefore: -1,
            animation: false,
            filterText: ''
        }

        this.handleFilterTextChange = evt => this.setState({
            filterText: evt.currentTarget.value.trim()
        })

        this.handleCloseButtonClick = () => sabaki.closeDrawers()

        this.handleListScroll = evt => {
            this.setState({scrollTop: evt.currentTarget.scrollTop})
        }

        this.handleItemContextMenu = evt => {
            let template = [
                {
                    label: '&Remove Game',
                    click: () => {
                        if (dialog.showMessageBox(
                            'Do you really want to remove this game permanently?',
                            'warning',
                            ['Remove Game', 'Cancel'], 1
                        ) === 1) return

                        let {gameTrees} = this.props
                        let index = gameTrees.indexOf(evt.tree)

                        gameTrees.splice(index, 1)
                        sabaki.setState({gameTrees})

                        if (gameTrees.length === 0) {
                            let tree = sabaki.getEmptyGameTree()
                            gameTrees.push(tree)
                        }

                        sabaki.setCurrentTreePosition(gameTrees[Math.max(index - 1, 0)], 0)
                    }
                },
                {
                    label: 'Remove &Other Games',
                    click: () => {
                        if (dialog.showMessageBox(
                            'Do you really want to remove all other games permanently?',
                            'warning',
                            ['Remove Games', 'Cancel'], 1
                        ) === 1) return

                        sabaki.setState({gameTrees: [evt.tree]})
                        sabaki.setCurrentTreePosition(evt.tree, 0)
                    }
                }
            ]

            let menu = Menu.buildFromTemplate(template)

            menu.popup(sabaki.window, {
                x: evt.x,
                y: evt.y,
                async: true
            })
        }

        this.handleItemDragStart = evt => {
            this.dragData = this.props.gameTrees.indexOf(evt.tree)
        }

        this.handleItemDragOver = evt => {
            if (this.dragData == null) return

            evt.preventDefault()

            let element = evt.currentTarget
            let index = this.props.gameTrees.indexOf(evt.tree)

            let x = evt.x
            let {left, width} = element.getBoundingClientRect()
            let middle = left + width / 2

            if (x <= middle - 10) {
                this.setState({insertBefore: index})
            } else if (x >= middle + 10) {
                this.setState({insertBefore: index + 1})
            }
        }

        this.handleItemDrop = evt => {
            let {gameTrees} = this.props
            let {insertBefore} = this.state

            if (this.dragData == null || insertBefore < 0) return

            if (insertBefore > this.dragData) insertBefore--

            let [tree] = gameTrees.splice(this.dragData, 1)
            gameTrees.splice(insertBefore, 0, tree)

            this.dragData = null
            this.setState({insertBefore: -1})
            sabaki.setState({gameTrees})
        }

        this.handleCancelDrag = () => {
            this.dragData = null
            this.setState({insertBefore: -1})
        }

        this.handleItemClick = evt => {
            let {gameTrees} = this.props
            let {onItemClick = helper.noop} = this.props
            let index = gameTrees.indexOf(evt.tree)

            evt.selectedTree = evt.tree
            evt.selectedIndex = index

            onItemClick(evt)
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

            let index = this.shownGameTrees.findIndex(([, i]) => i === this.props.gameIndex)
            let scrollTop = 0
            if (index >= 0) scrollTop = this.getRowFromIndex(index) * itemHeight

            this.gamesListElement.scrollTop = scrollTop
            this.setState({scrollTop: this.gamesListElement.scrollTop})
        }

        if (prevProps.show !== this.props.show) {
            // Animate

            let gobanRect = document.getElementById('goban').getBoundingClientRect()
            let drawerRect = document.getElementById('gamechooser').getBoundingClientRect()

            let itemElement = this.itemElements[this.props.gameIndex]
            let svgElement = itemElement.querySelector('svg')

            if (itemElement != null && svgElement != null) {
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

    render({
        show,
        gameTrees,
        gameIndex
    }, {
        filterText,
        animation,
        scrollTop,
        insertBefore,
        rowCount,
        innerWidth,
        height
    }) {
        let itemWidth = Math.floor(innerWidth / rowCount)

        this.shownGameTrees = gameTrees.map((tree, index) => {
            return [tree, index]
        }).filter(([tree]) => {
            let data = [
                gametree.getRootProperty(tree, 'GN', ''),
                gametree.getRootProperty(tree, 'EV', ''),
                gametree.getPlayerName(tree, 1, 'Black'),
                gametree.getRootProperty(tree, 'BR', ''),
                gametree.getPlayerName(tree, -1, 'White'),
                gametree.getRootProperty(tree, 'WR', '')
            ]

            return data.some(x => x.includes(filterText))
        })

        return h('div', {onDrop: this.handleCancelDrag},
            h('style', {}, `
                #gamechooser .games-list .placeholder {
                    height: ${(this.getRowFromIndex(this.shownGameTrees.length - 1) + 1) * itemHeight + 20}px;
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
                    placeholder: 'Filter',
                    value: filterText,
                    onInput: this.handleFilterTextChange
                }),

                h('div',
                    {
                        ref: el => this.gamesListElement = el,
                        class: 'games-list',

                        onScroll: this.handleListScroll,
                        onDrop: this.handleItemDrop
                    },

                    h('div', {class: 'placeholder'}),

                    h('ol', {}, this.shownGameTrees.map(([tree, index], i) => {
                        let row = this.getRowFromIndex(i)
                        let itemTop = row * itemHeight + 10
                        let itemLeft = (i - row * rowCount) * itemWidth + 10

                        if (index !== gameIndex && (itemTop + itemHeight <= scrollTop || itemTop >= scrollTop + height))
                            return

                        return h(GameListItem, {
                            ref: item => {
                                if (item != null) this.itemElements[index] = item.element
                            },
                            key: tree.id,
                            tree,
                            top: itemTop,
                            left: itemLeft,
                            draggable: filterText === '',

                            showThumbnail: index !== gameIndex || !animation,
                            insertBefore: insertBefore === index,
                            insertAfter: i === this.shownGameTrees.length - 1
                                && insertBefore === index + 1,

                            onClick: this.handleItemClick,
                            onContextMenu: this.handleItemContextMenu,
                            onDragStart: this.handleItemDragStart,
                            onDragOver: this.handleItemDragOver
                        })
                    }))
                ),

                h('p', {},
                    h('button', {class: 'dropdown'}, 'Add'),
                    h('button', {class: 'dropdown'}, 'Sort By'),
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
