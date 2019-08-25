import {h, Component} from 'preact'
import classnames from 'classnames'

import {TextSpinner} from '../TextSpinner.js'

class EnginePeerListItem extends Component {
  constructor(props) {
    super(props)

    this.state = {
      busy: props.syncer.busy,
      suspended: props.syncer.suspended
    }

    this.syncState = () => {
      this.setState({
        busy: this.props.syncer.busy,
        suspended: this.props.syncer.suspended
      })
    }
  }

  componentDidMount() {
    this.props.syncer
    .on('busy-changed', this.syncState)
    .on('suspended-changed', this.syncState)
  }

  componentWillUnmount() {
    this.props.syncer
    .removeListener('busy-changed', this.syncState)
    .removeListener('suspended-changed', this.syncState)
  }

  render({syncer}) {
    return h('li',
      {
        class: classnames('item', {
          busy: this.state.busy,
          suspended: this.state.suspended
        })
      },

      h(TextSpinner),
      h('span', {class: 'name'}, syncer.engine.name)
    )
  }
}

export class EnginePeerList extends Component {
  render({attachedEngineSyncers}) {
    return h('div',
      {
        class: 'engine-peer-list'
      },
      h('ul', {}, attachedEngineSyncers.map(syncer =>
        h(EnginePeerListItem, {syncer})
      ))
    )
  }
}
