import assert from 'node:assert/strict'

function normalizeArchivePath(path) {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/')
}

function fileStemFromArchivePath(path) {
  const base = path.split('/').pop() ?? path
  return base.replace(/\.(md|markdown|mdown|mkd)$/i, '').trim()
}

function buildPathSlugFromArchivePath(path, archiveDepth = 0) {
  const normalized = normalizeArchivePath(path)
  const segs = normalized.split('/').filter(Boolean)
  if (!segs.length) return '未命名'
  const depth = Math.max(0, Math.floor(archiveDepth))
  const dirSegs = segs.length > 1 ? segs.slice(depth, -1) : []
  const stem = fileStemFromArchivePath(normalized)
  const parts = [...dirSegs, stem].filter(Boolean)
  return parts.join('/').slice(0, 191) || '未命名'
}

function pathSlugStem(slug) {
  const parts = slug.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? slug.trim()
}

function publicBlogPostPath(slug) {
  const encoded = slug.split('/').filter(Boolean).map(encodeURIComponent).join('/')
  return encoded ? `/blog/${encoded}` : '/blog'
}

function wikilinkHref(basePath, slug) {
  const base = basePath.replace(/\/$/, '')
  if (base === '/blog' || base.endsWith('/blog')) {
    return publicBlogPostPath(slug).replace(/^\/blog/, base)
  }
  return `${base}/${encodeURIComponent(slug)}`
}

assert.equal(buildPathSlugFromArchivePath('aaaa/bbb.md', 0), 'aaaa/bbb')
assert.equal(buildPathSlugFromArchivePath('ccc/bbb.md', 0), 'ccc/bbb')
assert.equal(buildPathSlugFromArchivePath('notes/2024/foo.md', 1), '2024/foo')
assert.equal(pathSlugStem('aaaa/bbb'), 'bbb')

assert.equal(publicBlogPostPath('aaaa/bbb'), '/blog/aaaa/bbb')
assert.equal(publicBlogPostPath('中文/笔记'), '/blog/%E4%B8%AD%E6%96%87/%E7%AC%94%E8%AE%B0')

assert.equal(wikilinkHref('/blog', 'aaaa/bbb'), '/blog/aaaa/bbb')
assert.equal(
  wikilinkHref('/admin/posts', 'aaaa/bbb'),
  '/admin/posts/aaaa%2Fbbb',
)

function buildManualPostPathSlug(directoryPathSlug, rawTitle) {
  const s = rawTitle.trim().slice(0, 191) || '未命名'
  const prefix = directoryPathSlug.trim().replace(/\/+$/, '')
  const slug = (prefix ? `${prefix}/${s}` : s).slice(0, 191)
  return { title: s, slug, stem: s }
}

assert.deepEqual(buildManualPostPathSlug('', 'bbb'), { title: 'bbb', slug: 'bbb', stem: 'bbb' })
assert.deepEqual(buildManualPostPathSlug('aaaa', 'bbb'), { title: 'bbb', slug: 'aaaa/bbb', stem: 'bbb' })
assert.deepEqual(buildManualPostPathSlug('ccc', 'bbb'), { title: 'bbb', slug: 'ccc/bbb', stem: 'bbb' })
assert.notEqual(
  buildManualPostPathSlug('aaaa', 'bbb').slug,
  buildManualPostPathSlug('ccc', 'bbb').slug,
)

console.log('test-path-slug: ok')
