const {remote, ipcRenderer} = require('electron')
const {h, Component} = require('preact')

const setting = remote.require('./setting')

class BusyScreen extends Component {
    componentWillReceiveProps({show}) {
        if (show === this.props.show) return

        sabaki.buildMenu()
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

module.exports = BusyScreen
