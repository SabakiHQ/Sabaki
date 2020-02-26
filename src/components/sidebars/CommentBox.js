import {remote, shell} from 'electron'
import {h, Component} from 'preact'
import classNames from 'classnames'
import boardmatcher from '@sabaki/boardmatcher'
import sgf from '@sabaki/sgf'

import i18n from '../../i18n.js'
import sabaki from '../../modules/sabaki.js'
import gametree from '../../modules/gametree.js'
import {vertexEquals, typographer, noop} from '../../modules/helper.js'

import MarkdownContentDisplay from '../MarkdownContentDisplay.js'

const t = i18n.context('CommentBox')
const setting = remote.require('./setting')

let commentsCommitDelay = setting.get('comments.commit_delay')

class CommentTitle extends Component {
  constructor() {
    super()

    this.handleEditButtonClick = () => sabaki.setMode('edit')

    this.handleMoveNameHelpClick = evt => {
      evt.preventDefault()
      shell.openExternal(evt.currentTarget.href)
    }

    this.handleMoveNameHelpMouseEnter = evt => {
      let matchedVertices = JSON.parse(evt.currentTarget.dataset.vertices)

      sabaki.setState({highlightVertices: matchedVertices})
    }

    this.handleMoveNameHelpMouseLeave = evt => {
      sabaki.setState({highlightVertices: []})
    }
  }

  shouldComponentUpdate({
    gameTree,
    treePosition,
    moveAnnotation,
    positionAnnotation,
    title
  }) {
    return (
      title !== this.props.title ||
      gameTree !== this.props.gameTree ||
      treePosition !== this.props.treePosition ||
      !vertexEquals(moveAnnotation, this.props.moveAnnotation) ||
      !vertexEquals(positionAnnotation, this.props.positionAnnotation)
    )
  }

  getCurrentMoveInterpretation() {
    let {gameTree, treePosition} = this.props
    let node = gameTree.get(treePosition)

    // Determine root node

    if (node.parentId == null) {
      let result = []

      if (node.data.EV != null) result.push(node.data.EV[0])
      if (node.data.GN != null) result.push(node.data.GN[0])

      result = result.filter(x => x.trim() !== '').join(' — ')
      if (result !== '') return typographer(result)

      let today = new Date()
      if (today.getDate() === 25 && today.getMonth() === 3)
        return t('Happy Birthday, Sabaki!')

      return ''
    }

    // Determine end of main variation and show game result

    if (node.children.length === 0 && gameTree.onMainLine(treePosition)) {
      let result = gametree.getRootProperty(gameTree, 'RE', '')
      if (result.trim() !== '') return t(p => `Result: ${p.result}`, {result})
    }

    // Get current vertex

    let vertex, sign

    if (node.data.B != null) {
      sign = 1
      vertex = sgf.parseVertex(node.data.B[0])
    } else if (node.data.W != null) {
      sign = -1
      vertex = sgf.parseVertex(node.data.W[0])
    } else {
      return null
    }

    let prevBoard = gametree.getBoard(gameTree, node.parentId)
    let patternMatch = boardmatcher.findPatternInMove(
      prevBoard.signMap,
      sign,
      vertex
    )

    if (patternMatch == null) {
      let diff = vertex
        .map((z, i) =>
          Math.min(z + 1, [prevBoard.width, prevBoard.height][i] - z)
        )
        .sort((a, b) => a - b)

      if (diff[0] > 6) return null

      return t(p => `${p.a}-${p.b} Point`, {
        a: diff[0],
        b: diff[1]
      })
    }

    let board = gametree.getBoard(gameTree, treePosition)
    let matchedVertices = [
      ...patternMatch.match.anchors,
      ...patternMatch.match.vertices
    ].filter(v => board.get(v) !== 0)

    return [
      t(patternMatch.pattern.name),
      ' ',

      patternMatch.pattern.url &&
        h(
          'a',
          {
            class: 'help',
            href: patternMatch.pattern.url,
            title: t('View article on Sensei’s Library'),
            'data-vertices': JSON.stringify(matchedVertices),

            onClick: this.handleMoveNameHelpClick,
            onMouseEnter: this.handleMoveNameHelpMouseEnter,
            onMouseLeave: this.handleMoveNameHelpMouseLeave
          },

          h('img', {
            src: './node_modules/@primer/octicons/build/svg/question.svg',
            width: 16,
            height: 16
          })
        )
    ]
  }

  render({moveAnnotation: [ma, mv], positionAnnotation: [pa, pv], title}) {
    let moveData = {
      '-1': [t('Bad move'), 'badmove'],
      '0': [t('Doubtful move'), 'doubtfulmove'],
      '1': [t('Interesting move'), 'interestingmove'],
      '2': [t('Good move'), 'goodmove']
    }

    if (mv > 1) {
      for (let s in moveData) {
        moveData[s][0] = t('Very ' + moveData[s][0].toLowerCase())
      }
    }

    let positionData = {
      '-1': [t('Good for white'), 'white'],
      '0': [t('Even position'), 'balance'],
      '1': [t('Good for black'), 'black'],
      '-2': [t('Unclear position'), 'unclear']
    }

    if (pv > 1) {
      for (let s in positionData) {
        positionData[s][0] = t('Very ' + positionData[s][0].toLowerCase())
      }
    }

    let showMoveInterpretation = setting.get(
      'comments.show_move_interpretation'
    )

    return h(
      'p',
      {
        class: classNames({
          header: true,
          movestatus: ma !== null,
          positionstatus: pa !== null
        })
      },

      h('img', {
        width: 16,
        height: 16,
        class: 'positionstatus',
        title: pa in positionData ? positionData[pa][0] : '',
        src: pa in positionData ? `./img/ui/${positionData[pa][1]}.svg` : ''
      }),

      h('img', {
        width: 16,
        height: 16,
        class: 'movestatus',
        title: ma in moveData ? moveData[ma][0] : '',
        src: ma in moveData ? `./img/ui/${moveData[ma][1]}.svg` : ''
      }),

      h('img', {
        src: './node_modules/@primer/octicons/build/svg/pencil.svg',
        class: 'edit-button',
        title: t('Edit'),
        width: 16,
        height: 16,
        onClick: this.handleEditButtonClick
      }),

      h(
        'span',
        {},
        title !== ''
          ? typographer(title)
          : showMoveInterpretation
          ? this.getCurrentMoveInterpretation()
          : ''
      )
    )
  }
}

class CommentText extends Component {
  shouldComponentUpdate({comment}) {
    return comment !== this.props.comment
  }

  render({comment}) {
    return h(
      'div',
      {
        ref: el => (this.element = el),
        class: 'comment'
      },

      h(MarkdownContentDisplay, {source: comment})
    )
  }
}

export default class CommentBox extends Component {
  constructor(props) {
    super(props)

    this.state = {
      title: '',
      comment: ''
    }

    this.handleCommentInput = () => {
      let {onCommentInput = noop} = this.props

      this.setState({
        title: this.titleInputElement.value,
        comment: this.textareaElement.value
      })

      clearTimeout(this.commentInputTimeout)
      this.commentInputTimeout = setTimeout(() => {
        onCommentInput({
          title: this.titleInputElement.value,
          comment: this.textareaElement.value
        })
      }, commentsCommitDelay)
    }

    this.handleMenuButtonClick = () => {
      let {left, bottom} = this.menuButtonElement.getBoundingClientRect()
      let {treePosition} = this.props

      sabaki.openCommentMenu(treePosition, {x: left, y: bottom})
    }
  }

  shouldComponentUpdate({showCommentBox}) {
    return showCommentBox && !this.dirty
  }

  componentWillReceiveProps({treePosition, mode, title, comment}) {
    let treePositionChanged = treePosition !== this.props.treePosition

    if (mode === 'edit') {
      this.element.scrollTop = 0
      if (treePositionChanged) this.textareaElement.scrollTop = 0

      this.setState({title, comment})
      return
    }

    // Debounce rendering

    this.dirty = true

    clearTimeout(this.updateId)
    this.updateId = setTimeout(() => {
      this.dirty = false

      if (treePositionChanged) this.element.scrollTop = 0
      this.setState({title, comment})
    }, setting.get('graph.delay'))
  }

  render(
    {
      gameTree,
      treePosition,
      moveAnnotation,
      positionAnnotation,

      onLinkClick = noop
    },
    {title, comment}
  ) {
    return h(
      'section',
      {
        ref: el => (this.element = el),
        id: 'properties'
      },

      h(
        'div',
        {class: 'inner'},
        h(CommentTitle, {
          gameTree,
          treePosition,
          moveAnnotation,
          positionAnnotation,
          title
        }),

        h(CommentText, {
          comment,
          onLinkClick
        })
      ),

      h(
        'div',
        {class: 'edit'},
        h(
          'div',
          {class: 'header'},
          h('img', {
            ref: el => (this.menuButtonElement = el),
            src: './node_modules/@primer/octicons/build/svg/chevron-down.svg',
            width: 16,
            height: 16,
            onClick: this.handleMenuButtonClick
          }),

          h(
            'div',
            {},
            h('input', {
              ref: el => (this.titleInputElement = el),
              type: 'text',
              name: 'title',
              value: title,
              placeholder: t('Title'),
              onInput: this.handleCommentInput
            })
          )
        ),

        h('textarea', {
          ref: el => (this.textareaElement = el),
          placeholder: t('Comment'),
          value: comment,
          onInput: this.handleCommentInput
        })
      )
    )
  }
}
