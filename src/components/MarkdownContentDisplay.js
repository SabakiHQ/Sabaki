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
        table: Table,
        listItem: ListItem,
        heading: Heading,
        code: Paragraph,
        html: Html
      }
    })
  }
}

export default MarkdownContentDisplay
