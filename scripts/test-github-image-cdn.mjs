import assert from 'node:assert/strict'
import { createJiti } from 'jiti'

const jiti = createJiti(import.meta.url)
const { githubRawToJsDelivr } = jiti('../utils/githubImageCdn.ts')

assert.equal(
  githubRawToJsDelivr(
    'https://raw.githubusercontent.com/user/repo/main/assets/foo.png',
  ),
  'https://cdn.jsdelivr.net/gh/user/repo@main/assets/foo.png',
)

assert.equal(
  githubRawToJsDelivr(
    'https://raw.githubusercontent.com/user/repo/refs/heads/main/assets/foo.png',
  ),
  'https://cdn.jsdelivr.net/gh/user/repo@main/assets/foo.png',
)

assert.equal(
  githubRawToJsDelivr('https://example.com/img.png'),
  'https://example.com/img.png',
)

assert.equal(githubRawToJsDelivr(''), '')

console.log('test-github-image-cdn: ok')
