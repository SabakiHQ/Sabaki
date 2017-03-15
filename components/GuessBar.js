const {h, Component} = require('preact')
const Bar = require('./Bar')

class GuessBar extends Component {
    render(props) {
        return h(Bar, Object.assign({type: 'guess'}, props),
            'Guess the next move.'
        )
    }
}

module.exports = GuessBar
