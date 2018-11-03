const {remote} = require('electron')
const {h, Component} = require('preact')
const helper = require('../modules/helper')
const setting = remote.require('./setting')

let winrateGraphHeight = setting.get('view.winrategraph_height')

class WinrateGraph extends Component {
    constructor() {
        super()
    }

    shouldComponentUpdate({width, currentIndex, data}) {
    }

    componentDidMount() {
    }

    render({width, currentIndex, data}) {
        return h('section',
            {
                ref: el => this.element = el,
                id: 'winrategraph',
                style: {height: 0},
                onMouseDown: this.handleMouseDown
            },
        )
    }
}

module.exports = WinrateGraph
