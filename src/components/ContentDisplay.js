import {shell} from 'electron'
import * as remote from '@electron/remote'
import {h, Component} from 'preact'

import i18n from '../i18n.js'
import sabaki from '../modules/sabaki.js'

const t = i18n.context('ContentDisplay')
const setting = remote.require('./setting')

function htmlify(input) {
  let urlRegex = /\b(ht|f)tps?:\/\/[^\s<]+[^<.,:;"\')\]\s](\/\B|\b)/i
  let emailRegex = /\b[^\s@<]+@[^\s@<]+\b/i
  let variationRegex = /\b(black\s+?|white\s+?|[bw]\s*)(([a-hj-z]\d{1,2}[ ]+)+[a-hj-z]\d{1,2})\b/i
  let coordRegex = /\b[a-hj-z]\d{1,2}\b/i
  let movenumberRegex = /(\B#|\bmove[ ]+)(\d+)\b/i
  let totalRegex = new RegExp(
    `(${[urlRegex, emailRegex, variationRegex, coordRegex, movenumberRegex]
      .map(regex => regex.source)
      .join('|')})`,
    'gi'
  )

  input = input.replace(totalRegex, match => {
    let tokens

    if (urlRegex.test(match))
      return `<a href="${match}" class="comment-external">${match}</a>`
    if (emailRegex.test(match))
      return `<a href="mailto:${match}" class="comment-external">${match}</a>`
    if ((tokens = variationRegex.exec(match)))
      return `<span
        class="comment-variation"
        data-color="${tokens[1] ? tokens[1][0].toLowerCase() : ''}"
        data-moves="${tokens[2]}"
      >${match}</span>`
    if (coordRegex.test(match))
      return `<span class="comment-coord">${match}</span>`
    if ((tokens = movenumberRegex.exec(match)))
      return `<a
        href="#"
        class="comment-movenumber"
        title="${t('Jump to Move Number')}"
        data-movenumber="${tokens[2]}"
      >${match}</a>`
  })

  return input
}

export default class ContentDisplay extends Component {
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

        sabaki.goToMainVariation()
        sabaki.goToMoveNumber(moveNumber)
      }
    }

    let getVariationInfo = target => {
      let {board, currentPlayer} = sabaki.inferredState
      let currentVertex = board.currentVertex
      let currentVertexSign = currentVertex && board.get(currentVertex)
      let {color} = target.dataset
      let sign = color === '' ? currentPlayer : color === 'b' ? 1 : -1
      let moves = target.dataset.moves
        .split(/\s+/)
        .map(x => board.parseVertex(x))
      let sibling = currentVertexSign === sign

      return {sign, moves, sibling}
    }

    this.handleVariationMouseEnter = evt => {
      let {currentTarget} = evt
      let {sign, moves, sibling} = getVariationInfo(currentTarget)
      let counter = 1

      sabaki.setState({playVariation: {sign, moves, sibling}})

      if (setting.get('board.variation_replay_mode') === 'move_by_move') {
        clearInterval(this.variationIntervalId)
        this.variationIntervalId = setInterval(() => {
          if (counter >= moves.length) {
            clearInterval(this.variationIntervalId)
            return
          }

          let percent = (counter * 100) / (moves.length - 1)

          currentTarget.style.backgroundSize = `${percent}% 100%`
          counter++
        }, setting.get('board.variation_replay_interval'))
      } else {
        currentTarget.style.backgroundSize = '100% 100%'
      }
    }

    this.handleVariationMouseLeave = evt => {
      sabaki.setState({playVariation: null})

      clearInterval(this.variationIntervalId)
      evt.currentTarget.style.backgroundSize = ''
    }

    this.handleVariationMouseUp = evt => {
      if (evt.button !== 2) return

      let {sign, moves, sibling} = getVariationInfo(evt.currentTarget)

      sabaki.openVariationMenu(sign, moves, {
        x: evt.clientX,
        y: evt.clientY,
        appendSibling: sibling
      })
    }

    this.handleCoordMouseEnter = evt => {
      let {board} = sabaki.inferredState
      let vertex = board.parseVertex(evt.currentTarget.innerText)

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
      ? h(tag, {
          ref: el => (this.element = el),
          dangerouslySetInnerHTML: {
            __html: htmlify(
              content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
            )
          },
          ...this.props,
          tag: undefined,
          content: undefined,
          children: undefined
        })
      : h(
          tag,
          Object.assign(
            {
              ref: el => (this.element = el)
            },
            this.props
          ),
          children
        )
  }
}
