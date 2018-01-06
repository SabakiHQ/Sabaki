const {h, Component} = require('preact')
const breaks = require('remark-breaks')
const helper = require('../modules/helper')

const ReactMarkdown = require('react-markdown')
const ContentDisplay = require('./ContentDisplay')

function htmlify(children) {
    return children.map(child => {
        if (typeof child !== 'string') return child

        return h('span', {
            dangerouslySetInnerHTML: {
                __html: helper.htmlify(
                    child.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                )
            }
        })
    })
}

function Paragraph({children}) {
    return h('p', {}, htmlify(children))
}

function Link({href, title, children}) {
    if (href.match(/^((ht|f)tps?:\/\/|mailto:)/) == null) return null

    return h('a', {class: 'external', href, title}, children)
}

function Image({src, alt}) {
    return h(Link, {href: src}, alt)
}

function ListItem({children}) {
    return h('li', {}, htmlify(children))
}

function Html({isBlock, value}) {
    return h(isBlock ? Paragraph : 'span', {}, value)
}

class MarkdownContentDisplay extends Component {
    render({board, source}) {
        return h(ContentDisplay, {tag: 'div', board}, 
            h(ReactMarkdown, {
                source,
                plugins: [breaks],
                escapeHtml: true,
                renderers: {
                    paragraph: Paragraph,
                    link: Link,
                    image: Image,
                    linkReference: Link,
                    imageReference: Image,
                    table: null,
                    listItem: ListItem,
                    code: Paragraph,
                    html: Html
                }
            })
        )
    }
}

module.exports = MarkdownContentDisplay
