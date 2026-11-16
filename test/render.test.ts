import { test } from 'node:test'
import assert from 'node:assert/strict'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import remarkArbitraryDelimiter from '../src/index.ts'
import type { Options } from '../src/index.ts'

/**
 * Full mdast -> hast -> HTML round trip.
 */
async function render(markdown: string, options: Options): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkArbitraryDelimiter, options)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdown)

  return String(file).trim()
}

test('renders a span with a class', async () => {
  const out = await render('::Am::azing', { delimiter: '::', className: 'chord' })
  assert.equal(out, '<p><span class="chord">Am</span>azing</p>')
})

test('renders multiple wrappers on one line', async () => {
  const out = await render('::G::the ::Bm::end', {
    delimiter: '::',
    className: 'chord'
  })
  assert.equal(
    out,
    '<p><span class="chord">G</span>the <span class="chord">Bm</span>end</p>'
  )
})

test('renders a custom element', async () => {
  const out = await render('%%note%%', {
    delimiter: '%%',
    className: 'mark',
    element: 'mark'
  })
  assert.equal(out, '<p><mark class="mark">note</mark></p>')
})

test('renders extra attributes', async () => {
  const out = await render('::x::', {
    delimiter: '::',
    className: 'term',
    hProperties: { 'data-kind': 'glossary' }
  })
  assert.match(out, /class="term"/)
  assert.match(out, /data-kind="glossary"/)
})

test('escapes markup characters inside the wrapper', async () => {
  const out = await render('::a & b < c::', {
    delimiter: '::',
    className: 'safe'
  })
  assert.match(out, /<span class="safe">/)
  // The characters are escaped, not emitted raw.
  assert.match(out, /&#x26;|&amp;/)
  assert.match(out, /&#x3C;|&lt;/)
  assert.doesNotMatch(out, /< c/)
})

test('leaves code blocks untouched', async () => {
  const out = await render('```\n::Am::\n```', {
    delimiter: '::',
    className: 'chord'
  })
  assert.match(out, /<code>/)
  assert.doesNotMatch(out, /class="chord"/)
})

test('leaves inline code untouched', async () => {
  const out = await render('`::Am::`', { delimiter: '::', className: 'chord' })
  assert.doesNotMatch(out, /class="chord"/)
})

test('double backslash escapes a delimiter in markdown source', async () => {
  // CommonMark consumes one backslash, so the plugin sees `\::...::`.
  const out = await render('\\\\::literal::', {
    delimiter: '::',
    className: 'chord'
  })
  assert.doesNotMatch(out, /class="chord"/)
})

test('works inside headings and lists', async () => {
  const out = await render('# ::H::\n\n- ::L::', {
    delimiter: '::',
    className: 'chord'
  })
  assert.match(out, /<h1><span class="chord">H<\/span><\/h1>/)
  assert.match(out, /<li><span class="chord">L<\/span><\/li>/)
})
