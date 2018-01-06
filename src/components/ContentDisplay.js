const {shell} = require('electron')
const {h, Component} = require('preact')

const gametree = require('../modules/gametree')
const helper = require('../modules/helper')

class ContentDisplay extends Component {
    componentDidMount() {
        this.componentDidUpdate()

        this.handleLinkClick = evt => {
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
        }

        this.handleCoordMouseEnter = evt => {
            let {board} = this.props
            let vertex = board.coord2vertex(evt.currentTarget.innerText)
            
            sabaki.setState({highlightVertices: [vertex]})
        }

        this.handleCoordMouseLeave = evt => {
            sabaki.setState({highlightVertices: []})
        }
    }

    componentDidUpdate() {
        // Handle link clicks

        for (let el of this.element.querySelectorAll('a')) {
            el.removeEventListener('click', this.handleLinkClick)
            el.addEventListener('click', this.handleLinkClick)
        }

        // Hover on coordinates

        for (let el of this.element.querySelectorAll('.coord')) {
            el.removeEventListener('mouseenter', this.handleCoordMouseEnter)
            el.removeEventListener('mouseleave', this.handleCoordMouseLeave)
            el.addEventListener('mouseenter', this.handleCoordMouseEnter)
            el.addEventListener('mouseleave', this.handleCoordMouseLeave)
        }
    }

    render({tag}) {
        return h(tag, Object.assign({ref: el => this.element = el}, this.props))
    }
}

module.exports = ContentDisplay
