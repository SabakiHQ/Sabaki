const {h, Component} = require('preact')
const Bar = require('./Bar')

class AutoplayBar extends Component {
    render({
        playing,
        secondsPerMove,
        onValueChange = () => {},
        onButtonClick = () => {},
    }) {
        return h(Bar, Object.assign({type: 'autoplay', class: {playing}}, this.props),
            h('form', {},
                h('label', {},
                    h('input', {
                        type: 'number',
                        name: 'duration',
                        value: secondsPerMove,
                        min: 1,
                        max: 10,
                        step: 'any',

                        onChange: onValueChange
                    }),
                    ' sec per move'
                )
            ),
            h('a', {class: 'play', href: '#', onClick: onButtonClick})
        )
    }
}

module.exports = AutoplayBar
