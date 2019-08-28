import {h, Component} from 'preact'
import classnames from 'classnames'

import i18n from '../../i18n.js'
import {TextSpinner} from '../TextSpinner.js'

const t = i18n.context('PeerList')

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

    this.handleClick = evt => {
      let {syncer, onClick = () => {}} = this.props
      onClick({syncer})
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

  render({syncer, analyzing, selected}) {
    return h('li',
      {
        class: classnames('item', {
          analyzing,
          selected,
          busy: this.state.busy,
          suspended: this.state.suspended
        }),

        onClick: this.handleClick
      },

      !this.state.busy
      ? h('div',
        {
          class: 'icon',
          title: !this.state.suspended ? t('Running') : t('Stopped')
        },
        h('img', {
          src: `./node_modules/octicons/build/svg/${
            !this.state.suspended ? 'triangle-right' : 'primitive-square'
          }.svg`,
          alt: !this.state.suspended ? t('Running') : t('Stopped')
        })
      )
      : h(TextSpinner),

      h('span', {class: 'name'}, syncer.engine.name),

      analyzing && h('div',
        {
          class: 'icon analyzing',
          title: t('Analyzer')
        },
        h('img', {
          src: './node_modules/octicons/build/svg/pulse.svg',
          alt: t('Analyzer')
        })
      )
    )
  }
}

export class EnginePeerList extends Component {
  constructor(props) {
    super(props)

    this.handleEngineClick = evt => {
      let {onEngineSelect = () => {}} = this.props
      onEngineSelect(evt)
    }
  }

  render({
    attachedEngineSyncers,
    selectedEngineSyncerId,
    analyzingEngineSyncerId
  }) {
    return h('div',
      {
        class: 'engine-peer-list'
      },
      h('ul', {}, attachedEngineSyncers.map(syncer =>
        h(EnginePeerListItem, {
          syncer,
          analyzing: syncer.id === analyzingEngineSyncerId,
          selected: syncer.id === selectedEngineSyncerId,

          onClick: this.handleEngineClick
        })
      ))
    )
  }
}
