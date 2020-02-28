import {h, Component} from 'preact'
import classNames from 'classnames'

export default class InfoOverlay extends Component {
  shouldComponentUpdate({text, show}) {
    return text !== this.props.text || show !== this.props.show
  }

  render({text, show}) {
    return h(
      'section',
      {
        id: 'info-overlay',
        class: classNames({show})
      },
      text
    )
  }
}
