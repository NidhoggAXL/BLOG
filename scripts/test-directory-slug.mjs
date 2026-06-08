import assert from 'node:assert/strict'
import { directoryNameAndSlug, directorySlugFromName } from '../utils/directorySlug.ts'

const cases = [
  ['01_(占位)', '01_(占位)'],
  ['01 (占位)', '01 (占位)'],
  ['读书笔记', '读书笔记'],
  ['My Notes', 'My Notes'],
]

for (const [input, expected] of cases) {
  const { name, slug } = directoryNameAndSlug(input)
  assert.equal(name, expected, `name from ${input}`)
  assert.equal(slug, expected, `slug from ${input}`)
  assert.equal(directorySlugFromName(input), expected, `directorySlugFromName ${input}`)
}

console.log('test-directory-slug: ok')
