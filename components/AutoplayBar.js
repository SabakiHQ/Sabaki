const {h, Component} = require('preact')

class AutoplayBar extends Component {
    render({
        playing,
        secondsPerMove,
        onValueChange = () => {},
        onButtonClick = () => {},
        onCloseButtonClick = () => {}
    }) {
        return h('section', {id: 'autoplay', class: {bar: true, playing}},
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
            h('a', {class: 'play', href: '#', onClick: onButtonClick}),
            h('a', {class: 'close', href: '#', onClick: onCloseButtonClick})
        )
    }
}

module.exports = AutoplayBar
