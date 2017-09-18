const {shell} = require('electron')
const {h, Component} = require('preact')

const gametree = require('../modules/gametree')
const helper = require('../modules/helper')

class ContentDisplay extends Component {
    componentDidMount() {
        this.componentDidUpdate()
    }

    componentDidUpdate() {
        // Handle link clicks

        for (let el of this.element.querySelectorAll('a')) {
            el.addEventListener('click', evt => {
                let linkElement = evt.currentTarget

                if (linkElement.classList.contains('external')) {
                    evt.preventDefault()
                    shell.openExternal(linkElement.href)
                } else if (linkElement.classList.contains('movenumber')) {
                    evt.preventDefault()
                    let moveNumber = +linkElement.innerText.slice(1)

                    sabaki.setUndoPoint('Go Back')
                    sabaki.goToMainVariation()
                    sabaki.goToMoveNumber(moveNumber)
                }
            })
        }

        // Hover on coordinates

        for (let el of this.element.querySelectorAll('.coord')) {
            el.addEventListener('mouseenter', evt => {
                let {board} = this.props
                let vertex = board.coord2vertex(el.innerText)
                sabaki.setState({highlightVertices: [vertex]})
            })

            el.addEventListener('mouseleave', evt => {
                sabaki.setState({highlightVertices: []})
            })
        }
    }

    render({tag}) {
        return h(tag, Object.assign({ref: el => this.element = el}, this.props))
    }
}

module.exports = ContentDisplay
