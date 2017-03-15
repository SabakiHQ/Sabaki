const {h, Component} = require('preact')

class Slider extends Component {
    render() {
        return h('section', {class: 'slider'},
            h('a', {href: '#', class: 'prev'}, '▲'),
            h('a', {href: '#', class: 'next'}, '▼'),

            h('div', {class: 'inner'},
                h('span')
            )
        )
    }
}

module.exports = Slider
