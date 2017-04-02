const {Menu} = require('electron').remote
const {h, Component} = require('preact')
const Pikaday = require('pikaday')
const Drawer = require('./Drawer')

const gametree = require('../../modules/gametree')
const helper = require('../../modules/helper')
const setting = require('../../modules/setting')
const {sgf} = require('../../modules/fileformats')

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

        this.handleSubmitButtonClick = evt => {
            evt.preventDefault()

            let [tree, index] = this.props.treePosition
            let emptyTree = !tree.parent && tree.nodes.length === 1 && tree.subtrees.length === 0

            let keys = ['blackName', 'blackRank', 'whiteName', 'whiteRank',
                'gameName', 'eventName', 'date', 'result', 'komi', 'handicap', 'size']
            let data = keys.reduce((acc, key) => (acc[key] = this.state[key], acc), {})

            if (emptyTree) {
                data.handicap = this.state.handicap
                data.size = this.state.size
            }

            sabaki.attachEngines(...this.state.engines)
            sabaki.setGameInfo(this.props.treePosition[0], data)
            sabaki.closeDrawer()
        }

        this.handleCancelButtonClick = evt => {
            evt.preventDefault()
            sabaki.closeDrawer()
        }

        this.handleBoardWidthFocus = () => {
            this.combinedSizeFields = this.state.size[0] === this.state.size[1]
        }

        this.handleBoardWidthChange = evt => {
            let {value} = evt.currentTarget

            this.setState(({size: [, height]}) => ({
                size: [value, this.combinedSizeFields ? value : height]
            }))
        }

        this.handleSizeSwapButtonClick = () => {
            this.setState(({size}) => ({size: size.reverse()}))
        }

        this.handleSwapPlayers = () => {
            this.setState(({engines, blackName, blackRank, whiteName, whiteRank}) => ({
                engines: (engines || [null, null]).reverse(),
                blackName: whiteName,
                whiteName: blackName,
                blackRank: whiteRank,
                whiteRank: blackRank
            }))
        }

        this.handleDateInputChange = evt => {
            this.setState({date: evt.currentTarget.value})
            this.markDates()
        }

        this.handleDateInputFocus = () => {
            this.pikaday.show()
        }

        this.handleDateInputBlur = () => {
            setTimeout(() => {
                if (!this.elementInPikaday(document.activeElement))
                    this.pikaday.hide()
            }, 50)
        }

        this.handleEngineMenuClick = [0, 1].map(index => evt => {
            let nameKeys = ['blackName', 'whiteName']
            let template = [
                {
                    label: 'Manual',
                    type: 'checkbox',
                    checked: this.state.engines[index] == null,
                    click: () => {
                        let {engines} = this.state
                        if (engines[index] == null) return

                        engines[index] = null
                        this.setState({engines, [nameKeys[index]]: ''})
                    }
                },
                {type: 'separator'},
                ...setting.get('engines.list').map(engine => ({
                    label: engine.name.trim() || '(Unnamed Engine)',
                    type: 'checkbox',
                    checked: engine === this.state.engines[index],
                    click: () => {
                        let {engines} = this.state
                        engines[index] = engine
                        this.setState({engines, [nameKeys[index]]: engine.name})
                    }
                })),
                {type: 'separator'},
                {
                    label: 'Manage Engines…',
                    click: () => {
                        sabaki.setState({preferencesTab: 'engines'})
                        sabaki.openDrawer('preferences')
                    }
                }
            ]

            let {left, bottom} = evt.currentTarget.getBoundingClientRect()
            let menu = Menu.buildFromTemplate(template)

            menu.popup(sabaki.window, {
                async: true,
                x: Math.round(left),
                y: Math.round(bottom)
            })
        })
    }

    componentWillReceiveProps({gameInfo, engines, show}) {
        if (!this.props.show && show) {
            this.setState(gameInfo)
            this.setState({engines: [...engines]})
        }
    }

    componentDidMount() {
        this.preparePikaday()
    }

    markDates(pikaday = null) {
        if (pikaday == null) pikaday = this.pikaday

        let dates = (sgf.string2dates(this.state.date || '') || []).filter(x => x.length === 3)

        for (let el of pikaday.el.querySelectorAll('.pika-button')) {
            let year = +el.dataset.pikaYear
            let month = +el.dataset.pikaMonth
            let day = +el.dataset.pikaDay

            el.parentElement.classList.toggle('is-multi-selected', dates.some(d => {
                return helper.equals(d, [year, month + 1, day])
            }))
        }
    }

    adjustPikadayPosition(pikaday = null) {
        if (pikaday == null) pikaday = this.pikaday

        let {left, top} = this.dateInputElement.getBoundingClientRect()
        let {height} = pikaday.el.getBoundingClientRect()

        pikaday.el.style.position = 'absolute'
        pikaday.el.style.left = Math.round(left) + 'px'
        pikaday.el.style.top = Math.round(top - height) + 'px'
    }

    elementInPikaday(element, pikaday = null) {
        if (pikaday == null) pikaday = this.pikaday

        while (element.parentElement) {
            if (element === pikaday.el) return true
            element = element.parentElement
        }

        return false
    }

    preparePikaday() {
        let self = this

        this.pikaday = new Pikaday({
            position: 'top left',
            firstDay: 1,
            yearRange: 6,
            onOpen() {
                let dates = (sgf.string2dates(self.state.date || '') || []).filter(x => x.length === 3)

                if (dates.length > 0) {
                    this.setDate(dates[0].join('-'), true)
                } else {
                    this.gotoToday()
                }

                self.adjustPikadayPosition(this)
            },
            onDraw() {
                if (!this.isVisible()) return

                self.adjustPikadayPosition(this)
                self.markDates(this)

                self.dateInputElement.focus()
            },
            onSelect() {
                let dates = sgf.string2dates(self.state.date || '') || []
                let date = this.getDate()
                date = [date.getFullYear(), date.getMonth() + 1, date.getDate()]

                if (!dates.some(x => helper.equals(x, date))) {
                    dates.push(date)
                } else {
                    dates = dates.filter(x => !helper.equals(x, date))
                }

                self.setState({date: sgf.dates2string(dates.sort(helper.lexicalCompare))})
            }
        })

        this.pikaday.hide()

        document.body.appendChild(this.pikaday.el)
        document.body.addEventListener('click', evt => {
            if (this.pikaday.isVisible()
            && document.activeElement !== this.dateInputElement
            && evt.target !== this.dateInputElement
            && !this.elementInPikaday(evt.target))
                this.pikaday.hide()
        })

        window.addEventListener('resize', () => this.adjustPikadayPosition())
    }

    render({
        treePosition,
        currentPlayer,
        show
    }, {
        engines = [null, null],
        blackName = null,
        blackRank = null,
        whiteName = null,
        whiteRank = null,
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
                        h('img', {
                            src: './node_modules/octicons/build/svg/chevron-down.svg',
                            width: 16,
                            height: 16,
                            class: {menu: true, active: engines[0] != null},
                            onClick: this.handleEngineMenuClick[0]
                        }), ' ',

                        h('input', {
                            type: 'text',
                            name: 'rank_1',
                            placeholder: 'Rank',
                            value: blackRank,
                            onInput: this.linkState('blackRank')
                        }),

                        h('input', {
                            type: 'text',
                            name: 'name_1',
                            placeholder: 'Black',
                            value: blackName,
                            onInput: this.linkState('blackName')
                        })
                    ),

                    h('img', {
                        class: 'current-player',
                        src: `./img/ui/player_${currentPlayer}.svg`,
                        height: 31,
                        title: 'Swap',
                        onClick: this.handleSwapPlayers
                    }),

                    h('span', {},
                        h('input', {
                            type: 'text',
                            name: 'name_-1',
                            placeholder: 'White',
                            value: whiteName,
                            onInput: this.linkState('whiteName')
                        }),

                        h('input', {
                            type: 'text',
                            name: 'rank_-1',
                            placeholder: 'Rank',
                            value: whiteRank,
                            onInput: this.linkState('whiteRank')
                        }), ' ',

                        h('img', {
                            src: './node_modules/octicons/build/svg/chevron-down.svg',
                            width: 16,
                            height: 16,
                            class: {menu: true, active: engines[1] != null},
                            onClick: this.handleEngineMenuClick[1]
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
                            ref: el => this.dateInputElement = el,
                            type: 'text',
                            placeholder: 'None',
                            value: date,

                            onFocus: this.handleDateInputFocus,
                            onBlur: this.handleDateInputBlur,
                            onInput: this.handleDateInputChange
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
                                disabled: !emptyTree,
                                onChange: this.linkState('handicap')
                            },

                            h('option', {value: 0}, 'No stones'),
                            [...Array(8)].map((_, i) =>
                                h('option', {value: i + 2}, (i + 2) + ' stones')
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
                            onInput: this.handleBoardWidthChange
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
                    h('button', {type: 'submit', onClick: this.handleSubmitButtonClick}, 'OK'), ' ',
                    h('button', {type: 'reset', onClick: this.handleCancelButtonClick}, 'Cancel')
                )
            )
        )
    }
}

module.exports = InfoDrawer
