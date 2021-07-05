import * as remote from '@electron/remote'
import {h, Component} from 'preact'

const setting = remote.require('./setting')

export default class BusyScreen extends Component {
  componentWillReceiveProps({show}) {
    if (show === this.props.show) return

    clearTimeout(this.busyId)

    if (show) {
      this.setState({show: true})
      document.activeElement.blur()
    } else {
      let delay = setting.get('app.hide_busy_delay')
      this.busyId = setTimeout(() => this.setState({show: false}), delay)
    }
  }

  render(_, {show}) {
    return h('section', {
      id: 'busy',
      style: {display: show ? 'block' : 'none'}
    })
  }
}
