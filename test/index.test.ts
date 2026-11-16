import { test } from 'node:test'
import assert from 'node:assert/strict'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { toHast } from 'mdast-util-to-hast'
import remarkArbitraryDelimiter, { type Options } from '../src/index.ts'

/**
 * Parse markdown, run the plugin, and return the hast tree.
 */
function run(markdown: string, options: Options) {
  const processor = unified().use(remarkParse).use(remarkArbitraryDelimiter, options)
  const tree = processor.runSync(processor.parse(markdown))
  return toHast(tree)
}

/**
 * Render the hast tree to JSON for easy assertions.
 */
function html(markdown: string, options: Options) {
  return JSON.stringify(run(markdown, options))
}

test('wraps a single delimiter pair', () => {
  const out = html('::Am::azing', { delimiter: '::', className: 'chord' })
  assert.match(out, /"tagName":"span"/)
  assert.match(out, /"className":"chord"/)
  assert.match(out, /"value":"Am"/)
})

test('wraps multiple pairs on one line', () => {
  const out = html('::G::the ::Bm::end', { delimiter: '::', className: 'chord' })
  const matches = out.match(/"className":"chord"/g) ?? []
  assert.equal(matches.length, 2)
})

test('leaves plain text untouched', () => {
  const out = html('no delimiters here', { delimiter: '::', className: 'chord' })
  assert.doesNotMatch(out, /"className":"chord"/)
})

test('uses a custom element', () => {
  const out = html('%%marked%%', { delimiter: '%%', className: 'hl', element: 'mark' })
  assert.match(out, /"tagName":"mark"/)
})

test('merges extra hProperties', () => {
  const out = html('::x::', {
    delimiter: '::',
    className: 'chord',
    hProperties: { 'data-kind': 'note' }
  })
  assert.match(out, /"data-kind":"note"/)
})

test('supports multi-character delimiters', () => {
  const out = html('%%note%%', { delimiter: '%%', className: 'note' })
  assert.match(out, /"className":"note"/)
})

test('escaped delimiter stays literal', () => {
  // Feed the plugin a raw ast text node so the delimiter's leading escape
  // character survives. (In markdown source, CommonMark itself consumes one
  // backslash before the plugin runs, so authors write a double backslash.)
  const tree = {
    type: 'root',
    children: [
      { type: 'paragraph', children: [{ type: 'text', value: '\\::not a chord::' }] }
    ]
  }
  unified().use(remarkArbitraryDelimiter, { delimiter: '::', className: 'chord' }).runSync(tree)
  const paragraph = tree.children[0] as { children: Array<{ data?: unknown }> }
  const wrapped = paragraph.children.some((child) => child.data !== undefined)
  assert.equal(wrapped, false)
})

test('empty pair is left as text', () => {
  const out = html('::::', { delimiter: '::', className: 'chord' })
  assert.doesNotMatch(out, /"className":"chord"/)
})

test('does not match across lines', () => {
  const out = html('::start\nend::', { delimiter: '::', className: 'chord' })
  assert.doesNotMatch(out, /"className":"chord"/)
})

test('throws without a delimiter', () => {
  assert.throws(
    () =>
      unified()
        .use(remarkParse)
        .use(remarkArbitraryDelimiter, {} as never)
        .runSync({ type: 'root', children: [] }),
    /delimiter/
  )
})

test('works in headings and lists', () => {
  const out = html('# ::H::\n\n- ::L::', { delimiter: '::', className: 'chord' })
  const matches = out.match(/"className":"chord"/g) ?? []
  assert.equal(matches.length, 2)
})
