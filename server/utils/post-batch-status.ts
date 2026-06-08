import type { Pool, PoolConnection } from 'mysql2/promise'
import type { PostListItem } from '../../types/post'
import {
  fetchPostsByDirectory,
  resolvePostsBySlugs,
} from './post-batch-delete'
import { queuePostEmbeddingsSync } from './ai/embeddings'
import { normalizeStatus, type PostStatus } from './post-mutate'

export type BatchStatusResult = {
  updated_count: number
  updated_slugs: string[]
  status: PostStatus
}

async function fetchPostsStatusRows(
  conn: PoolConnection,
  posts: Pick<PostListItem, 'id' | 'slug'>[],
): Promise<{ id: number; slug: string; status: string; published_at: string | null }[]> {
  if (!posts.length) return []
  const ids = posts.map((p) => p.id)
  const placeholders = ids.map(() => '?').join(',')
  const [rows] = await conn.query(
    `SELECT id, slug, status, published_at FROM posts WHERE id IN (${placeholders})`,
    ids,
  )
  return rows as { id: number; slug: string; status: string; published_at: string | null }[]
}

export async function batchUpdatePostStatus(
  pool: Pool,
  input: { slugs?: string[]; directory_id?: number; status: unknown },
): Promise<BatchStatusResult> {
  const status = normalizeStatus(input.status)
  const conn = await pool.getConnection()

  try {
    let posts: Pick<PostListItem, 'id' | 'slug' | 'title'>[]
    if (input.directory_id != null) {
      posts = await fetchPostsByDirectory(conn, input.directory_id)
    } else {
      posts = await resolvePostsBySlugs(conn, input.slugs ?? [])
    }

    if (!posts.length) {
      return { updated_count: 0, updated_slugs: [], status }
    }

    const rows = await fetchPostsStatusRows(conn, posts)
    const toUpdate = rows.filter((r) => r.status !== status)

    if (!toUpdate.length) {
      return {
        updated_count: 0,
        updated_slugs: [],
        status,
      }
    }

    await conn.beginTransaction()
    const updatedSlugs: string[] = []

    for (const row of toUpdate) {
      let publishedAt: Date | string | null = row.published_at
      if (status === 'published' && !publishedAt) {
        publishedAt = new Date()
      }
      await conn.query('UPDATE posts SET status = ?, published_at = ? WHERE id = ?', [
        status,
        publishedAt,
        row.id,
      ])
      updatedSlugs.push(row.slug)
    }

    await conn.commit()

    for (const row of toUpdate) {
      queuePostEmbeddingsSync(pool, row.id)
    }

    return {
      updated_count: updatedSlugs.length,
      updated_slugs: updatedSlugs,
      status,
    }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}
