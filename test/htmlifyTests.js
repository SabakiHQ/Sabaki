import assert from 'assert'

import {escapeHtml, htmlify} from '../src/modules/htmlify.js'

// ContentDisplay renders escapeHtml() and then htmlify() as inner HTML.
function render(content) {
  return htmlify(escapeHtml(content))
}

// Return the attribute names of every opening <a> tag, as a browser parses
// double-quoted attributes.
function anchorAttributes(html) {
  return [...html.matchAll(/<a\b([^>]*)>/g)].map(([, attrs]) =>
    [...attrs.matchAll(/([^\s=]+)\s*=\s*"[^"]*"/g)].map(([, name]) => name),
  )
}

describe('htmlify', () => {
  it('turns a plain URL into a link', () => {
    assert.strictEqual(
      render('see https://sabaki.yichuanshen.de/ now'),
      'see <a href="https://sabaki.yichuanshen.de/" class="comment-external">https://sabaki.yichuanshen.de/</a> now',
    )
  })

  it('turns an email address into a mailto link', () => {
    assert.strictEqual(
      render('mail me@example.com'),
      'mail <a href="mailto:me@example.com" class="comment-external">me@example.com</a>',
    )
  })

  it('keeps a URL with a query string intact', () => {
    assert.strictEqual(
      render('http://example.com/?a=1&b=2'),
      '<a href="http://example.com/?a=1&amp;b=2" class="comment-external">http://example.com/?a=1&amp;b=2</a>',
    )
  })

  it('does not let a double quote in a URL close the href', () => {
    let html = render('http://example.com/"onmouseover="alert(1)"x')

    assert.deepStrictEqual(anchorAttributes(html), [['href', 'class']])
    assert.ok(html.includes('&quot;onmouseover=&quot;alert(1)&quot;x"'))
  })

  it('does not let a double quote in an email address close the href', () => {
    let html = render('a"onmouseover="alert(1)"@example.com')

    assert.deepStrictEqual(anchorAttributes(html), [['href', 'class']])
    assert.ok(html.includes('href="mailto:a&quot;onmouseover=&quot;'))
  })

  it('escapes a single quote in a link target', () => {
    let html = render("http://example.com/it's")

    assert.deepStrictEqual(anchorAttributes(html), [['href', 'class']])
    assert.ok(html.includes('href="http://example.com/it&#39;s"'))
  })

  it('ends a link before a trailing quote', () => {
    assert.strictEqual(
      render('"http://example.com/"'),
      '"<a href="http://example.com/" class="comment-external">http://example.com/</a>"',
    )
  })

  it('escapes ampersands and angle brackets as before', () => {
    assert.strictEqual(escapeHtml('a & b <c> d'), 'a &amp; b &lt;c&gt; d')
    assert.strictEqual(
      render('<script>alert(1)</script>'),
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    )
  })

  it('leaves text without links unchanged', () => {
    assert.strictEqual(render(''), '')
    assert.strictEqual(render('a "quoted" word'), 'a "quoted" word')
  })
})
