// TODO

const {remote} = require('electron')
const {h, Component} = require('preact')
const classNames = require('classnames')
const Pikaday = require('pikaday')
const sgf = require('@sabaki/sgf')

const Drawer = require('./Drawer')

const gametree = require('../../modules/gametree')
const helper = require('../../modules/helper')
const setting = remote.require('./setting')

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

        this.handleSubmitButtonClick = async evt => {
            evt.preventDefault()

            let [tree, index] = this.props.treePosition
            let emptyTree = !tree.parent && tree.nodes.length === 1 && tree.subtrees.length === 0

            let keys = ['blackName', 'blackRank', 'whiteName', 'whiteRank',
                'gameName', 'eventName', 'date', 'result', 'komi']

            let data = keys.reduce((acc, key) => {
                acc[key] = Array.isArray(this.state[key])
                    && this.state[key].every(x => x == null) ? null : this.state[key]
                return acc
            }, {})

            if (emptyTree) {
                data.handicap = this.state.handicap
                data.size = this.state.size
            }

            sabaki.setGameInfo(this.props.treePosition[0], data)
            sabaki.closeDrawer()
            sabaki.attachEngines(...this.state.engines)

            await sabaki.waitForRender()

            let i = this.props.currentPlayer > 0 ? 0 : 1
            let startGame = setting.get('gtp.start_game_after_attach')

            if (startGame && sabaki.attachedEngineSyncers[i] != null) {
                sabaki.generateMove({followUp: true})
            }
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
            if (value === '' || isNaN(value)) value = null
            else value = +value

            this.setState(({size: [, height]}) => ({
                size: [value, this.combinedSizeFields ? value : height]
            }))
        }

        this.handleBoardHeightChange = evt => {
            let {value} = evt.currentTarget
            if (value === '' || isNaN(value)) value = null
            else value = +value

            this.setState(({size: [width, ]}) => ({size: [width, value]}))
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

        this.handleShowResultClick = () => {
            this.setState({showResult: true})
        }

        this.handleInputChange = [
            'blackRank', 'blackName',
            'whiteRank', 'whiteName',
            'gameName', 'eventName',
            'komi', 'result', 'handicap'
        ].reduce((acc, key) => {
            acc[key] = ({currentTarget}) => {
                this.setState({[key]: currentTarget.value === '' ? null : currentTarget.value})
            }

            return acc
        }, {})

        this.handleEngineMenuClick = [0, 1].map(index => evt => {
            let engines = setting.get('engines.list')
            let nameKey = ['blackName', 'whiteName'][index]
            let autoName = this.state.engines[index] == null
                ? this.state[nameKey] == null
                : this.state[nameKey] === this.state.engines[index].name.trim()

            let template = [
                {
                    label: 'Manual',
                    type: 'checkbox',
                    checked: this.state.engines[index] == null,
                    click: () => {
                        let {engines} = this.state
                        if (engines[index] == null) return

                        engines[index] = null

                        this.setState({
                            engines,
                            [nameKey]: autoName ? null : this.state[nameKey]
                        })
                    }
                },
                {type: 'separator'},
                ...engines.map(engine => ({
                    label: engine.name.trim() || '(Unnamed Engine)',
                    type: 'checkbox',
                    checked: engine === this.state.engines[index],
                    click: () => {
                        let {engines} = this.state
                        engines[index] = engine

                        this.setState({
                            engines,
                            [nameKey]: autoName ? engine.name.trim() : this.state[nameKey]
                        })
                    }
                })),
                engines.length > 0 && {type: 'separator'},
                {
                    label: 'Manage Engines…',
                    click: () => {
                        sabaki.setState({preferencesTab: 'engines'})
                        sabaki.openDrawer('preferences')
                    }
                }
            ].filter(x => !!x)

            let {left, bottom} = evt.currentTarget.getBoundingClientRect()

            helper.popupMenu(template, left, bottom)
        })
    }

    componentWillReceiveProps({gameInfo, engines, show}) {
        if (!this.props.show && show) {
            this.setState(Object.assign({}, gameInfo, {
                engines: [...engines],
                showResult: !gameInfo.result || gameInfo.result.trim() === '' || setting.get('app.always_show_result') === true
            }))
        }
    }

    componentDidMount() {
        this.preparePikaday()
    }

    shouldComponentUpdate({show}) {
        return show !== this.props.show || show
    }

    markDates() {
        let dates = (sgf.parseDates(this.state.date || '') || []).filter(x => x.length === 3)

        for (let el of this.pikaday.el.querySelectorAll('.pika-button')) {
            let year = +el.dataset.pikaYear
            let month = +el.dataset.pikaMonth
            let day = +el.dataset.pikaDay

            el.parentElement.classList.toggle('is-multi-selected', dates.some(d => {
                return helper.shallowEquals(d, [year, month + 1, day])
            }))
        }
    }

    adjustPikadayPosition() {
        let {left, top} = this.dateInputElement.getBoundingClientRect()
        let {el} = this.pikaday
        let {height} = el.getBoundingClientRect()

        el.style.position = 'absolute'
        el.style.left = Math.round(left) + 'px'
        el.style.top = Math.round(top - height) + 'px'
    }

    elementInPikaday(element) {
        while (element.parentElement) {
            if (element === this.pikaday.el) return true
            element = element.parentElement
        }

        return false
    }

    preparePikaday() {
        this.pikaday = new Pikaday({
            position: 'top left',
            firstDay: 1,
            yearRange: 6,
            keyboardInput: false,

            onOpen: () => {
                if (!this.pikaday) return

                let dates = (sgf.parseDates(this.state.date || '') || []).filter(x => x.length === 3)

                if (dates.length > 0) {
                    this.pikaday.setDate(dates[0].join('-'), true)
                } else {
                    this.pikaday.gotoToday()
                }

                this.adjustPikadayPosition()
            },
            onDraw: () => {
                if (!this.pikaday || !this.pikaday.isVisible()) return

                this.adjustPikadayPosition()
                this.markDates()

                this.dateInputElement.focus()
            },
            onSelect: date => {
                if (!this.pikaday) return

                let dates = sgf.parseDates(this.state.date || '') || []
                date = [date.getFullYear(), date.getMonth() + 1, date.getDate()]

                if (!dates.some(x => helper.shallowEquals(x, date))) {
                    dates.push(date)
                } else {
                    dates = dates.filter(x => !helper.shallowEquals(x, date))
                }

                this.setState({date: sgf.stringifyDates(dates.sort(helper.lexicalCompare))})
                this.markDates()
            }
        })

        // Hack for removing keyboard input support of Pikaday
        document.removeEventListener('keydown', this.pikaday._onKeyChange)

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
        showResult = false,
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
                            class: classNames({menu: true, active: engines[0] != null}),
                            onClick: this.handleEngineMenuClick[0]
                        }), ' ',

                        h('input', {
                            type: 'text',
                            name: 'rank_1',
                            placeholder: 'Rank',
                            value: blackRank,
                            onInput: this.handleInputChange.blackRank
                        }),

                        h('input', {
                            type: 'text',
                            name: 'name_1',
                            placeholder: 'Black',
                            value: blackName,
                            onInput: this.handleInputChange.blackName
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
                            onInput: this.handleInputChange.whiteName
                        }),

                        h('input', {
                            type: 'text',
                            name: 'rank_-1',
                            placeholder: 'Rank',
                            value: whiteRank,
                            onInput: this.handleInputChange.whiteRank
                        }), ' ',

                        h('img', {
                            src: './node_modules/octicons/build/svg/chevron-down.svg',
                            width: 16,
                            height: 16,
                            class: classNames({menu: true, active: engines[1] != null}),
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
                            onInput: this.handleInputChange.gameName
                        })
                    ),
                    h(InfoDrawerItem, {title: 'Event'},
                        h('input', {
                            type: 'text',
                            placeholder: 'None',
                            value: eventName,
                            onInput: this.handleInputChange.eventName
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
                            name: 'komi',
                            step: 0.5,
                            placeholder: 0,
                            value: komi == null ? '' : komi,
                            onInput: this.handleInputChange.komi
                        })
                    ),
                    h(InfoDrawerItem, {title: 'Result'},
                        showResult
                        ? h('input', {
                            type: 'text',
                            placeholder: 'None',
                            value: result,
                            onInput: this.handleInputChange.result
                        })
                        : h('button', {
                            type: 'button',
                            onClick: this.handleShowResultClick
                        }, 'Show')
                    ),
                    h(InfoDrawerItem, {title: 'Handicap'},
                        h('select',
                            {
                                selectedIndex: Math.max(0, handicap - 1),
                                disabled: !emptyTree,
                                onChange: this.handleInputChange.handicap
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
                            name: 'size-width',
                            placeholder: 19,
                            max: 25,
                            min: 2,
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
                            name: 'size-height',
                            placeholder: 19,
                            max: 25,
                            min: 3,
                            value: size[1],
                            disabled: !emptyTree,
                            onInput: this.handleBoardHeightChange
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
