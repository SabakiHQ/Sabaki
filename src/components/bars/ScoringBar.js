const {h, Component} = require('preact')
const Bar = require('./Bar')
const helper = require('../../modules/helper')

class ScoringBar extends Component {
    constructor() {
        super()

        this.handleButtonClick = () => sabaki.openDrawer('score')
    }

    render({type, children, method, areaMap, scoreBoard, komi}) {
        let score = scoreBoard ? scoreBoard.getScore(areaMap) : {area: [], territory: [], captures: []}
        let result = method === 'area' ? score.area[0] - score.area[1] - komi
            : score.territory[0] - score.territory[1] + score.captures[0] - score.captures[1] - komi
        let resultString = !scoreBoard ? '' : result > 0 ? `B+${result}` : result < 0 ? `W+${-result}` : '和棋'

        return h(Bar, Object.assign({type}, this.props),
            h('div', {class: 'result'},
                h('button', {onClick: this.handleButtonClick}, '详细信息'),
                h('strong', {}, resultString),
            ), ' ',

            children
        )
    }
}

module.exports = ScoringBar
