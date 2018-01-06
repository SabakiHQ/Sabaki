const {h, Component} = require('preact')

const ReactMarkdown = require('react-markdown')
const ContentDisplay = require('./ContentDisplay')

let Paragraph = ({children}) => h('p', {}, children)
let Image = ({src, alt}) => h('a', {href: src}, alt)

class MarkdownContentDisplay extends Component {
    render({board, source}) {
        return h(ReactMarkdown, {
            source,
            escapeHtml: true,
            renderers: {
                root: ({children}) => h(ContentDisplay, {tag: 'div', board}, children),
                paragraph: Paragraph,
                image: Image,
                imageReference: Image,
                table: null,
                code: Paragraph
            }
        })
    }
}

module.exports = MarkdownContentDisplay
