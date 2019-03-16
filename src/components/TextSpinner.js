const {h, Component} = require('preact')

class TextSpinner extends Component {
    constructor(props) {
        super(props)

        this.state = {
            frame: 0
        }
    }

    componentDidMount() {
        this.animationIntervalId = setInterval(() => {
            this.setState(({frame}) => ({
                frame: frame + 1
            }))
        }, this.props.interval || 100)
    }

    componentWillUnmount() {
        clearInterval(this.animationIntervalId)
    }

    render() {
        let {frames = '-\\|/'} = this.props

        return h('span', {}, frames[this.state.frame % frames.length])
    }
}

module.exports = TextSpinner
