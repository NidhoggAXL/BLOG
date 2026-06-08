import type { PoolConnection } from 'mysql2/promise'
import type { PostDetail } from '../../types/post'

export type PostStatus = 'draft' | 'published' | 'archived'

export function normalizeDirectoryId(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return null
  return n
}

export function normalizeStatus(raw: unknown): PostStatus {
  const s = String(raw ?? 'draft').toLowerCase()
  if (s === 'published' || s === 'archived' || s === 'draft') return s
  return 'draft'
}

export async function fetchPostBySlug(
  conn: PoolConnection,
  slug: string,
): Promise<PostDetail | null> {
  const [rows] = await conn.query(
    'SELECT id, directory_id, slug, title, body, status, published_at, created_at, updated_at FROM posts WHERE slug = ? LIMIT 1',
    [slug],
  )
  return (rows as PostDetail[])[0] ?? null
}

export async function fetchPostIdBySlug(conn: PoolConnection, slug: string): Promise<number | null> {
  const row = await fetchPostBySlug(conn, slug)
  return row?.id ?? null
}
