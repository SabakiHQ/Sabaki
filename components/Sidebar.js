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
    }

    render({
        treePosition,

        showGameGraph,
        showCommentBox,
        sidebarWidth,
        autoscrolling
    }, {sidebarSplit}) {
        return h('section',
            {
                id: 'sidebar',
                style: {width: sidebarWidth}
            },

            h('div', {class: 'verticalresizer'}),

            h(GameGraph, {
                treePosition,
                viewportWidth: sidebarWidth,
                height: !showGameGraph ? 0
                    : !showCommentBox ? 100 : 100 - sidebarSplit
            }),

            h(CommentBox, {
                treePosition,
                height: !showCommentBox ? 0
                    : !showGameGraph ? 100 : sidebarSplit
            })
        )
    }
}

module.exports = Sidebar
