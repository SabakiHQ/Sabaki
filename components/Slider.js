const {h, Component} = require('preact')

class Slider extends Component {
    render({text, percent}) {
        return h('section', {class: 'slider'},
            h('a', {href: '#', class: 'prev'}, '▲'),
            h('a', {href: '#', class: 'next'}, '▼'),

            h('div', {class: 'inner'},
                h('span', {style: {top: percent + '%'}}, text)
            )
        )
    }
}

module.exports = Slider
