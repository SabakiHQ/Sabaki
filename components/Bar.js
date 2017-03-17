const {h, Component} = require('preact')
const helper = require('../modules/helper')

class Bar extends Component {
    render({children, type, class: c = {}, onCloseButtonClick = helper.noop}) {
        return h('section', {id: type, class: Object.assign({bar: true}, c)},
            children,
            h('a', {class: 'close', href: '#', onClick: onCloseButtonClick})
        )
    }
}

module.exports = Bar
