const {h, Component} = require('preact')
const Bar = require('./Bar')
const t = require('../../i18n').context('ScoringBar')

class ScoringBar extends Component {
    constructor() {
        super()

        this.handleButtonClick = () => sabaki.openDrawer('score')
    }

    render({type, method, areaMap, scoreBoard, komi, handicap}) {
        let score = scoreBoard && scoreBoard.getScore(areaMap, {komi, handicap})
        let result = score && (method === 'area' ? score.areaScore : score.territoryScore)

        return h(Bar, Object.assign({type}, this.props),
            h('div', {class: 'result'},
                h('button', {onClick: this.handleButtonClick}, t('Details')),
                h('strong', {},
                    !result ? ''
                    : result > 0 ? t(p => `B+${p.result}`, {result})
                    : result < 0 ? t(p => `W+${p.result}`, {result: -result})
                    : t('Draw')
                ),
            ), ' ',

            type === 'scoring'
            ? t('Please select dead stones.')
            : t('Toggle group status.')
        )
    }
}

module.exports = ScoringBar
