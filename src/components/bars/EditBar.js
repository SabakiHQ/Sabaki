import {h, Component} from 'preact'
import classNames from 'classnames'

import i18n from '../../i18n.js'
import {noop} from '../../modules/helper.js'
import Bar from './Bar.js'

const t = i18n.context('EditBar')

class EditBar extends Component {
  constructor() {
    super()

    this.state = {
      stoneTool: 1
    }

    this.handleToolButtonClick = this.handleToolButtonClick.bind(this)
  }

  componentWillReceiveProps({selectedTool}) {
    if (selectedTool === this.props.selectedTool) return

    if (selectedTool.indexOf('stone') === 0) {
      this.setState({stoneTool: +selectedTool.replace('stone_', '')})
    }
  }

  shouldComponentUpdate(nextProps) {
    return nextProps.mode !== this.props.mode || nextProps.mode === 'edit'
  }

  handleToolButtonClick(evt) {
    let {selectedTool, onToolButtonClick = noop} = this.props

    evt.tool = evt.currentTarget.dataset.id

    if (
      evt.tool.indexOf('stone') === 0 &&
      selectedTool.indexOf('stone') === 0
    ) {
      evt.tool = `stone_${-this.state.stoneTool}`
      this.setState(({stoneTool}) => ({stoneTool: -stoneTool}))
    }

    onToolButtonClick(evt)
  }

  renderButton(title, toolId, selected = false) {
    return h(
      'li',
      {class: classNames({selected})},
      h(
        'a',
        {
          title,
          href: '#',
          'data-id': toolId,
          onClick: this.handleToolButtonClick
        },

        h('img', {src: `./img/edit/${toolId}.svg`})
      )
    )
  }

  render({selectedTool}, {stoneTool}) {
    let isSelected = ([, id]) =>
      id.replace(/_-?1$/, '') === selectedTool.replace(/_-?1$/, '')

    return h(
      Bar,
      Object.assign({type: 'edit'}, this.props),
      h(
        'ul',
        {},
        [
          [t('Stone Tool'), `stone_${stoneTool}`],
          [t('Cross Tool'), 'cross'],
          [t('Triangle Tool'), 'triangle'],
          [t('Square Tool'), 'square'],
          [t('Circle Tool'), 'circle'],
          [t('Line Tool'), 'line'],
          [t('Arrow Tool'), 'arrow'],
          [t('Label Tool'), 'label'],
          [t('Number Tool'), 'number']
        ].map(x => this.renderButton(...x, isSelected(x)))
      )
    )
  }
}

export default EditBar
