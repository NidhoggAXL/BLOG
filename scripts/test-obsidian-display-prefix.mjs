import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { fileStemFromName } from '../composables/inferPostImportFromMarkdown.ts'
import { postTitleAndSlug } from '../utils/postSlug.ts'
import {
  formatPublicDisplayName,
  obsidianOrderFromSegment,
  stripObsidianOrderPrefix,
} from '../utils/obsidianDisplayPrefix.ts'

describe('stripObsidianOrderPrefix', () => {
  it('strips common Obsidian order prefixes', () => {
    assert.equal(stripObsidianOrderPrefix('01_简介'), '简介')
    assert.equal(stripObsidianOrderPrefix('01 入门'), '入门')
    assert.equal(stripObsidianOrderPrefix('01-部署'), '部署')
    assert.equal(stripObsidianOrderPrefix('01.笔记'), '笔记')
    assert.equal(stripObsidianOrderPrefix('01_(占位)'), '(占位)')
  })

  it('keeps names without order prefix', () => {
    assert.equal(stripObsidianOrderPrefix('Nuxt 部署'), 'Nuxt 部署')
    assert.equal(stripObsidianOrderPrefix('读书笔记'), '读书笔记')
  })

  it('falls back when only prefix remains', () => {
    assert.equal(stripObsidianOrderPrefix('01'), '01')
    assert.equal(stripObsidianOrderPrefix('02_'), '02_')
  })
})

describe('formatPublicDisplayName', () => {
  it('uses fallback for empty input', () => {
    assert.equal(formatPublicDisplayName(''), '未命名')
    assert.equal(formatPublicDisplayName('   '), '未命名')
  })

  it('formats prefixed names', () => {
    assert.equal(formatPublicDisplayName('01_简介'), '简介')
  })
})

describe('obsidianOrderFromSegment', () => {
  it('parses leading digits', () => {
    assert.equal(obsidianOrderFromSegment('01_入门'), 1)
    assert.equal(obsidianOrderFromSegment('02_进阶'), 2)
    assert.equal(obsidianOrderFromSegment('12 章节'), 12)
  })

  it('returns null when no leading digits', () => {
    assert.equal(obsidianOrderFromSegment('入门'), null)
    assert.equal(obsidianOrderFromSegment(''), null)
  })
})

describe('import title/slug split', () => {
  it('keeps slug with prefix and strips title', () => {
    const stem = fileStemFromName('01_简介.md')
    const { slug } = postTitleAndSlug(stem)
    const title = formatPublicDisplayName(stem, stem || '未命名')
    assert.equal(slug, '01_简介')
    assert.equal(title, '简介')
  })
})
