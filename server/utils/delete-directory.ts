import { createError } from 'h3'
import type { Pool, PoolConnection } from 'mysql2/promise'
import type { ResultSetHeader } from 'mysql2'
import { getDescendantIdsIncludingSelf } from './directory-ancestors'
import { markInboundWikilinksMissing } from './wikilinks'

export type DeleteDirectoryResult = {
  ok: true
  id: number
  /** 含自身在内的目录节点数（子目录由外键级联删除） */
  directories_removed: number
  posts_deleted: number
  deleted_post_slugs: string[]
}

async function fetchPostsInDirectories(
  conn: PoolConnection,
  directoryIds: number[],
): Promise<{ id: number; slug: string }[]> {
  if (!directoryIds.length) return []
  const placeholders = directoryIds.map(() => '?').join(',')
  const [rows] = await conn.query(
    `SELECT id, slug FROM posts WHERE directory_id IN (${placeholders}) ORDER BY id ASC`,
    directoryIds,
  )
  return rows as { id: number; slug: string }[]
}

export async function deleteDirectoryWithPosts(
  pool: Pool,
  directoryId: number,
): Promise<DeleteDirectoryResult> {
  const [dirRows] = await pool.query('SELECT id FROM directories WHERE id = ? LIMIT 1', [
    directoryId,
  ])
  if (!(dirRows as { id: number }[])[0]) {
    throw createError({ statusCode: 404, message: '目录不存在' })
  }

  const directoryIds = [...(await getDescendantIdsIncludingSelf(pool, directoryId))]
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    const posts = await fetchPostsInDirectories(conn, directoryIds)
    const deletedSlugs: string[] = []

    for (const post of posts) {
      await markInboundWikilinksMissing(conn, post.id)
      await conn.query('DELETE FROM posts WHERE id = ?', [post.id])
      deletedSlugs.push(post.slug)
    }

    const [delRes] = await conn.query<ResultSetHeader>(
      'DELETE FROM directories WHERE id = ?',
      [directoryId],
    )
    if (delRes.affectedRows === 0) {
      throw createError({ statusCode: 404, message: '目录不存在' })
    }

    await conn.commit()

    return {
      ok: true,
      id: directoryId,
      directories_removed: directoryIds.length,
      posts_deleted: deletedSlugs.length,
      deleted_post_slugs: deletedSlugs,
    }
  } catch (e: unknown) {
    await conn.rollback()
    const err = e as { statusCode?: number }
    if (err.statusCode) throw e
    const sqlErr = e as { sqlMessage?: string }
    throw createError({
      statusCode: 500,
      message: sqlErr.sqlMessage || '删除目录失败',
    })
  } finally {
    conn.release()
  }
}
