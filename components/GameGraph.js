const {h, Component} = require('preact')
const Slider = require('./Slider')

class GameGraph extends Component {
    render({height, sliderText, sliderPercent}) {
        return h('section',
            {
                id: 'graph',
                style: {height: height + '%'}
            },

            h(Slider, {
                text: sliderText,
                percent: sliderPercent
            })
        )
    }
}

module.exports = GameGraph
