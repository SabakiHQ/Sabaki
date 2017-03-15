const {h, Component} = require('preact')
const Slider = require('./Slider')

class GameGraph extends Component {
    render({height}) {
        return h('section',
            {
                id: 'graph',
                style: {
                    height: height + '%'
                }
            },

            h(Slider)
        )
    }
}

module.exports = GameGraph
