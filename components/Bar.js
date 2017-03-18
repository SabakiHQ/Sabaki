const {h, Component} = require('preact')
const helper = require('../modules/helper')

class Bar extends Component {
    constructor() {
        super()

        this.onCloseButtonClick = () => sabaki.setMode('play')
    }

    render({children, type, class: c = {}}) {
        return h('section', {id: type, class: Object.assign({bar: true}, c)},
            children,
            h('a', {class: 'close', href: '#', onClick: this.onCloseButtonClick})
        )
    }
}

module.exports = Bar
