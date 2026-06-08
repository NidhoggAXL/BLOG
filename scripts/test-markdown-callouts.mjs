import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createJiti } from 'jiti'

const jiti = createJiti(import.meta.url, { alias: { '~': new URL('..', import.meta.url).pathname.replace(/\\/g, '/').replace(/\/$/, '') || '..' } })

const {
  findCalloutBlocks,
  findCalloutBlockAtPosition,
  collectBqCalloutBodyLines,
  stripOneBlockquotePrefix,
  getBqCalloutEnterPrefix,
} = await jiti.import('../utils/markdownCallouts.ts')

const {
  planCalloutNewline,
  planBlockquoteNewline,
  planEditorBqEnter,
} = await jiti.import('../utils/composeCmCalloutEnter.ts')

describe('stripOneBlockquotePrefix', () => {
  it('strips one level only', () => {
    assert.equal(stripOneBlockquotePrefix('>> nested'), '> nested')
    assert.equal(stripOneBlockquotePrefix('> line'), 'line')
  })
})

describe('findCalloutBlocks', () => {
  it('parses standard block with title and body', () => {
    const md = `> [!tip] 你好
> line1
> - item`
    const blocks = findCalloutBlocks(md)
    assert.equal(blocks.length, 1)
    assert.equal(blocks[0].type, 'tip')
    assert.equal(blocks[0].title, '你好')
    assert.equal(blocks[0].bodyMd, 'line1\n- item')
  })

  it('single line is body with default title', () => {
    const md = '> [!tip] only body'
    const b = findCalloutBlocks(md)[0]
    assert.equal(b.title, '提示')
    assert.equal(b.bodyMd, 'only body')
  })

  it('supports fold + and -', () => {
    const open = findCalloutBlocks('> [!tip]+\n> a')[0]
    const closed = findCalloutBlocks('> [!tip]-\n> b')[0]
    assert.equal(open.collapsible, true)
    assert.equal(open.defaultOpen, true)
    assert.equal(closed.collapsible, true)
    assert.equal(closed.defaultOpen, false)
  })

  it('normalizes warn to warning', () => {
    const b = findCalloutBlocks('> [!warn] t\n> x')[0]
    assert.equal(b.type, 'warning')
  })

  it('does not treat nested >> as new callout', () => {
    const md = `> [!tip] t
>> [!note] nested`
    const b = findCalloutBlocks(md)[0]
    assert.equal(b.bodyMd, '> [!note] nested')
  })

  it('includes fence lines without > inside fence', () => {
    const md = `> [!tip] t
> \`\`\`js
const x = 1
\`\`\``
    const b = findCalloutBlocks(md)[0]
    assert.match(b.bodyMd, /const x = 1/)
    assert.match(b.bodyMd, /```/)
  })

  it('parses adjacent blocks separately', () => {
    const md = `> [!tip] a
> one

> [!note] b
> two`
    const blocks = findCalloutBlocks(md)
    assert.equal(blocks.length, 2)
    assert.equal(blocks[0].type, 'tip')
    assert.equal(blocks[1].type, 'note')
  })

  it('unknown type uses capitalized fallback title', () => {
    const b = findCalloutBlocks('> [!custom]')[0]
    assert.equal(b.type, 'custom')
    assert.equal(b.title, 'Custom')
  })

  it('detects callout header even when line contains wikilink mask diff', () => {
    const md = '> [!tip] 链接 [[note]]\n> 正文'
    const blocks = findCalloutBlocks(md)
    assert.equal(blocks.length, 1)
    assert.equal(blocks[0].type, 'tip')
    assert.match(blocks[0].bodyMd, /正文/)
  })

  it('sets kind wiki vs bq', () => {
    assert.equal(findCalloutBlocks('> [!tip] x')[0].kind, 'bq')
    assert.equal(findCalloutBlocks('[[!tip]]')[0].kind, 'wiki')
  })
})

describe('findCalloutBlockAtPosition', () => {
  it('includes cursor at EOF without trailing newline', () => {
    const md = '> [!tip] sldfjsl'
    const b = findCalloutBlockAtPosition(md, md.length)
    assert.ok(b)
    assert.equal(b.type, 'tip')
  })

  it('matches next block at its start and not the gap between blocks', () => {
    const md = '> [!tip] a\n\n> [!note] b'
    const blocks = findCalloutBlocks(md)
    assert.equal(findCalloutBlockAtPosition(md, blocks[1].start)?.type, 'note')
    const gap = blocks[0].end
    assert.ok(gap < blocks[1].start)
    assert.equal(findCalloutBlockAtPosition(md, gap), undefined)
  })

  it('includes cursor before newline inside block', () => {
    const md = '> [!tip] a\n> b'
    assert.ok(findCalloutBlockAtPosition(md, 5))
  })
})

describe('planCalloutNewline', () => {
  it('continues > at EOF on header line', () => {
    const md = '> [!tip] sldfjsl'
    const plan = planCalloutNewline(md, md.length, md, 0, md.length)
    assert.equal(plan.insert, '\n> ')
    assert.equal(plan.selection, md.length + 3)
  })

  it('continues > at end of body line', () => {
    const line = '> body'
    const md = `> [!tip] t\n${line}`
    const from = md.indexOf('body') + 4
    const plan = planCalloutNewline(md, from, line, md.lastIndexOf('>'), md.length)
    assert.equal(plan.insert, '\n> ')
  })

  it('splits mid-line with > prefix', () => {
    const md = '> [!tip] hel|lo'
    const pos = md.indexOf('|')
    const line = md.replace('|', '')
    const plan = planCalloutNewline(md, pos, line, 0, line.length)
    assert.equal(plan.insert, '\n> ')
    assert.equal(plan.from, pos)
  })

  it('exits on empty > line and removes the line', () => {
    const md = '> [!tip]\n> '
    const line = '> '
    const lineFrom = md.lastIndexOf('>')
    const from = md.length
    const plan = planCalloutNewline(md, from, line, lineFrom, from)
    assert.equal(plan.insert, '\n')
    assert.equal(plan.to, from)
    assert.ok(plan.from < lineFrom)
  })

  it('wiki callout uses plain newline', () => {
    const md = '[[!tip]]\nline'
    const line = 'line'
    const from = md.length
    const plan = planCalloutNewline(
      md,
      from,
      line,
      md.indexOf('line'),
      from,
    )
    assert.equal(plan.insert, '\n')
  })

  it('after > fence opener, interior without > still continues with >', () => {
    const md = '> [!tip]\n> ```\ncode'
    const line = 'code'
    const from = md.length
    const plan = planCalloutNewline(
      md,
      from,
      line,
      md.indexOf('code'),
      from,
    )
    assert.equal(plan.insert, '\n> ')
  })

  it('opening > fence line continues with > prefix', () => {
    const md = '> [!tip] 围栏\n> ```js'
    const line = '> ```js'
    const from = md.length
    const plan = planCalloutNewline(md, from, line, md.lastIndexOf('>'), from)
    assert.equal(plan.insert, '\n> ')
  })

  it('blank line inside > fence continues with >', () => {
    const md = '> [!tip]\n> ```\n> '
    const line = '> '
    const from = md.length
    const plan = planCalloutNewline(
      md,
      from,
      line,
      md.lastIndexOf('>'),
      from,
    )
    assert.equal(plan.insert, '\n> ')
  })

  it('after closing fence resumes > prefix', () => {
    const md = '> [!tip]\n> ```\ncode\n```'
    const line = '```'
    const from = md.length
    const plan = planCalloutNewline(
      md,
      from,
      line,
      md.lastIndexOf('`'),
      from,
    )
    assert.equal(plan.insert, '\n> ')
  })

  it('after closing > fence resumes > prefix', () => {
    const md = '> [!tip]\n> ```\n> code\n> ```'
    const line = '> ```'
    const from = md.length
    const plan = planCalloutNewline(
      md,
      from,
      line,
      md.lastIndexOf('>'),
      from,
    )
    assert.equal(plan.insert, '\n> ')
  })
})

describe('getBqCalloutEnterPrefix', () => {
  it('returns > after header line', () => {
    const md = '> [!tip] 你好'
    const block = findCalloutBlocks(md)[0]
    assert.equal(
      getBqCalloutEnterPrefix(block, md, 0, '> [!tip] 你好'),
      '> ',
    )
  })

  it('returns null on empty > line', () => {
    const md = '> [!tip]\n> '
    const block = findCalloutBlocks(md)[0]
    assert.equal(getBqCalloutEnterPrefix(block, md, md.length - 2, '> '), null)
  })
})

describe('planBlockquoteNewline', () => {
  it('continues > on plain blockquote line with content', () => {
    const md = '> sdlfjsl'
    const plan = planBlockquoteNewline(md, md.length, md, 0, md.length)
    assert.equal(plan.insert, '\n> ')
    assert.equal(plan.selection, md.length + 3)
  })

  it('works via planEditorBqEnter without callout header', () => {
    const md = '> sdlfjsl'
    const plan = planEditorBqEnter(md, md.length, md, 0, md.length)
    assert.equal(plan?.insert, '\n> ')
  })

  it('continues > in callout body line', () => {
    const md = '> [!tip] t\n> sdlfjsl'
    const line = '> sdlfjsl'
    const lineFrom = md.indexOf('> sdlfjsl')
    const plan = planEditorBqEnter(
      md,
      md.length,
      line,
      lineFrom,
      md.length,
    )
    assert.equal(plan?.insert, '\n> ')
  })
})

describe('planCalloutNewline outside callout', () => {
  it('returns null outside callout', () => {
    assert.equal(planCalloutNewline('hello', 3, 'hello', 0, 5), null)
  })
})

describe('collectBqCalloutBodyLines', () => {
  it('stops at non-bq line when not in fence', () => {
    const lines = ['> a', 'plain', '> b']
    const masked = lines
    const { bodyLines, endLine } = collectBqCalloutBodyLines(lines, 0)
    assert.deepEqual(bodyLines, ['a'])
    assert.equal(endLine, 1)
  })
})
