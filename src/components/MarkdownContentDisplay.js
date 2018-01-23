const {h, Component} = require('preact')
const breaks = require('remark-breaks')
const helper = require('../modules/helper')

const ReactMarkdown = require('react-markdown')
const ContentDisplay = require('./ContentDisplay')

function typographer(children) {
    if (!Array.isArray(children)) {
        return typographer([children])[0]
    }

    return children.map(child => {
        if (typeof child !== 'string') return child
        return helper.typographer(child)
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

const generateBasicComponent = tag => ({children}) => h(tag, {}, htmlify(children))

const Emphasis = generateBasicComponent('em')
const Strong = generateBasicComponent('strong')
const Delete = generateBasicComponent('del')
const ListItem = generateBasicComponent('li')

function Paragraph({children}) {
    return h('p', {}, htmlify(children))
}

function Link({href, title, children}) {
    if (href.match(/^((ht|f)tps?:\/\/|mailto:)/) == null)
        return h('span', {}, typographer(children))

    return h(ContentDisplay, {}, h('a', {class: 'external', href, title}, typographer(children)))
}

function Image({src, alt}) {
    return h(Link, {href: src}, typographer(alt))
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
