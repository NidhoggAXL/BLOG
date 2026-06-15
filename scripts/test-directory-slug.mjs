import assert from 'node:assert/strict'
import {
  directoryImportNameAndSlug,
  directorySlugFromName,
  manualDirectoryNameAndSlug,
  manualDirectoryNameValidationError,
} from '../utils/directorySlug.ts'
import { hasObsidianOrderPrefix } from '../utils/obsidianDisplayPrefix.ts'

const manualCases = [
  ['读书笔记', '读书笔记'],
  ['My Notes', 'My Notes'],
]

for (const [input, expected] of manualCases) {
  const { name, slug } = manualDirectoryNameAndSlug(input)
  assert.equal(name, expected, `manual name from ${input}`)
  assert.equal(slug, expected, `manual slug from ${input}`)
  assert.equal(directorySlugFromName(input), expected, `directorySlugFromName ${input}`)
  assert.equal(manualDirectoryNameValidationError(input), null, `no prefix error ${input}`)
}

const importCases = [
  ['01_(占位)', '(占位)', '01_(占位)'],
  ['01 入门', '入门', '01 入门'],
  ['01_简介', '简介', '01_简介'],
]

for (const [input, expectedName, expectedSlug] of importCases) {
  const { name, slug } = directoryImportNameAndSlug(input)
  assert.equal(name, expectedName, `import name from ${input}`)
  assert.equal(slug, expectedSlug, `import slug from ${input}`)
}

assert.equal(hasObsidianOrderPrefix('01_读书笔记'), true)
assert.equal(hasObsidianOrderPrefix('读书笔记'), false)
assert.equal(
  manualDirectoryNameValidationError('01_读书笔记'),
  manualDirectoryNameValidationError('01 笔记'),
)

console.log('test-directory-slug: ok')
