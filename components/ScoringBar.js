const {h, Component} = require('preact')
const helper = require('../modules/helper')
const Bar = require('./Bar')

class ScoringBar extends Component {
    render({onButtonClick = helper.noop}) {
        return h(Bar, Object.assign({type: 'scoring'}, this.props),
            h('button', {onClick: onButtonClick}, 'Done'),
            'Please select dead stones.'
        )
    }
}

module.exports = ScoringBar
