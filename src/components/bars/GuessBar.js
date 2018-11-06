const {h, Component} = require('preact')
const Bar = require('./Bar')

class GuessBar extends Component {
    render(props) {
        return h(Bar, Object.assign({type: 'guess'}, props),
            '猜猜下一步棋。'
        )
    }
}

module.exports = GuessBar
