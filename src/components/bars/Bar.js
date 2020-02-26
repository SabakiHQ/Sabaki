import {h, Component} from 'preact'
import classNames from 'classnames'
import sabaki from '../../modules/sabaki.js'

export default class Bar extends Component {
  constructor(props) {
    super(props)

    this.state = {
      hidecontent: props.type !== props.mode
    }

    this.onCloseButtonClick = () => sabaki.setMode('play')
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.type === nextProps.mode) {
      clearTimeout(this.hidecontentId)

      if (this.state.hidecontent) this.setState({hidecontent: false})
    } else {
      if (!this.state.hidecontent)
        this.hidecontentId = setTimeout(
          () => this.setState({hidecontent: true}),
          500
        )
    }
  }

  shouldComponentUpdate(nextProps) {
    return (
      nextProps.mode !== this.props.mode || nextProps.mode === nextProps.type
    )
  }

  render({children, type, mode, class: c = ''}, {hidecontent}) {
    return h(
      'section',
      {
        id: type,
        class: classNames(c, {
          bar: true,
          current: type === mode,
          hidecontent
        })
      },

      children,
      h('a', {class: 'close', href: '#', onClick: this.onCloseButtonClick})
    )
  }
}
