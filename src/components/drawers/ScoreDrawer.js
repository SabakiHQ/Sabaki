const {remote} = require('electron')
const {h, Component} = require('preact')
const classNames = require('classnames')

const Drawer = require('./Drawer')

const helper = require('../../modules/helper')
const setting = remote.require('./setting')

class ScoreRow extends Component {
    render({method, score, komi, sign}) {
        let index = sign > 0 ? 0 : 1

        let total = method === 'area' ? score.area[index]
            : score.territory[index] + score.captures[index]

        if (sign < 0) total += komi

        return h('tr', {},
            h('th', {},
                h('img', {
                    src: `./img/goban/stone_${sign}.png`,
                    alt: sign > 0 ? 'Black' : 'White',
                    width: 24,
                    height: 24
                })
            ),
            h('td', {class: classNames({disabled: method === 'territory'})}, score.area[index]),
            h('td', {class: classNames({disabled: method === 'area'})}, score.territory[index]),
            h('td', {class: classNames({disabled: method === 'area'})}, score.captures[index]),
            h('td', {}, sign < 0 ? komi : '-'),
            h('td', {}, total)
        )
    }
}

class ScoreDrawer extends Component {
    constructor() {
        super()

        this.handleTerritoryButtonClick = () => setting.set('scoring.method', 'territory')
        this.handleAreaButtonClick = () => setting.set('scoring.method', 'area')
        this.handleCloseButtonClick = () => sabaki.closeDrawer()

        this.handleSubmitButtonClick = evt => {
            evt.preventDefault()

            let {onSubmitButtonClick = helper.noop} = this.props
            evt.resultString = this.resultString
            onSubmitButtonClick(evt)
        }
    }

    shouldComponentUpdate({areaMap}) {
        return areaMap != null
    }

    render({show, estimating, method, areaMap, board, komi}) {
        if (isNaN(komi)) komi = 0

        let score = board ? board.getScore(areaMap) : {area: [], territory: [], captures: []}
        let result = method === 'area' ? score.area[0] - score.area[1] - komi
            : score.territory[0] - score.territory[1] + score.captures[0] - score.captures[1] - komi

        this.resultString = result > 0 ? `B+${result}` : result < 0 ? `W+${-result}` : 'Draw'

        return h(Drawer,
            {
                type: 'score',
                show
            },

            h('h2', {}, 'Score'),

            h('ul', {class: 'tabs'},
                h('li', {class: classNames({current: method === 'area'})},
                    h('a', {
                        href: '#',
                        onClick: this.handleAreaButtonClick
                    }, 'Area')
                ),
                h('li', {class: classNames({current: method === 'territory'})},
                    h('a', {
                        href: '#',
                        onClick: this.handleTerritoryButtonClick
                    }, 'Territory')
                )
            ),

            h('table', {},
                h('thead', {}, h('tr', {},
                    h('th'),
                    h('th', {disabled: method === 'territory'}, 'Area'),
                    h('th', {disabled: method === 'area'}, 'Territory'),
                    h('th', {disabled: method === 'area'}, 'Captures'),
                    h('th', {}, 'Komi'),
                    h('th', {}, 'Total')
                )),
                h('tbody', {},
                    h(ScoreRow, {method, score, komi, sign: 1}),
                    h(ScoreRow, {method, score, komi, sign: -1})
                )
            ),

            h('form', {},
                h('p', {},
                    'Result: ',
                    h('span', {class: 'result'}, this.resultString), ' ',

                    !estimating && h('button', {
                        type: 'submit',
                        onClick: this.handleSubmitButtonClick
                    }, 'Update Result'), ' ',

                    h('button', {
                        type: 'reset',
                        onClick: this.handleCloseButtonClick
                    }, 'Close')
                )
            )
        )
    }
}

module.exports = ScoreDrawer
