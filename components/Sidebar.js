const {h, Component} = require('preact')
const GameGraph = require('./GameGraph')
const CommentBox = require('./CommentBox')

class Sidebar extends Component {
    render({
        showGameTree,
        showCommentBox,
        sidebarWidth,
        sidebarSplit,
        autoscrolling
    }) {
        return h('section',
            {
                id: 'sidebar',
                style: {width: sidebarWidth}
            },

            h('div', {class: 'verticalresizer'}),

            h(GameGraph, {height: 100 - sidebarSplit}),
            h(CommentBox, {height: sidebarSplit})
        )
    }
}

module.exports = Sidebar
