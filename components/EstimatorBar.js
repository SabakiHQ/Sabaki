const {h, Component} = require('preact')
const helper = require('../modules/helper')
const Bar = require('./Bar')

class EstimatorBar extends Component {
    render({onButtonClick = helper.noop}) {
        return h(Bar, Object.assign({type: 'estimator'}, this.props),
            h('button', {onClick: onButtonClick}, 'Estimate'),
            'Toggle group status.'
        )
    }
}

module.exports = EstimatorBar
