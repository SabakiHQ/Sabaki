const {h, Component} = require('preact')
const breaks = require('remark-breaks')
const helper = require('../modules/helper')

const ReactMarkdown = require('react-markdown')
const ContentDisplay = require('./ContentDisplay')

function typographer(children) {
    if (typeof children === 'string') {
        return helper.typographer(children)
    }

    return children.map(child => {
        if (typeof child !== 'string') return child
        return typographer(child)
    })
}

function htmlify(children) {
    return children.map(child => {
        if (typeof child !== 'string') return child

        return h(ContentDisplay, {
            tag: 'span',
            content: typographer(child)
        })
    })
}

function Paragraph({children}) {
    return h('p', {}, htmlify(children))
}

function Emphasis({children}) {
    return h('em', {}, htmlify(children))
}

function Strong({children}) {
    return h('strong', {}, htmlify(children))
}

function Delete({children}) {
    return h('del', {}, htmlify(children))
}

function Link({href, title, children}) {
    if (href.match(/^((ht|f)tps?:\/\/|mailto:)/) == null) 
        return h('span', {}, typographer(children))

    return h('a', {class: 'external', href, title}, typographer(children))
}

function Image({src, alt}) {
    return h(Link, {href: src}, typographer(alt))
}

function ListItem({children}) {
    return h('li', {}, htmlify(children))
}

function Heading({level, children}) {
    return h(`h${level}`, {}, typographer(children))
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
                emphasis: Emphasis,
                strong: Strong,
                delete: Delete,
                link: Link,
                image: Image,
                linkReference: Link,
                imageReference: Image,
                table: null,
                listItem: ListItem,
                heading: Heading,
                code: Paragraph,
                html: Html
            }
        })
    }
}

module.exports = MarkdownContentDisplay
