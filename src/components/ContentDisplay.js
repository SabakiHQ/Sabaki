const {shell} = require('electron')
const {h, Component} = require('preact')

const gametree = require('../modules/gametree')

function htmlify(input) {
    let urlRegex = '\\b(ht|f)tps?:\\/\\/[^\\s<]+[^<.,:;"\')\\]\\s](\\/\\B|\\b)'
    let emailRegex = '\\b[^\\s@<]+@[^\\s@<]+\\b'
    let variationRegex = '\\b(w(hite\\s+)?|b(lack\\s+)?)?(([a-hj-z]\\d+[ ]+)+[a-hj-z]\\d+)\\b'
    let coordRegex = '\\b[a-hj-z]\\d+\\b'
    let movenumberRegex = '(\\B#|\\bmove[ ]+)(\\d+)\\b'
    let totalRegex = '(' + [urlRegex, emailRegex, variationRegex, coordRegex, movenumberRegex].join('|') + ')'

    input = input.replace(new RegExp(totalRegex, 'gi'), match => {
        let info

        if (new RegExp(urlRegex, 'i').test(match))
            return `<a href="${match}" class="comment-external">${match}</a>`
        if (new RegExp(emailRegex, 'i').test(match))
            return `<a href="mailto:${match}" class="comment-external">${match}</a>`
        if (info = new RegExp(variationRegex, 'i').exec(match))
            return `<span
                class="comment-variation"
                data-color="${info[1] ? info[1][0].toLowerCase() === 'b' : ''}"
                data-variation="${info[4]}"
            >${match}</span>`
        if (new RegExp(coordRegex, 'i').test(match))
            return `<span class="comment-coord">${match}</span>`
        if (info = new RegExp(movenumberRegex, 'i').exec(match))
            return `<a
                href="#"
                class="comment-movenumber"
                title="Jump to Move Number"
                data-movenumber="${info[2]}"
            >${match}</a>`
    })

    return input
}

class ContentDisplay extends Component {
    constructor(props) {
        super(props)

        this.handleLinkClick = evt => {
            let linkElement = evt.currentTarget

            if (linkElement.classList.contains('comment-external')) {
                evt.preventDefault()
                shell.openExternal(linkElement.href)
            } else if (linkElement.classList.contains('comment-movenumber')) {
                evt.preventDefault()
                let moveNumber = +linkElement.dataset.movenumber

                sabaki.setUndoPoint('Go Back')
                sabaki.goToMainVariation()
                sabaki.goToMoveNumber(moveNumber)
            }
        }

        this.handleVariationMouseEnter = evt => {
            let board = gametree.getBoard(...sabaki.state.treePosition)
            let currentPlayer = sabaki.getPlayer(...sabaki.state.treePosition)
            let {color} = evt.currentTarget.dataset.color
            let sign = color === '' ? currentPlayer : color === 'b' ? 1 : -1
            let variation = evt.currentTarget.dataset.variation.split(/\s+/).map(x => board.coord2vertex(x))

            sabaki.setState({playVariation: {sign, variation}})
        }

        this.handleVariationMouseLeave = evt => {
            sabaki.setState({playVariation: null})
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

        // Hover on variations

        for (let el of this.element.querySelectorAll('.comment-variation')) {
            el.removeEventListener('mouseenter', this.handleVariationMouseEnter)
            el.removeEventListener('mouseleave', this.handleVariationMouseLeave)
            el.addEventListener('mouseenter', this.handleVariationMouseEnter)
            el.addEventListener('mouseleave', this.handleVariationMouseLeave)
        }

        // Hover on coordinates

        for (let el of this.element.querySelectorAll('.comment-coord')) {
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
