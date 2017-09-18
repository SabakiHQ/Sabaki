const {remote} = require('electron')
const {h, Component} = require('preact')
const classNames = require('classnames')
const ContentDisplay = require('./ContentDisplay')

const boardmatcher = require('../modules/boardmatcher')
const gametree = require('../modules/gametree')
const helper = require('../modules/helper')
const setting = remote.require('./setting')
const {sgf} = require('../modules/fileformats')
const Board = require('../modules/board')

class CommentTitle extends Component {
    constructor() {
        super()

        this.handleEditButtonClick = () => sabaki.setMode('edit')
    }

    shouldComponentUpdate({treePosition, moveAnnotation, positionAnnotation, title}) {
        let [tree, index] = treePosition

        return title !== this.props.title
            // First node
            || !tree.parent && index === 0
            // Last node
            || tree.subtrees.length === 0 && index === tree.nodes.length - 1
            // Other data changed
            || treePosition !== this.props.treePosition
            || !helper.vertexEquals(moveAnnotation, this.props.moveAnnotation)
            || !helper.vertexEquals(positionAnnotation, this.props.positionAnnotation)
    }

    getCurrentMoveInterpretation() {
        let {treePosition: [tree, index], board} = this.props
        let node = tree.nodes[index]

        // Determine root node

        if (!tree.parent && index === 0) {
            let result = []

            if ('EV' in node) result.push(node.EV[0])
            if ('GN' in node) result.push(node.GN[0])

            result = result.filter(x => x.trim() !== '').join(' — ')
            if (result !== '')
                return result

            let today = new Date()
            if (today.getDate() === 25 && today.getMonth() === 3)
                return 'Happy Birthday, Sabaki!'
        }

        // Determine end of main variation and show game result

        if (tree.subtrees.length === 0
        && index === tree.nodes.length - 1
        && gametree.onMainTrack(tree)) {
            let rootNode = gametree.getRoot(tree).nodes[0]

            if ('RE' in rootNode && rootNode.RE[0].trim() !== '')
                return 'Result: ' + rootNode.RE[0]
        }

        // Determine capture

        let ptp = gametree.navigate(tree, index, -1)

        if (ptp) {
            let prevBoard = ptp[0].nodes[ptp[1]].board || gametree.getBoard(...ptp)

            if (!helper.vertexEquals(prevBoard.captures, board.captures))
                return 'Take'
        }

        // Get current vertex

        let vertex

        if ('B' in node && node.B[0] !== '')
            vertex = sgf.point2vertex(node.B[0])
        else if ('W' in node && node.W[0] !== '')
            vertex = sgf.point2vertex(node.W[0])
        else if ('W' in node || 'B' in node)
            return 'Pass'
        else
            return ''

        return boardmatcher.getMoveInterpretation(board, vertex) || ''
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

            h('span', {}, title !== '' ? title
                : showMoveInterpretation ? this.getCurrentMoveInterpretation()
                : '')
        )
    }
}

class CommentText extends Component {
    shouldComponentUpdate({board, comment}) {
        return comment !== this.props.comment
            || board.width !== this.props.board.width
            || board.height !== this.props.board.height
    }

    render({board, comment}) {
        return h('div', {
            ref: el => this.element = el,
            class: 'comment'
        }, h(ContentDisplay, {
            tag: 'div',
            board,
            dangerouslySetInnerHTML: {__html: helper.markdown(comment)}
        }))
    }
}

class CommentBox extends Component {
    constructor(props) {
        super()

        this.state = {
            board: new Board()
        }

        this.handleCommentInput = () => {
            let {onCommentInput = helper.noop} = this.props

            onCommentInput({
                title: this.titleInputElement.value,
                comment: this.textareaElement.value
            })
        }

        this.handleMenuButtonClick = () => {
            let {left, bottom} = this.menuButtonElement.getBoundingClientRect()

            sabaki.openCommentMenu(...this.props.treePosition, {
                x: Math.round(left),
                y: Math.round(bottom)
            })
        }
    }

    shouldComponentUpdate({showCommentBox, height}) {
        return height !== this.props.height || showCommentBox && !this.dirty
    }

    componentWillReceiveProps({treePosition, mode}) {
        if (mode === 'edit') return

        // Debounce rendering

        this.dirty = true

        let treePositionChanged = treePosition !== this.props.treePosition

        clearTimeout(this.updateId)
        this.updateId = setTimeout(() => {
            this.dirty = false

            if (treePositionChanged) {
                this.setState({
                    board: gametree.getBoard(...this.props.treePosition)
                })

                if (this.props.mode === 'edit') {
                    this.element.scrollTop = 0
                    if (treePositionChanged) this.textareaElement.scrollTop = 0
                }

                this.element.scrollTop = 0
            } else {
                this.setState(this.state)
            }
        }, setting.get('graph.delay'))
    }

    render({
        treePosition,
        height,
        sidebarSplitTransition,
        moveAnnotation,
        positionAnnotation,
        title,
        comment,

        onResizerMouseDown = helper.noop,
        onLinkClick = helper.noop,
        onCoordinateMouseEnter = helper.noop,
        onCoordinateMouseLeave = helper.noop
    }, {
        board
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
                    board,
                    treePosition,
                    moveAnnotation,
                    positionAnnotation,
                    title
                }),

                h(CommentText, {
                    board,
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
