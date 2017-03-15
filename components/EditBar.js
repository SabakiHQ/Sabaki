const {h, Component} = require('preact')

class EditBar extends Component {
    constructor() {
        super()

        this.state = {
            stoneTool: 1
        }

        this.handleToolButtonClick = this.handleToolButtonClick.bind(this)
    }

    componentWillReceiveProps({selectedTool}) {
        if (selectedTool.indexOf('stone') === 0) {
            this.setState({stoneTool: +selectedTool.replace('stone_', '')})
        }
    }

    handleToolButtonClick(evt) {
        let {selectedTool, onToolButtonClick = () => {}} = this.props

        evt.toolId = evt.currentTarget.dataset.id

        if (evt.toolId.indexOf('stone') === 0 && selectedTool.indexOf('stone') === 0) {
            evt.toolId = `stone_${-this.state.stoneTool}`
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

    render({selectedTool, onCloseButtonClick = () => {}}, {stoneTool}) {
        let isSelected = ([, id]) => id.replace(/_-?1$/, '') === selectedTool.replace(/_-?1$/, '')

        return h('section', {id: 'edit', class: 'bar'},
            h('ul', {},
                [
                    ['Stone Tool', `stone_${stoneTool}`],
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
            ),
            h('a', {class: 'close', href: '#', onClick: onCloseButtonClick})
        )
    }
}

module.exports = EditBar
