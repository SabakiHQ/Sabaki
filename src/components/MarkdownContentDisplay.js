import {h, Component, toChildArray} from 'preact'
import breaks from 'remark-breaks'
import * as helper from '../modules/helper.js'

import ReactMarkdown from 'react-markdown'
import ContentDisplay from './ContentDisplay.js'

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
  return toChildArray(children).map(child => {
    if (typeof child !== 'string') return child

    return h(ContentDisplay, {
      tag: 'span',
      content: typographer(child)
    })
  })
}

const generateBasicComponent = tag => ({children}) =>
  h(tag, {}, htmlify(children))

const Emphasis = generateBasicComponent('em')
const Strong = generateBasicComponent('strong')
const Delete = generateBasicComponent('del')
const ListItem = generateBasicComponent('li')
const Table = generateBasicComponent('table')

function Paragraph({children}) {
  return h('p', {}, htmlify(children))
}

function Link({href, title, children}) {
  if (href.match(/^((ht|f)tps?:\/\/|mailto:)/) == null)
    return h('span', {}, typographer(children))

  return h(
    ContentDisplay,
    {},
    h('a', {class: 'comment-external', href, title}, typographer(children))
  )
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
      children: source,
      remarkPlugins: [breaks],
      components: {
        p: Paragraph,
        em: Emphasis,
        strong: Strong,
        del: Delete,
        a: Link,
        img: Image,
        table: Table,
        li: ListItem,
        h1: Heading,
        h2: Heading,
        h3: Heading,
        h4: Heading,
        h5: Heading,
        h6: Heading,
        code: Paragraph,
        html: Html
      }
    })
  }
}

export default MarkdownContentDisplay
