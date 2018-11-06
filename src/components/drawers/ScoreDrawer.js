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
                    src: `./node_modules/@sabaki/shudan/css/stone_${sign}.png`,
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

        this.resultString = result > 0 ? `黑胜 ${result}` : result < 0 ? `白胜 ${-result}` : '和棋'

        return h(Drawer,
            {
                type: 'score',
                show
            },

            h('h2', {}, '比分'),

            h('ul', {class: 'tabs'},
                h('li', {class: classNames({current: method === 'area'})},
                    h('a', {
                        href: '#',
                        onClick: this.handleAreaButtonClick
                    }, '数子')
                ),
                h('li', {class: classNames({current: method === 'territory'})},
                    h('a', {
                        href: '#',
                        onClick: this.handleTerritoryButtonClick
                    }, '数目')
                )
            ),

            h('table', {},
                h('thead', {}, h('tr', {},
                    h('th'),
                    h('th', {disabled: method === 'territory'}, '子数'),
                    h('th', {disabled: method === 'area'}, '目数'),
                    h('th', {disabled: method === 'area'}, '提子'),
                    h('th', {}, '贴目'),
                    h('th', {}, '总计')
                )),
                h('tbody', {},
                    h(ScoreRow, {method, score, komi, sign: 1}),
                    h(ScoreRow, {method, score, komi, sign: -1})
                )
            ),

            h('form', {},
                h('p', {},
                    '结果: ',
                    h('span', {class: 'result'}, this.resultString), ' ',

                    !estimating && h('button', {
                        type: 'submit',
                        onClick: this.handleSubmitButtonClick
                    }, '更新结果'), ' ',

                    h('button', {
                        type: 'reset',
                        onClick: this.handleCloseButtonClick
                    }, '关闭')
                )
            )
        )
    }
}

module.exports = ScoreDrawer
