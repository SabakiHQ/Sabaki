import {Component} from 'preact'
import {ipcRenderer} from 'electron'
import * as dialog from '../modules/dialog.js'
import * as menu from '../menu.js'

export default class MainMenu extends Component {
  constructor(props) {
    super(props)

    this.menuData = menu.get()
    this.listeners = {}
    this._unsubscribeFocus = null

    this.buildMenu = () => {
      ipcRenderer.send('build-menu', this.props)
    }
  }

  componentDidMount() {
    this._unsubscribeFocus = window.sabaki.window.on('focus', this.buildMenu)

    let handleMenuClicks = (menu) => {
      for (let item of menu) {
        if (item.click != null) {
          this.listeners[item.id] = () => {
            if (!this.props.showMenuBar) {
              window.sabaki.window.setMenuBarVisibility(false)
            }

            dialog.closeInputBox()
            item.click()
          }

          ipcRenderer.on(`menu-click-${item.id}`, this.listeners[item.id])
        }

        if (item.submenu != null) {
          handleMenuClicks(item.submenu)
        }
      }
    }

    handleMenuClicks(this.menuData)
  }

  componentWillUnmount() {
    if (this._unsubscribeFocus) this._unsubscribeFocus()

    for (let id in this.listeners) {
      ipcRenderer.removeListener(`menu-click-${id}`, this.listeners[id])
    }
  }

  shouldComponentUpdate(nextProps) {
    for (let key in nextProps) {
      if (nextProps[key] !== this.props[key]) return true
    }

    return false
  }

  render() {
    this.buildMenu()
  }
}
