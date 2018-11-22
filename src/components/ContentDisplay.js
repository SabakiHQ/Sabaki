// TODO

const {remote, shell} = require('electron')
const {h, Component} = require('preact')

const gametree = require('../modules/gametree')
const setting = remote.require('./setting')

function htmlify(input) {
    let urlRegex = '\\b(ht|f)tps?:\\/\\/[^\\s<]+[^<.,:;"\')\\]\\s](\\/\\B|\\b)'
    let emailRegex = '\\b[^\\s@<]+@[^\\s@<]+\\b'
    let variationRegex = '\\b(black\\s+?|white\\s+?|[bw]\\s*)(([a-hj-z]\\d+[ ]+)+[a-hj-z]\\d+)\\b'
    let coordRegex = '\\b[a-hj-z]\\d+\\b'
    let movenumberRegex = '(\\B#|\\bmove[ ]+)(\\d+)\\b'
    let totalRegex = '(' + [urlRegex, emailRegex, variationRegex, coordRegex, movenumberRegex].join('|') + ')'

    input = input.replace(new RegExp(totalRegex, 'gi'), match => {
        let tokens

        if (new RegExp(urlRegex, 'i').test(match))
            return `<a href="${match}" class="comment-external">${match}</a>`
        if (new RegExp(emailRegex, 'i').test(match))
            return `<a href="mailto:${match}" class="comment-external">${match}</a>`
        if (tokens = new RegExp(variationRegex, 'i').exec(match))
            return `<span
                class="comment-variation"
                data-color="${tokens[1] ? tokens[1][0].toLowerCase() : ''}"
                data-variation="${tokens[2]}"
            >${match}</span>`
        if (new RegExp(coordRegex, 'i').test(match))
            return `<span class="comment-coord">${match}</span>`
        if (tokens = new RegExp(movenumberRegex, 'i').exec(match))
            return `<a
                href="#"
                class="comment-movenumber"
                title="Jump to Move Number"
                data-movenumber="${tokens[2]}"
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

        let getVariationInfo = target => {
            let {treePosition} = sabaki.state
            let board = gametree.getBoard(...treePosition)
            let currentVertex = board.currentVertex
            let currentVertexSign = currentVertex && board.get(currentVertex)
            let {color} = target.dataset
            let sign = color === '' ? sabaki.getPlayer(...treePosition) : color === 'b' ? 1 : -1
            let variation = target.dataset.variation.split(/\s+/).map(x => board.coord2vertex(x))
            let sibling = currentVertexSign === sign

            return {sign, variation, sibling}
        }

        this.handleVariationMouseEnter = evt => {
            let {currentTarget} = evt
            let {sign, variation, sibling} = getVariationInfo(currentTarget)
            let counter = 1

            sabaki.setState({playVariation: {sign, variation, sibling}})

            if (setting.get('board.variation_instant_replay')) {
                currentTarget.style.backgroundSize = '100% 100%'
            } else {
                clearInterval(this.variationIntervalId)
                this.variationIntervalId = setInterval(() => {
                    if (counter >= variation.length) {
                        clearInterval(this.variationIntervalId)
                        return
                    }

                    let percent = counter * 100 / (variation.length - 1)

                    currentTarget.style.backgroundSize = `${percent}% 100%`
                    counter++
                }, setting.get('board.variation_replay_interval'))
            }
        }

        this.handleVariationMouseLeave = evt => {
            sabaki.setState({playVariation: null})

            clearInterval(this.variationIntervalId)
            evt.currentTarget.style.backgroundSize = ''
        }

        this.handleVariationMouseUp = evt => {
            if (evt.button !== 2) return

            let {sign, variation, sibling} = getVariationInfo(evt.currentTarget)

            sabaki.openVariationMenu(sign, variation, {
                x: evt.clientX,
                y: evt.clientY,
                appendSibling: sibling
            })
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
            el.addEventListener('click', this.handleLinkClick)
        }

        // Hover on variations

        for (let el of this.element.querySelectorAll('.comment-variation')) {
            el.addEventListener('mouseenter', this.handleVariationMouseEnter)
            el.addEventListener('mouseleave', this.handleVariationMouseLeave)
            el.addEventListener('mouseup', this.handleVariationMouseUp)
        }

        // Hover on coordinates

        for (let el of this.element.querySelectorAll('.comment-coord')) {
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
