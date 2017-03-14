const {h, Component} = require('preact')
const Goban = require('./Goban')
const Bar = require('./Bar')

class MainView extends Component {
    render({board}) {
        return h('section', {id: 'main'},
            h('main', {},
                h(Goban, {board})
            ),
            h('section', {id: 'bar'})
        )
    }
}

module.exports = MainView
