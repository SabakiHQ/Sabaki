const {remote} = require('electron')
const {h, Component} = require('preact')
const classNames = require('classnames')

const MiniGoban = require('../MiniGoban')
const Drawer = require('./Drawer')

const dialog = require('../../modules/dialog')
const fileformats = require('../../modules/fileformats')
const gametree = require('../../modules/gametree')
const gamesort = require('../../modules/gamesort')
const helper = require('../../modules/helper')
const setting = remote.require('./setting')

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
        let gameInfo = sabaki.getGameInfo(tree)
        let {gameName, eventName, blackName, blackRank, whiteName, whiteRank} = gameInfo
        let name = gameName || eventName || ''

        return h('li',
            {
                ref: el => this.element = el,
                class: classNames({
                    insertbefore: insertBefore,
                    insertafter: insertAfter
                }),
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

                h('span', {class: 'black', title: blackRank}, blackName || 'Black'),
                h('span', {class: 'white', title: whiteRank}, whiteName || 'White')
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

        this.handleCloseButtonClick = () => sabaki.closeDrawer()

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

                        let {gameTrees, onChange = helper.noop} = this.props
                        let index = gameTrees.indexOf(evt.tree)

                        onChange({gameTrees: gameTrees.filter((_, i) => i !== index)})
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

                        let {onChange = helper.noop} = this.props
                        onChange({gameTrees: [evt.tree]})
                    }
                }
            ]

            helper.popupMenu(template, evt.clientX, evt.clientY)
        }

        this.handleItemDragStart = evt => {
            this.dragData = this.props.gameTrees.indexOf(evt.tree)
        }

        this.handleItemDragOver = evt => {
            if (this.dragData == null) return

            evt.preventDefault()

            let element = evt.currentTarget
            let index = this.props.gameTrees.indexOf(evt.tree)

            let x = evt.clientX
            let {left, width} = element.getBoundingClientRect()
            let middle = left + width / 2

            if (x <= middle - 10) {
                this.setState({insertBefore: index})
            } else if (x >= middle + 10) {
                this.setState({insertBefore: index + 1})
            }
        }

        this.handleItemDrop = evt => {
            let {gameTrees, onChange = helper.noop} = this.props
            let {insertBefore} = this.state
            let newGameTrees = gameTrees.slice()

            if (this.dragData == null || insertBefore < 0) return
            if (insertBefore > this.dragData) insertBefore--

            let [tree] = newGameTrees.splice(this.dragData, 1)
            newGameTrees.splice(insertBefore, 0, tree)

            this.dragData = null
            this.setState({insertBefore: -1})

            onChange({gameTrees: newGameTrees})
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

        this.handleAddButtonClick = evt => {
            let template = [
                {
                    label: 'Add &New Game',
                    click: () => {
                        let tree = sabaki.getEmptyGameTree()
                        let {gameTrees, onChange = helper.noop} = this.props

                        onChange({gameTrees: [...gameTrees, tree]})
                    }
                },
                {
                    label: 'Add &Existing Files…',
                    click: () => {
                        dialog.showOpenDialog({
                            properties: ['openFile', 'multiSelections'],
                            filters: [...fileformats.meta, {name: 'All Files', extensions: ['*']}]
                        }, ({result}) => {
                            let {gameTrees, onChange = helper.noop} = this.props
                            let newTrees = []

                            sabaki.setBusy(true)

                            if (result) {
                                try {
                                    for (let filename of result) {
                                        let trees = fileformats.parseFile(filename)
                                        newTrees.push(...trees)
                                    }
                                } catch (err) {
                                    dialog.showMessageBox('Some files are unreadable.', 'warning')
                                }
                            }

                            onChange({gameTrees: [...gameTrees, ...newTrees]})
                            sabaki.setBusy(false)
                        })
                    }
                }
            ]

            let element = evt.currentTarget
            let {left, bottom} = element.getBoundingClientRect()

            helper.popupMenu(template, left, bottom)
        }

        this.handleSortButtonClick = evt => {
            let sortWith = (sorter) => {
                return () => {
                    sabaki.setBusy(true)

                    let {gameTrees, onChange = helper.noop} = this.props

                    gameTrees = sorter(gameTrees)

                    onChange({gameTrees})
                    sabaki.setBusy(false)
                }
            }

            let template = [
                {label: '&Black Player', click: sortWith(gamesort.byPlayerBlack)},
                {label: '&White Player', click: sortWith(gamesort.byPlayerWhite)},
                {label: 'Black R&ank', click: sortWith(gamesort.byBlackRank)},
                {label: 'White Ran&k', click: sortWith(gamesort.byWhiteRank)},
                {label: 'Game &Name', click: sortWith(gamesort.byGameName)},
                {label: 'Game &Event', click: sortWith(gamesort.byEvent)},
                {label: '&Date', click: sortWith(gamesort.byDate)},
                {label: 'Number of &Moves', click: sortWith(gamesort.byNumberOfMoves)},
                {type: 'separator'},
                {label: '&Reverse', click: sortWith(gamesort.reverse)}
            ]

            let element = evt.currentTarget
            let {left, bottom} = element.getBoundingClientRect()

            helper.popupMenu(template, left, bottom)
        }
    }

    componentDidMount() {
        window.addEventListener('resize', () => this.resize())

        this.resize()
        this.forceUpdate()
    }

    shouldComponentUpdate({show}, {animation}) {
        return animation !== this.state.animation || show || show !== this.props.show
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.state.scrollTop !== prevState.scrollTop
        && this.state.scrollTop !== this.gamesListElement.scrollTop) {
            // Update scroll top

            this.gamesListElement.scrollTop = this.state.scrollTop
            this.setState({scrollTop: this.gamesListElement.scrollTop})
        }

        if (this.props.show && prevProps.gameTrees.length !== this.props.gameTrees.length) {
            // Scroll down

            this.gamesListElement.scrollTop = this.gamesListElement.scrollHeight
            this.setState({scrollTop: this.gamesListElement.scrollTop})
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
            let svgElement = itemElement != null ? itemElement.querySelector('svg') : null

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
            let gameInfo = sabaki.getGameInfo(tree)
            let data = Object.keys(gameInfo).map(x => gameInfo[x])

            return data.join(' ').toLowerCase().includes(filterText.toLowerCase())
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

                        if (index !== gameIndex
                        && (itemTop + itemHeight * 2 <= scrollTop || itemTop - itemHeight >= scrollTop + height))
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
                    h('button', {
                        type: 'button',
                        class: 'dropdown',
                        onClick: this.handleAddButtonClick
                    }, 'Add'),

                    h('button', {
                        type: 'button',
                        class: 'dropdown',
                        onClick: this.handleSortButtonClick
                    }, 'Sort By'),

                    h('button', {
                        type: 'button',
                        onClick: this.handleCloseButtonClick
                    }, 'Close')
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
