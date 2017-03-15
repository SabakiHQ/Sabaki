const {h, Component} = require('preact')
const gametree = require('../modules/gametree')

const GameGraph = require('./GameGraph')
const CommentBox = require('./CommentBox')

class Sidebar extends Component {
    render({
        treePosition,

        showGameGraph,
        showCommentBox,
        sidebarWidth,
        sidebarSplit,
        autoscrolling
    }) {
        let [tree, index] = treePosition
        let rootTree = gametree.getRoot(tree)
        let level = gametree.getLevel(...treePosition)
        let height = gametree.getHeight(rootTree)

        return h('section',
            {
                id: 'sidebar',
                style: {width: sidebarWidth}
            },

            h('div', {class: 'verticalresizer'}),

            h(GameGraph, {
                sliderText: level,
                sliderPercent: (level / height) * 100,
                height: !showGameGraph ? 0
                    : !showCommentBox ? 100 : 100 - sidebarSplit
            }),

            h(CommentBox, {
                height: !showCommentBox ? 0
                    : !showGameGraph ? 100 : sidebarSplit
            })
        )
    }
}

module.exports = Sidebar
