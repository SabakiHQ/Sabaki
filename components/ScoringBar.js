const {h, Component} = require('preact')
const Bar = require('./Bar')

class ScoringBar extends Component {
    render({onButtonClick = () => {}}) {
        return h(Bar, Object.assign({type: 'scoring'}, this.props),
            h('button', {onClick: onButtonClick}, 'Done'),
            'Please select dead stones.'
        )
    }
}

module.exports = ScoringBar
