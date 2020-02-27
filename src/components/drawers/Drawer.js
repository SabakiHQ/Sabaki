import {h, Component} from 'preact'
import classNames from 'classnames'

export default class Drawer extends Component {
  constructor(props) {
    super(props)

    this.state = {
      hidecontent: props.show
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.show) {
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

  render({type, show, children}, {hidecontent}) {
    return h(
      'section',
      {
        id: type,
        class: classNames({
          drawer: true,
          hidecontent,
          show
        })
      },
      children
    )
  }
}
