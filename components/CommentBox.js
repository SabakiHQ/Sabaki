const {h, Component} = require('preact')

class CommentBox extends Component {
    render({height}) {
        return h('section',
            {
                id: 'properties',
                style: {
                    height: height + '%'
                }
            },

            h('div', {class: 'horizontalresizer'}),

            h('div', {class: 'inner'},
                h('p', {class: 'header'},
                    h('img', {
                        width: 16,
                        height: 16,
                        class: 'positionstatus'
                    }),
                    h('img', {
                        width: 16,
                        height: 16,
                        class: 'movestatus'
                    }),

                    h('img', {
                        src: './node_modules/octicons/build/svg/pencil.svg',
                        class: 'edit-button',
                        title: 'Edit',
                        width: 16,
                        height: 16
                    }),

                    h('span')
                ),
                h('div', {class: 'comment'})
            ),

            h('div', {class: 'edit'},
                h('div', {class: 'header'},
                    h('img', {
                        src: './node_modules/octicons/build/svg/chevron-down.svg',
                        width: 16,
                        height: 16
                    }),

                    h('div', {},
                        h('input', {type: 'text', name: 'title', value: '', placeholder: 'Title'})
                    )
                ),

                h('textarea', {placeholder: 'Comment'})
            )
        )
    }
}

module.exports = CommentBox
