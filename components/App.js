const {remote} = require('electron')
const {h, Component} = require('preact')

class App extends Component {
    constructor() {
        super()

        this.window = remote.getCurrentWindow()
    }

    componentDidMount() {
        this.window.show()
    }

    render() {
        return h('h1', {}, 'Hello World!')
    }
}

module.exports = App
