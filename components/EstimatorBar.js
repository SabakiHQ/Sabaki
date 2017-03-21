const {h, Component} = require('preact')
const helper = require('../modules/helper')
const Bar = require('./Bar')

class EstimatorBar extends Component {
    constructor() {
        super()

        this.handleButtonClick = () => sabaki.openDrawer('score')
    }

    render({scoreBoard}) {
        return h(Bar, Object.assign({type: 'estimator'}, this.props),
            h('button', {onClick: this.handleButtonClick}, 'Estimate'),
            'Toggle group status.'
        )
    }
}

module.exports = EstimatorBar
