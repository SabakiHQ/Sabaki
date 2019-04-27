const {remote} = require('electron')
const {h, Component} = require('preact')
const helper = require('../modules/helper')
const t = require('../i18n').context('WinrateGraph')
const setting = remote.require('./setting')

let winrateGraphMinHeight = setting.get('view.winrategraph_minheight')

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
            }
        )
    }
}

module.exports = WinrateGraph
