const {remote, shell} = require('electron')
const {h, Component} = require('preact')
const classNames = require('classnames')
const boardmatcher = require('@sabaki/boardmatcher')
const sgf = require('@sabaki/sgf')

const MarkdownContentDisplay = require('./MarkdownContentDisplay')

const gametree = require('../modules/gametree')
const helper = require('../modules/helper')
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

    shouldComponentUpdate({gameTree, treePosition, moveAnnotation, positionAnnotation, title}) {
        return title !== this.props.title
            || gameTree !== this.props.gameTree
            || treePosition !== this.props.treePosition
            || !helper.vertexEquals(moveAnnotation, this.props.moveAnnotation)
            || !helper.vertexEquals(positionAnnotation, this.props.positionAnnotation)
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
            if (result !== '') return result

            let today = new Date()
            if (today.getDate() === 25 && today.getMonth() === 3)
                return 'Happy Birthday, Sabaki!'

            return ''
        }

        // Determine end of main variation and show game result

        if (node.children.length === 0 && gameTree.onMainLine(treePosition)) {
            let result = gametree.getRootProperty(gameTree, 'RE', '')
            if (result.trim() !== '') return `Result: ${result}`
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
        let patternMatch = boardmatcher.findPatternInMove(prevBoard.arrangement, sign, vertex)
        if (patternMatch == null) return null

        let board = gametree.getBoard(gameTree, treePosition)
        let matchedVertices = [...patternMatch.match.anchors, ...patternMatch.match.vertices]
            .filter(v => board.get(v) !== 0)

        return [
            helper.typographer(patternMatch.pattern.name), ' ',

            patternMatch.pattern.url && h('a',
                {
                    class: 'help',
                    href: patternMatch.pattern.url,
                    title: 'View article on Sensei’s Library',
                    'data-vertices': JSON.stringify(matchedVertices),

                    onClick: this.handleMoveNameHelpClick,
                    onMouseEnter: this.handleMoveNameHelpMouseEnter,
                    onMouseLeave: this.handleMoveNameHelpMouseLeave
                },

                h('img', {src: './node_modules/octicons/build/svg/question.svg', width: 16, height: 16})
            )
        ]
    }

    render({
        moveAnnotation: [ma, mv],
        positionAnnotation: [pa, pv],
        title
    }) {
        let moveData = {
            '-1': ['Bad move', 'badmove'],
            '0': ['Doubtful move', 'doubtfulmove'],
            '1': ['Interesting move', 'interestingmove'],
            '2': ['Good move', 'goodmove']
        }

        if (mv > 1) {
            for (let s in moveData) {
                moveData[s][0] = 'Very ' + moveData[s][0].toLowerCase()
            }
        }

        let positionData = {
            '-1': ['Good for white', 'white'],
            '0': ['Even position', 'balance'],
            '1': ['Good for black', 'black'],
            '-2': ['Unclear position', 'unclear']
        }

        if (pv > 1) {
            for (let s in positionData) {
                positionData[s][0] = 'Very ' + positionData[s][0].toLowerCase()
            }
        }

        let showMoveInterpretation = setting.get('comments.show_move_interpretation')

        return h('p',
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
                src: './node_modules/octicons/build/svg/pencil.svg',
                class: 'edit-button',
                title: 'Edit',
                width: 16,
                height: 16,
                onClick: this.handleEditButtonClick
            }),

            h('span', {},
                title !== '' ? helper.typographer(title)
                : showMoveInterpretation ? this.getCurrentMoveInterpretation()
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
        return h('div',
            {
                ref: el => this.element = el,
                class: 'comment'
            },

            h(MarkdownContentDisplay, {source: comment})
        )
    }
}

class CommentBox extends Component {
    constructor(props) {
        super(props)

        this.state = {
            title: '',
            comment: ''
        }

        this.handleCommentInput = () => {
            let {onCommentInput = helper.noop} = this.props

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
            let {gameTree, treePosition} = this.props

            sabaki.openCommentMenu(gameTree, treePosition, {x: left, y: bottom})
        }
    }

    shouldComponentUpdate({showCommentBox, height}) {
        return height !== this.props.height || showCommentBox && !this.dirty
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

    render({
        gameTree,
        treePosition,
        height,
        sidebarSplitTransition,
        moveAnnotation,
        positionAnnotation,

        onResizerMouseDown = helper.noop,
        onLinkClick = helper.noop,
        onCoordinateMouseEnter = helper.noop,
        onCoordinateMouseLeave = helper.noop
    }, {
        title,
        comment
    }) {
        return h('section',
            {
                ref: el => this.element = el,
                id: 'properties',
                style: {
                    transition: sidebarSplitTransition ? null : 'none',
                    height: height + '%'
                }
            },

            h('div', {
                class: 'horizontalresizer',
                onMouseDown: onResizerMouseDown
            }),

            h('div', {class: 'inner'},
                h(CommentTitle, {
                    gameTree,
                    treePosition,
                    moveAnnotation,
                    positionAnnotation,
                    title
                }),

                h(CommentText, {
                    comment,
                    onLinkClick,
                    onCoordinateMouseEnter,
                    onCoordinateMouseLeave
                })
            ),

            h('div', {class: 'edit'},
                h('div', {class: 'header'},
                    h('img', {
                        ref: el => this.menuButtonElement = el,
                        src: './node_modules/octicons/build/svg/chevron-down.svg',
                        width: 16,
                        height: 16,
                        onClick: this.handleMenuButtonClick
                    }),

                    h('div', {},
                        h('input', {
                            ref: el => this.titleInputElement = el,
                            type: 'text',
                            name: 'title',
                            value: title,
                            placeholder: 'Title',
                            onInput: this.handleCommentInput
                        })
                    )
                ),

                h('textarea', {
                    ref: el => this.textareaElement = el,
                    placeholder: 'Comment',
                    value: comment,
                    onInput: this.handleCommentInput
                })
            )
        )
    }
}

module.exports = CommentBox
