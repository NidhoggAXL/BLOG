import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createJiti } from 'jiti'

const jiti = createJiti(import.meta.url, {
  alias: {
    '~': new URL('..', import.meta.url).pathname.replace(/\\/g, '/').replace(/\/$/, '') || '..',
  },
})

const { parseMarkdownFragmentToHtml, MARKDOWN_OBSIDIAN_LINE_BREAKS } =
  await jiti.import('../utils/markedSetup.ts')

describe('MARKDOWN_OBSIDIAN_LINE_BREAKS', () => {
  it('is enabled (Obsidian 严格换行 off)', () => {
    assert.equal(MARKDOWN_OBSIDIAN_LINE_BREAKS, true)
  })
})

describe('parseMarkdownFragmentToHtml line breaks', () => {
  it('single newline within paragraph becomes <br>', async () => {
    const html = await parseMarkdownFragmentToHtml('line1\nline2')
    assert.match(html, /<br\s*\/?>/i)
    assert.match(html, /line1/)
    assert.match(html, /line2/)
    assert.doesNotMatch(html, /line1\s+line2/)
  })

  it('double newline starts new paragraph', async () => {
    const html = await parseMarkdownFragmentToHtml('para1\n\npara2')
    const ps = html.match(/<p>/g) ?? []
    assert.equal(ps.length, 2)
  })

  it('callout inner body respects single newlines', async () => {
    const { renderMarkdownPipeline } = await jiti.import('../utils/markedSetup.ts')
    const md = '> [!tip] t\n> line1\n> line2'
    const html = await renderMarkdownPipeline(md)
    assert.match(html, /<br\s*\/?>/i)
    assert.match(html, /line1/)
    assert.match(html, /line2/)
  })
})

describe('renderMarkdownPipeline callouts', () => {
  it('renders callout html with emoji icon', async () => {
    const { renderMarkdownPipeline } = await jiti.import('../utils/markedSetup.ts')
    const html = await renderMarkdownPipeline('> [!tip] 你好\n> 正文')
    assert.match(html, /class="md-callout md-callout--tip"/)
    assert.match(html, /md-callout__icon[^>]*>💡</)
    assert.match(html, /正文/)
  })

  it('renders callout when header line contains wikilink', async () => {
    const { renderMarkdownPipeline } = await jiti.import('../utils/markedSetup.ts')
    const md = '> [!note] 见 [[某笔记]]\n> 内容'
    const html = await renderMarkdownPipeline(md)
    assert.match(html, /md-callout--note/)
    assert.match(html, /📝/)
    assert.match(html, /内容/)
  })

  it('renders unknown callout type', async () => {
    const { renderMarkdownPipeline } = await jiti.import('../utils/markedSetup.ts')
    const html = await renderMarkdownPipeline('> [!unknown] 自定义\n> x')
    assert.match(html, /md-callout--unknown/)
    assert.match(html, /自定义/)
  })

  it('renders multiple callouts from acceptance fixture', async () => {
    const { readFileSync } = await import('node:fs')
    const { renderMarkdownPipeline } = await jiti.import('../utils/markedSetup.ts')
    const md = readFileSync(
      new URL('../fixtures/callout-acceptance.md', import.meta.url),
      'utf8',
    )
    const html = await renderMarkdownPipeline(md)
    const count = html.match(/class="md-callout /g)?.length ?? 0
    assert.ok(count >= 8, `expected >= 8 callouts, got ${count}`)
    assert.match(html, /💡/)
    assert.match(html, /⚠️/)
  })
})
