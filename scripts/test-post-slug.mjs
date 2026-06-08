import assert from 'node:assert/strict'
import { fileStemFromName } from '../composables/inferPostImportFromMarkdown.ts'
import { postTitleAndSlug } from '../utils/postSlug.ts'

assert.deepEqual(postTitleAndSlug('我的笔记'), { title: '我的笔记', slug: '我的笔记' })
assert.deepEqual(postTitleAndSlug('My Note'), { title: 'My Note', slug: 'My Note' })

const stem = fileStemFromName('01-介绍.md')
const fromFile = postTitleAndSlug(stem)
assert.equal(fromFile.title, '01-介绍')
assert.equal(fromFile.slug, '01-介绍')

console.log('test-post-slug: ok')
