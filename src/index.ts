import { visit } from 'unist-util-visit'
import type { Root, Text, Parent } from 'mdast'
import type { Plugin } from 'unified'

/**
 * Options for {@link remarkArbitraryDelimiter}.
 */
export interface Options {
  /**
   * The delimiter string that wraps the text. May be arbitrary.
   * Every occurrence of `delimiter + text + delimiter` is wrapped.
   *
   * @example '::'
   * @example '%%'
   */
  delimiter: string

  /**
   * CSS class name added to the wrapping element.
   * Defaults to `'delimiter'` when omitted.
   */
  className?: string

  /**
   * HTML element name used for the wrapper. Defaults to `'span'`.
   * Use `'mark'`, `'em'`, `'kbd'`, etc. for semantic elements.
   */
  element?: string

  /**
   * Extra HTML attributes added to the wrapper element, merged with
   * `className`. Values are coerced to strings by the renderer.
   */
  hProperties?: Record<string, unknown>

  /**
   * Escape character used to prevent a delimiter from matching.
   * Defaults to `'\\'`, so `\::text::` stays literal.
   */
  escape?: string
}

/**
 * A remark plugin that finds text wrapped in an arbitrary delimiter and
 * replaces it with an element carrying a CSS class.
 *
 * It emits `hName`/`hProperties` on the mdast node rather than raw HTML, so
 * the output is renderer-agnostic: it works with `remark-rehype`, mdsvex,
 * MDX, `react-markdown`, Astro, Nuxt Content and anything else that walks
 * an mdast tree.
 *
 * @example
 * ```js
 * remarkPlugins: [[remarkArbitraryDelimiter, { delimiter: '::', className: 'chord' }]]
 * ```
 */
const remarkArbitraryDelimiter: Plugin<[Options], Root> = (options) => {
  const {
    delimiter,
    className = 'delimiter',
    element = 'span',
    hProperties = {},
    escape = '\\'
  } = options ?? ({} as Options)

  if (typeof delimiter !== 'string' || delimiter.length === 0) {
    throw new TypeError(
      'remark-arbitrary-delimiter: `delimiter` must be a non-empty string'
    )
  }

  if (typeof element !== 'string' || element.length === 0) {
    throw new TypeError(
      'remark-arbitrary-delimiter: `element` must be a non-empty string'
    )
  }

  if (typeof className !== 'string' || className.length === 0) {
    throw new TypeError(
      'remark-arbitrary-delimiter: `className` must be a non-empty string'
    )
  }

  // Build a "non-greedy, no newline" pattern once per run. Escapes are
  // handled in `splitText`, not in the pattern, so an optional leading
  // escape group cannot backtrack into the next delimiter.
  const pattern = new RegExp(
    `${escapeRegExp(delimiter)}([^\\n]*?)${escapeRegExp(delimiter)}`,
    'g'
  )

  return (tree) => {
    visit(tree, 'text', (node: Text, index, parent: Parent | undefined) => {
      if (index === undefined || parent === undefined) return
      if ((node.data as { hName?: string } | undefined)?.hName) return

      const parts = splitText(node.value, pattern, {
        delimiter,
        element,
        className,
        hProperties,
        escape
      })

      if (parts.length === 1 && parts[0] === node) return

      // `visit` descends into newly inserted nodes, which would re-process
      // the wrappers we just created. Replace the node and skip past the
      // replacement by returning the next index.
      parent.children.splice(index, 1, ...parts)
      return index + parts.length
    })
  }
}

interface WrapperOptions {
  delimiter: string
  element: string
  className: string
  hProperties: Record<string, unknown>
  escape: string
}

/**
 * Split a text node into a sequence of text and wrapper nodes.
 */
function splitText(
  value: string,
  pattern: RegExp,
  options: WrapperOptions
): Array<Text | WrapperNode> {
  const { delimiter, escape } = options
  pattern.lastIndex = 0

  const parts: Array<Text | WrapperNode> = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let wrapped = 0

  while ((match = pattern.exec(value)) !== null) {
    const start = match.index
    const end = start + match[0].length
    const inner = match[1] ?? ''
    const closingStart = end - delimiter.length

    // A delimiter preceded by an odd number of escapes is literal. Either
    // the opening or the closing delimiter being escaped disables the pair.
    if (
      isEscaped(value, start, escape) ||
      isEscaped(value, closingStart, escape)
    ) {
      continue
    }

    if (start > lastIndex) {
      parts.push(text(value.slice(lastIndex, start)))
    }

    if (inner.length > 0) {
      parts.push(wrapper(inner, options))
      wrapped += 1
    }

    lastIndex = end
  }

  if (lastIndex < value.length) {
    parts.push(text(value.slice(lastIndex)))
  }

  // Never wrapped anything: hand the original node back so the caller bails.
  if (wrapped === 0) {
    return [text(value)]
  }

  return parts
}

/**
 * Return `true` when the delimiter at `start` is preceded by an odd number
 * of escape characters (so it should be treated as literal text).
 */
function isEscaped(value: string, start: number, escape: string): boolean {
  if (start < escape.length) return false
  if (value.slice(start - escape.length, start) !== escape) return false

  let count = 0
  let cursor = start
  while (
    cursor >= escape.length &&
    value.slice(cursor - escape.length, cursor) === escape
  ) {
    count += 1
    cursor -= escape.length
  }

  return count % 2 === 1
}

function text(value: string): Text {
  return { type: 'text', value }
}

/**
 * A text node carrying `hName`/`hProperties`, which `remark-rehype` (and
 * MDX/Svelte renderers) understand as "render this as an element".
 */
interface WrapperNode extends Text {
  data: {
    hName: string
    hProperties: Record<string, unknown>
  }
}

function wrapper(value: string, options: WrapperOptions): WrapperNode {
  return {
    type: 'text',
    value,
    data: {
      hName: options.element,
      hProperties: {
        ...options.hProperties,
        className: options.className
      }
    }
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default remarkArbitraryDelimiter
