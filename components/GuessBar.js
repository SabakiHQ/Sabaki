const {h, Component} = require('preact')

class GuessBar extends Component {
    render({onCloseButtonClick = () => {}}) {
        return h('section', {id: 'guess', class: 'bar'},
            'Guess the next move.',
            h('a', {class: 'close', href: '#', onClick: onCloseButtonClick})
        )
    }
}

module.exports = GuessBar
