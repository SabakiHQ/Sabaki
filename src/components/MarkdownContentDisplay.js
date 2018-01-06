const {h, Component} = require('preact')
const breaks = require('remark-breaks')
const helper = require('../modules/helper')

const ReactMarkdown = require('react-markdown')
const ContentDisplay = require('./ContentDisplay')

function htmlify(children) {
    return children.map(child => {
        if (typeof child !== 'string') return child

        return h(ContentDisplay, {
            tag: 'span',
            content: child
        })
    })
}

function Paragraph({children}) {
    return h('p', {}, htmlify(children))
}

function Link({href, title, children}) {
    if (href.match(/^((ht|f)tps?:\/\/|mailto:)/) == null) 
        return h('span', {}, children)

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
    render({source}) {
        return h(ReactMarkdown, {
            source,
            plugins: [breaks],
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
    }
}

module.exports = MarkdownContentDisplay
