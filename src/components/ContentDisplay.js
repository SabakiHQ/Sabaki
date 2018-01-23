const {shell} = require('electron')
const {h, Component} = require('preact')

const gametree = require('../modules/gametree')

function htmlify(input) {
    let urlRegex = '\\b(ht|f)tps?:\\/\\/[^\\s<]+[^<.,:;"\')\\]\\s](\\/\\B|\\b)'
    let emailRegex = '\\b[^\\s@<]+@[^\\s@<]+\\b'
    let coordRegex = '\\b[a-hj-zA-HJ-Z][1-9][0-9]?\\b'
    let movenumberRegex = '\\B#\\d+\\b'
    let totalRegex = '(' + [urlRegex, emailRegex, coordRegex, movenumberRegex].join('|') + ')'

    input = input.replace(new RegExp(totalRegex, 'g'), match => {
        if (new RegExp(urlRegex).test(match))
            return `<a href="${match}" class="external">${match}</a>`
        if (new RegExp(emailRegex).test(match))
            return `<a href="mailto:${match}" class="external">${match}</a>`
        if (new RegExp(movenumberRegex).test(match))
            return `<a href="#" class="movenumber" title="Jump to Move Number">${match}</a>`
        if (new RegExp(coordRegex).test(match))
            return `<span class="coord">${match}</span>`
    })

    return input
}

class ContentDisplay extends Component {
    constructor(props) {
        super(props)

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
            let board = gametree.getBoard(...sabaki.state.treePosition)
            let vertex = board.coord2vertex(evt.currentTarget.innerText)

            sabaki.setState({highlightVertices: [vertex]})
        }

        this.handleCoordMouseLeave = evt => {
            sabaki.setState({highlightVertices: []})
        }
    }

    componentDidMount() {
        this.componentDidUpdate()
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

    render({tag, content, children}) {
        return content != null
            ? h(tag, Object.assign({
                ref: el => this.element = el,
                dangerouslySetInnerHTML: {
                    __html: htmlify(
                        content
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                    )
                }
            }, this.props))
            : h(tag, Object.assign({
                ref: el => this.element = el
            }, this.props), children)
    }
}

module.exports = ContentDisplay
