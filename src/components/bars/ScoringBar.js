import {h, Component} from 'preact'
import Bar from './Bar.js'

import i18n from '../../i18n.js'
import sabaki from '../../modules/sabaki.js'
import {getScore} from '../../modules/helper.js'

const t = i18n.context('ScoringBar')

export default class ScoringBar extends Component {
  constructor() {
    super()

    this.handleButtonClick = () => sabaki.openDrawer('score')
  }

  render({type, method, areaMap, scoreBoard, komi, handicap}) {
    let score = scoreBoard && getScore(scoreBoard, areaMap, {komi, handicap})
    let result =
      score && (method === 'area' ? score.areaScore : score.territoryScore)

    return h(
      Bar,
      Object.assign({type}, this.props),
      h(
        'div',
        {class: 'result'},
        h('button', {onClick: this.handleButtonClick}, t('Details')),
        h(
          'strong',
          {},
          result == null
            ? ''
            : result > 0
            ? `B+${result}`
            : result < 0
            ? `W+${-result}`
            : t('Draw')
        )
      ),
      ' ',

      type === 'scoring'
        ? t('Please select dead stones.')
        : t('Toggle group status.')
    )
  }
}
