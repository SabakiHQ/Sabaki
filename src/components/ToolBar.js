import {h, Component} from 'preact'

export class ToolBarButton extends Component {
  render() {
    let {tooltip, icon} = this.props

    return h('li', {class: 'tool-bar-button'},
      h('a', {href: '#', title: tooltip},
        h('img', {
          src: icon,
          alt: tooltip
        })
      )
    )
  }
}

export class ToolBar extends Component {
  render() {
    return h('div', {class: 'tool-bar'},
      h('ul', {}, this.props.children)
    )
  }
}
