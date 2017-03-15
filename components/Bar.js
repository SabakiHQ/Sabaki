const {h, Component} = require('preact')

class Bar extends Component {
    render({children, type, class: c = {}, onCloseButtonClick = () => {}}) {
        return h('section', {id: type, class: Object.assign({bar: true}, c)},
            children,
            h('a', {class: 'close', href: '#', onClick: onCloseButtonClick})
        )
    }
}

module.exports = Bar
