const {h, Component} = require('preact')
const setting = require('../modules/setting')

const GameGraph = require('./GameGraph')
const CommentBox = require('./CommentBox')

class Sidebar extends Component {
    constructor() {
        super()

        this.state = {
            sidebarSplit: setting.get('view.properties_height')
        }

        this.handleGraphNodeClick = evt => {
            if (evt.button === 0) {
                sabaki.setCurrentTreePosition(...evt.treePosition)
            }
        }
    }

    render({
        treePosition,
        board,

        showGameGraph,
        showCommentBox,
        sidebarWidth,
        autoscrolling
    }, {sidebarSplit}) {
        let [tree, index] = treePosition
        let node = tree.nodes[index]

        return h('section',
            {
                id: 'sidebar',
                style: {width: sidebarWidth}
            },

            h('div', {class: 'verticalresizer'}),

            h(GameGraph, {
                treePosition,
                showGameGraph,
                viewportWidth: sidebarWidth,
                height: !showGameGraph ? 0
                    : !showCommentBox ? 100 : 100 - sidebarSplit,

                onNodeClick: this.handleGraphNodeClick
            }),

            h(CommentBox, {
                board,
                treePosition,
                moveAnnotation: 'BM' in node ? [-1, node.BM[0]]
                    : 'TE' in node ? [2, node.TE[0]]
                    : 'DO' in node ? [0, 1]
                    : 'IT' in node ? [1, 1]
                    : [null, 1],
                positionAnnotation: 'UC' in node ? [-2, node.UC[0]]
                    : 'GW' in node ? [-1, node.GW[0]]
                    : 'DM' in node ? [0, node.DM[0]]
                    : 'GB' in node ? [1, node.GB[0]]
                    : [null, 1],
                title: 'N' in node ? node.N[0].trim() : '',
                comment: 'C' in node ? node.C[0] : '',
                height: !showCommentBox ? 0
                    : !showGameGraph ? 100 : sidebarSplit
            })
        )
    }
}

module.exports = Sidebar
