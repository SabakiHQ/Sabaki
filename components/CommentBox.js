const {h, Component} = require('preact')

const boardmatcher = require('../modules/boardmatcher')
const gametree = require('../modules/gametree')
const helper = require('../modules/helper')
const setting = require('../modules/setting')
const sgf = require('../modules/sgf')

class CommentBox extends Component {
    constructor(props) {
        super()

        this.shapes = boardmatcher.readShapes(__dirname + '/../data/shapes.sgf')
    }

    shouldComponentUpdate() {
        return !this.dirty
    }

    componentWillReceiveProps() {
        // Debounce rendering
        
        this.dirty = true

        clearTimeout(this.updateId)
        this.updateId = setTimeout(() => {
            this.dirty = false
            this.setState(this.state)

            this.element.scrollTop = 0
            this.textareaElement.scrollTop = 0
        }, setting.get('graph.delay'))
    }

    getCurrentMoveInterpretation() {
        let [tree, index] = this.props.treePosition
        let board = gametree.getBoard(tree, index)
        let node = tree.nodes[index]

        // Determine root node

        if (!tree.parent && index == 0) {
            let result = []

            if ('EV' in node) result.push(node.EV[0])
            if ('GN' in node) result.push(node.GN[0])

            result = result.filter(x => x.trim() != '').join(' — ')
            if (result != '')
                return result

            let today = new Date()
            if (today.getDate() == 25 && today.getMonth() == 3)
                return 'Happy Birthday, Sabaki!'
        }

        // Determine end of main variation and show game result

        if (gametree.onMainTrack(tree) && !gametree.navigate(tree, index, 1)) {
            let rootNode = gametree.getRoot(tree).nodes[0]

            if ('RE' in rootNode && rootNode.RE[0].trim() != '')
                return 'Result: ' + rootNode.RE[0]
        }

        // Determine capture

        let ptp = gametree.navigate(tree, index, -1)

        if (ptp) {
            let prevBoard = ptp[0].nodes[ptp[1]].board || gametree.getBoard(...ptp)

            if (!helper.equals(prevBoard.captures, board.captures))
                return 'Take'
        }

        // Get current vertex

        let vertex

        if ('B' in node && node.B[0] != '')
            vertex = sgf.point2vertex(node.B[0])
        else if ('W' in node && node.W[0] != '')
            vertex = sgf.point2vertex(node.W[0])
        else if ('W' in node || 'B' in node)
            return 'Pass'
        else
            return ''

        if (!board.hasVertex(vertex)) return 'Pass'

        let sign = board.get(vertex)
        let neighbors = board.getNeighbors(vertex)

        // Check atari

        if (neighbors.some(v => board.get(v) == -sign && board.getLiberties(v).length == 1))
            return 'Atari'

        // Check connection

        let friendly = neighbors.filter(v => board.get(v) == sign)
        if (friendly.length == neighbors.length) return 'Fill'
        if (friendly.length >= 2) return 'Connect'

        // Match shape

        for (let shape of this.shapes) {
            if ('size' in shape && (board.width != board.height || board.width != shape.size))
                continue

            let corner = 'type' in shape && shape.type == 'corner'

            if (boardmatcher.shapeMatch(shape, board, vertex, corner))
                return shape.name
        }

        if (friendly.length == 1) return 'Stretch'

        // Determine position to edges

        if (vertex[0] == (board.width - 1) / 2 && vertex[1] == (board.height - 1) / 2)
            return 'Tengen'

        let diff = board.getCanonicalVertex(vertex).map(x => x + 1)

        if ((diff[0] != 4 || diff[1] != 4)
        && board.getHandicapPlacement(9).some(v => helper.shallowEquals(v, vertex)))
            return 'Hoshi'

        if (diff[1] <= 6)
            return diff.join('-') + ' point'

        return ''
    }

    render({
        height,
        moveAnnotation: [ma, mv],
        positionAnnotation: [pa, pv],
        title,
        comment
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

        return h('section',
            {
                ref: el => this.element = el,
                id: 'properties',
                style: {
                    height: height + '%'
                }
            },

            h('div', {class: 'horizontalresizer'}),

            h('div', {class: 'inner'},
                h('p',
                    {
                        class: {
                            header: true,
                            movestatus: ma != null,
                            positionstatus: pa != null
                        }
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
                        height: 16
                    }),

                    h('span', {}, title != '' ? title
                        : showMoveInterpretation ? this.getCurrentMoveInterpretation()
                        : '')
                ),
                h('div', {
                    class: 'comment',
                    dangerouslySetInnerHTML: {__html: helper.markdown(comment)}
                })
            ),

            h('div', {class: 'edit'},
                h('div', {class: 'header'},
                    h('img', {
                        src: './node_modules/octicons/build/svg/chevron-down.svg',
                        width: 16,
                        height: 16
                    }),

                    h('div', {},
                        h('input', {type: 'text', name: 'title', value: title, placeholder: 'Title'})
                    )
                ),

                h('textarea', {
                    ref: el => this.textareaElement = el,
                    placeholder: 'Comment'
                }, comment)
            )
        )
    }
}

module.exports = CommentBox
