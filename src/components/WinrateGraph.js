const {h, Component} = require('preact')

class WinrateGraph extends Component {
    constructor() {
        super()
    }

    render() {
        return h('section',
            {
                id: 'winrategraph'
            },
            h('svg', {style: {height: '100%', width: '100%'}})
        )
    }
}

module.exports = WinrateGraph
