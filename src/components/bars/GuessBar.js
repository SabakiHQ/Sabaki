import {h, Component} from 'preact'
import Bar from './Bar.js'
import i18n from '../../i18n.js'

const t = i18n.context('GuessBar')

class GuessBar extends Component {
  render(props) {
    return h(
      Bar,
      Object.assign({type: 'guess'}, props),
      t('Click on the board to guess the next move.')
    )
  }
}

export default GuessBar
