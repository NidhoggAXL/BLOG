import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createJiti } from 'jiti'

const jiti = createJiti(import.meta.url, {
  alias: {
    '~': new URL('..', import.meta.url).pathname.replace(/\\/g, '/').replace(/\/$/, '') || '..',
  },
})

const { formatComposeMarkdown } = await jiti.import('../utils/format-compose-markdown.ts')

function norm(s) {
  return s.replace(/\r\n/g, '\n').replace(/\n+$/, '')
}

describe('formatComposeMarkdown', () => {
  it('inserts blank line between consecutive plain text lines', () => {
    const out = formatComposeMarkdown('saldj\ndslfkjs')
    assert.equal(norm(out), 'saldj\n\ndslfkjs')
  })

  it('separates three consecutive paragraphs', () => {
    const out = formatComposeMarkdown('a\nb\nc')
    assert.equal(norm(out), 'a\n\nb\n\nc')
  })

  it('preserves fenced code block inner lines', () => {
    const src = '```js\nvar a = "bb"\n```'
    const out = formatComposeMarkdown(src)
    assert.match(out, /```js\nvar a = "bb"\n```/)
  })

  it('adds blank lines before and after fenced code blocks next to text', () => {
    const out = formatComposeMarkdown('intro\n```js\nvar a = "bb"\n```\noutro')
    assert.match(out, /intro\n\n```js\nvar a = "bb"\n```\n\noutro/)
  })

  it('adds blank line between consecutive fenced code blocks', () => {
    const src = '```c\nint a = "abc";\n```\n```js\nvar a = "aaa"\n```'
    const out = formatComposeMarkdown(src)
    assert.match(out, /```c\nint a = "abc";\n```\n\n```js\nvar a = "aaa"\n```/)
  })

  it('keeps markdown table rows adjacent', () => {
    const src = '| a | b |\n| --- | --- |\n| 1 | 2 |'
    const out = formatComposeMarkdown(src)
    assert.equal(norm(out), norm(src))
  })

  it('keeps consecutive list items without extra blank lines', () => {
    const src = '- one\n- two'
    const out = formatComposeMarkdown(src)
    assert.equal(norm(out), '- one\n- two')
  })

  it('preserves blank line between separate blockquote lines', () => {
    const src = '> sdlfkjs\n\n> sldjkfs'
    const out = formatComposeMarkdown(src)
    assert.equal(norm(out), '> sdlfkjs\n\n> sldjkfs')
  })

  it('preserves blank line between blockquote and callout header', () => {
    const src = '> sdlfjasl\n\n> [!warning]'
    const out = formatComposeMarkdown(src)
    assert.equal(norm(out), '> sdlfjasl\n\n> [!warning]')
  })

  it('preserves blank line between blockquote and callout with body', () => {
    const src = '> sdlfjasl\n\n> [!warning]\n> callout body'
    const out = formatComposeMarkdown(src)
    assert.match(out, /> sdlfjasl\n\n> \[!warning\]/)
  })
})
