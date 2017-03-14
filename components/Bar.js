const {h, Component} = require('preact')

class Bar extends Component {
    render({show}) {
        return h('section', {class: {bar: true, show}},
            this.children
        )
    }
}

module.exports = Bar
