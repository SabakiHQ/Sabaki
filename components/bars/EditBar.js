const {h, Component} = require('preact')
const helper = require('../../modules/helper')
const Bar = require('./Bar')

class EditBar extends Component {
    constructor() {
        super()

        this.state = {
            stoneTool: 1
        }

        this.handleToolButtonClick = this.handleToolButtonClick.bind(this)
    }

    componentWillReceiveProps({selectedTool}) {
        if (selectedTool === this.props.selectedTool) return

        if (selectedTool.indexOf('stone') === 0) {
            this.setState({stoneTool: +selectedTool.replace('stone_', '')})
        }
    }

    handleToolButtonClick(evt) {
        let {selectedTool, onToolButtonClick = helper.noop} = this.props

        evt.tool = evt.currentTarget.dataset.id

        if (evt.tool.indexOf('stone') === 0 && selectedTool.indexOf('stone') === 0) {
            evt.tool = `stone_${-this.state.stoneTool}`
            this.setState(({stoneTool}) => ({stoneTool: -stoneTool}))
        }

        onToolButtonClick(evt)
    }

    renderButton(title, toolId, selected = false) {
        return h('li', {class: {selected}},
            h('a',
                {
                    title,
                    href: '#',
                    'data-id': toolId,
                    onClick: this.handleToolButtonClick
                },

                h('img', {src: `./img/edit/${toolId}.svg`})
            )
        )
    }

    render({selectedTool}, {stoneTool}) {
        let isSelected = ([, id]) => id.replace(/_-?1$/, '') === selectedTool.replace(/_-?1$/, '')

        return h(Bar, Object.assign({type: 'edit'}, this.props),
            h('ul', {},
                [
                    ['Stone Tool', `stone_${stoneTool}`],
                    ['Cross Tool', 'cross'],
                    ['Triangle Tool', 'triangle'],
                    ['Square Tool', 'square'],
                    ['Circle Tool', 'circle'],
                    ['Line Tool', 'line'],
                    ['Arrow Tool', 'arrow'],
                    ['Label Tool', 'label'],
                    ['Number Tool', 'number']
                ].map(x =>
                    this.renderButton(...x, isSelected(x))
                )
            )
        )
    }
}

module.exports = EditBar
