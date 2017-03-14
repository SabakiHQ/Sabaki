const {remote} = require('electron')
const {h, Component} = require('preact')

const MainView = require('./MainView')
const LeftSidebar = require('./LeftSidebar')
const Sidebar = require('./Sidebar')

const Board = require('../modules/board')

class App extends Component {
    constructor() {
        super()

        this.window = remote.getCurrentWindow()

        this.state = {
            board: new Board(),
            showCoordinates: false
        }
    }

    componentDidMount() {
        this.window.show()
    }

    render() {
        return h('div', {},
            h(MainView, this.state),
            h(LeftSidebar, this.state),
            h(Sidebar, this.state)
        )
    }
}

module.exports = App
