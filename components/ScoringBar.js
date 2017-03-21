const {h, Component} = require('preact')
const helper = require('../modules/helper')
const Bar = require('./Bar')

class ScoringBar extends Component {
    constructor() {
        super()

        this.handleButtonClick = () => sabaki.openDrawer('score')
    }

    render({scoreBoard}) {
        return h(Bar, Object.assign({type: 'scoring'}, this.props),
            h('button', {onClick: this.handleButtonClick}, 'Done'),
            'Please select dead stones.'
        )
    }
}

module.exports = ScoringBar
