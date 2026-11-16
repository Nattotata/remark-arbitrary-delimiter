# remark-arbitrary-delimiter

[![npm](https://img.shields.io/npm/v/remark-arbitrary-delimiter.svg)](https://www.npmjs.com/package/remark-arbitrary-delimiter)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

A [**remark**][remark] plugin that wraps text between **arbitrary delimiters**
in an element with a CSS class.

It's like a custom strong emphasis,
inline, single-line-only
but it wraps around plain text rather than parsed markdown,
so ::**bold**:: stays literal.

```md
::D#::I smell a ::D::fellow..  

::G::Rhino,  

On a ::D#::beach and it's ::D::drown  

::G::Trauma tone ::D#::pushing through its ::D::horn  

::D#::Treated with ::A#::leftover liquid  

::F::Trainin' the ::C::sun to fall down  
```

```html
<p><span class="chord">D#</span>I smell a <span class="chord">D</span>fellow..</p>  
```

Pick any delimiter you like
and any class or element you want.

I use it for precise placement of chords with ::foo:: delimiter.

Most non-reserved stuff should work as delimiters ($$foo$$ !!baz!!, 🙈bar🙈),
but there's gotta be a way to break things,
so be careful.

## Why

I couldn't find anything flexible enough in the existing ecosystem.  
And I wanted to learn more about the markdown ast.

## Install

```sh
npm install remark-arbitrary-delimiter
```

This package is ESM only and requires Node 18+.

## Use

```js
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import remarkArbitraryDelimiter from 'remark-arbitrary-delimiter'

const file = await unified()
  .use(remarkParse)
  .use(remarkArbitraryDelimiter, { delimiter: '::', className: 'chord' })
  .use(remarkRehype)
  .use(rehypeStringify)
  .process('::Gsus4::tadaa::G::')

console.log(String(file))
// <p><span class="chord">Gsus4</span>tadaa<span class="chord">G</span></p>
```

### mdsvex

```js
// svelte.config.js
import { mdsvex } from 'mdsvex'
import remarkArbitraryDelimiter from 'remark-arbitrary-delimiter'

export default {
  preprocess: [
    mdsvex({
      remarkPlugins: [
        [remarkArbitraryDelimiter, { delimiter: '::', className: 'chord' }]
      ]
    })
  ]
}
```

Then style `.chord` however you like:

```css
.chord {
  color: rebeccapurple;
  position: absolute;
  top: -1em;
}
```

## Options

| Option        | Type                       | Default         | Description                                        |
| ------------- | -------------------------- | --------------- | -------------------------------------------------- |
| `delimiter`   | `string` **(required)**    | —               | The delimiter around the text. Any string works.   |
| `className`   | `string`                   | `'delimiter'`   | CSS class added to the wrapper.                    |
| `element`     | `string`                   | `'span'`        | Wrapper element: `mark`, `em`, `kbd`, …            |
| `hProperties` | `Record<string, unknown>`  | `{}`            | Extra attributes merged into the wrapper.          |
| `escape`      | `string`                   | `'\\'`          | Escape character.                                  |

```js
// Semantic highlight instead of a span.
remarkArbitraryDelimiter({
  delimiter: '%%',
  className: 'highlight',
  element: 'mark'
})

// Carry extra data attributes.
remarkArbitraryDelimiter({
  delimiter: '::',
  className: 'term',
  hProperties: { 'data-kind': 'glossary' }
})
```

### Escaping

A delimiter preceded by the escape character is treated as literal text:

```md
\\::not wrapped::
```

Because CommonMark itself consumes a single backslash, you write a **double
backslash** in `.md` source. (At the AST level the plugin sees `\::`, which is
what the `escape` option matches.)

## Behaviour

- Matches only within a single line. A delimiter pair spanning a line break
  is left alone.
- Empty pairs (`::::`) are left as text.
- Multiple pairs on one line are all wrapped.
- Wrapping works inside headings, lists, blockquotes, tables, etc., because
  the plugin operates on every `text` node in the tree.
- It does **not** process inside code blocks or inline code — those are not
  `text` nodes, so they are untouched.
- It is a remark transform, not a micromark syntax extension. Editors will
  not highlight your delimiter; it is applied at compile time.

## Compatibility

This is a standard [unified][]/remark plugin, so it works anywhere a remark
plugin is accepted, including **mdsvex**, **Astro**,
**Nuxt Content**, **VitePress**, **Docusaurus**, **react-markdown** and
direct `unified` pipelines.

## Development

```sh
npm install
npm test        # node:test
npm run build   # emit dist/
```

## License

[MIT](./LICENSE)

[remark]: https://github.com/remarkjs/remark
[unified]: https://github.com/unifiedjs/unified
