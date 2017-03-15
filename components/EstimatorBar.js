const {h, Component} = require('preact')
const Bar = require('./Bar')

class EstimatorBar extends Component {
    render({onButtonClick = () => {}}) {
        return h(Bar, Object.assign({type: 'estimator'}, this.props),
            h('button', {onClick: onButtonClick}, 'Estimate'),
            'Toggle group status.'
        )
    }
}

module.exports = EstimatorBar
